const app = require("../app");
const User = require("../Models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");
const jwt = require("jsonwebtoken");
const Email = require("../utils/email");
const { promisify } = require("util");
const crypto = require("crypto");
const { request } = require("http");

////////////// Generate JWT based on email ////////////////
const signToken = (email) => {
  return jwt.sign({ email: email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

////////////// Creating & Sending JWT via a response and Cookies ////////////////
const createSendToken = (user, statusCode, response) => {
  // 1) generate a token
  const token = signToken(user.email);

  // 2) store token into cookies
  response.cookie("jwt", token, {
    expiresIn: new Date(
      Date.now() +
        Number(process.env.JWT_COOKIE_EXPIRES_IN) * 24 * 60 * 60 * 1000
    ),
    secure: true, //the cookie will be send with an encrypted connection (HTTPS)
    httpOnly: true, //use only http secure protocol
  });

  // 3) return a response
  response.status(statusCode).json({
    status: "success",
    token: token,
    data: {
      user: user,
    },
  });
};

////////////// Sign up ////////////////
exports.signup = catchAsync(async (request, response) => {
  // 1) Create new user
  const newUser = await User.create(request.body);

  // 2) generate account activation token
  const activationToken = newUser.createAccountActivateToken();
  await newUser.save({ validateBeforeSave: false });

  // 3) Send Email of Activation
  const url = `${request.protocol}://${request.get("host")}:${
    process.env.PORT
  }/${activationToken}`;
  await new Email(newUser, url).sendWelcome();

  // 4) return a response
  response.status(200).json({
    status: "success",
    message: "Please activate your account.",
    data: {
      nom: newUser.nom,
      prenom: newUser.prenom,
      email: newUser.email,
      photo: newUser.photo,
      role: newUser.role,
      active: newUser.active,
    },
  });
});

exports.accountActivation = catchAsync(async (request, response, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(request.params.token)
    .digest("hex");

  const user = await User.findOne({
    accountActivationToken: hashedToken,
    accountActivationTokenExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }

  user.active = true;
  user.accountActivationToken = undefined;
  user.accountActivationTokenExpires = undefined;

  await user.save({ validateBeforeSave: false });

  // 4) Log the user in, send JWT
  createSendToken(user, 200, response);
});

////////////// Log in ////////////////
exports.login = catchAsync(async (request, response, next) => {
  const { email, password } = request.body;

  // 1)  Check if email and password exists
  if (!email || !password) {
    return next(new AppError(`Please provide email and password`, 404));
  }
  // 2)  Check if user exists && password is correct
  const user = await User.findOne({ email: email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  // 3)  If everythong is okey, send token to client
  createSendToken(user, 200, response);
});

////////////// Log out ////////////////
exports.logout = (reqest, response) => {
  response.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  response.status(200).json({ status: "success" });
};

////////////// Forgot password ////////////////
exports.forgotPassword = catchAsync(async (request, response, next) => {
  //Generate user based on POSTed email
  const user = await User.findOne({ email: request.body.email });

  if (!user) {
    return next(new AppError("There is no user with this email address", 404));
  }

  //Generate the random reset token
  const resetToken = user.createPasswordResetToken();

  await user.save({ validateBeforeSave: false });

  //Send it to User's email
  try {
    const resetURL = `${request.protocol}://${request.get(
      "host"
    )}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();

    response.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        "There was an error sending the email, Try again later!",
        500
      )
    );
  }
});

////////////// Reset password ////////////////
exports.resetPassword = catchAsync(async (request, response, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(request.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }

  user.password = request.body.password;
  user.passwordConfirm = request.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save({ validateBeforeSave: false });

  // 4) Log the user in, send JWT
  createSendToken(user, 200, response);
});

////////////// Update password ////////////////
exports.updatePassword = catchAsync(async (request, response, next) => {
  // 1) Get user from collection
  const currentUser = await User.findOne({ email: request.body.email }).select(
    "+password"
  );
  if (!currentUser) {
    return next(
      new AppError("This email is not valid, PLease try a valid one", 404)
    );
  }

  // 2) Check if POSTed current password is correct
  if (
    !(await currentUser.correctPassword(
      request.body.currentPassword,
      currentUser.password
    ))
  ) {
    return next(new AppError("Password wrong, Please try again!", 401));
  }

  // 3) If so, update password
  currentUser.password = request.body.password;
  currentUser.passwordConfirm = request.body.password;
  await currentUser.save({ validateBeforeSave: false });

  // 4) Log user in, send JWT
  createSendToken(currentUser, 200, response);
});

////////////// Authentification middleware ////////////////
exports.protect = catchAsync(async (request, response, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    request.headers.authorization &&
    request.headers.authorization.startsWith("Bearer")
  ) {
    token = request.headers.authorization.split(" ")[1];
  } else if (request.cookies && request.cookies.jwt) {
    token = request.cookies.jwt;
  }

  if (!token || token === "loggedout") {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  if (!decoded) {
    return next(new AppError("The token is not Valid.", 401));
  }
  // 3) Check if user still exists
  const currentUser = await User.findOne({ email: decoded.email });
  if (!currentUser) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401
      )
    );
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again.", 401)
    );
  }

  //GRANT ACCESS TO PROTECTED ROUTE
  request.user = currentUser;
  response.locals.user = currentUser;
  next();
});

////////////// Cheking roles ////////////////
exports.restrictTo = (...roles) => {
  return (request, response, next) => {
    if (!roles.includes(request.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action.", 403)
      );
    }
    next();
  };
};
