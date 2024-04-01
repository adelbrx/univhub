const User = require("../Models/userModel");
const factory = require("./handlerFactory");
const AppError = require("../utils//appError");
const catchAsync = require("../utils//catchAsync");
const multer = require("multer");
const sharp = require("sharp");

/////////////// Store pictures in memory and not in disk ////////////////
const multerStorage = multer.memoryStorage();

/////////////// Store only picture and not other files ////////////////
const multerFilter = (request, file, callbackFunction) => {
  if (file.mimetype.startsWith("image")) {
    callbackFunction(null, true);
  } else {
    callbackFunction(
      new AppError("Not an image! Please upload only images.", 400),
      false
    );
  }
};

///////////////// Config multer where and what to upload ////////////////
const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

///////////////// Upload this single field (picture) ////////////////
exports.uploadUserPhoto = upload.single("photo");

///////////////// Resizing profile picture ////////////////
exports.resizeUserPhoto = catchAsync(async (request, response, next) => {
  if (!request.file) next();

  request.file.filename = `user-${request.user.id}-${Date.now()}.jpg`;
  await sharp(request.file.buffer)
    .resize(500, 500)
    .toFormat("jpg")
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${request.file.filename}`);

  next();
});

/////////////// Filtering fields ////////////////
const filterObj = (object, ...allowedFields) => {
  const newObj = {};
  Object.keys(object).forEach((key) => {
    if (allowedFields.includes(key)) newObj[key] = object[key];
  });
  return newObj;
};

///////////////// READ ////////////////
exports.getUser = factory.getOne(User, null);

exports.getAllUsers = factory.getAll(User);

///////////////// UPDATE ////////////////
exports.updateUser = factory.updateOne(User);

///////////////// DELETE ////////////////
exports.deleteUser = factory.deleteOne(User);

///////////////// Getting email from current user ////////////////
exports.getMe = (request, response, next) => {
  request.params.email = request.user.email;
  if (request.file) request.body.photo = request.file.filename;
  next();
};

///////////////// Update profil picture in DB ////////////////
exports.deleteMe = catchAsync(async (request, response, next) => {
  await User.findOneAndUpdate({ email: request.user.email }, { active: false });

  response.status(200).json({
    status: "success",
    data: "Account deleted successfully!",
  });
});
