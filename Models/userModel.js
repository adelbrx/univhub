const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
  nom: {
    type: String,
    minlength: 3,
    required: [true, "Please tell us your Family name"],
  },

  prenom: {
    type: String,
    minlength: 3,
    required: [true, "Please tell us your name"],
  },

  email: {
    type: String,
    required: [true, "Please tell us your email"],
    unique: true,
    lowercase: true,
    validate: {
      validator: function (value) {
        const emailSides = value.split("@");
        return validator.isEmail(value) && emailSides[1] === "univ-tlemcen.dz";
      },
      message: "Please provide a valid email",
    },
  },

  photo: {
    type: String,
    default: "default_profile_picture.jpg",
  },

  role: {
    type: String,
    enum: ["user", "admin", "responsable", "clubPresedent"],
    default: "user",
  },

  password: {
    type: String,
    required: [true, "Please enter your password"],
    minlength: 8,
    select: false,
  },

  passwordConfirm: {
    type: String,
    required: [true, "Please confirm your password"],
    minlength: 8,
    select: false,
    validate: {
      validator: function (value) {
        return value === this.password;
      },
      message: "Passwords are not the same",
    },
  },

  active: {
    type: Boolean,
    default: false,
    select: false,
  },

  accountActivationToken: {
    type: String,
    select: true,
  },

  accountActivationTokenExpires: {
    type: Date,
    select: true,
  },

  passwordChangedAt: Date,

  passwordResetToken: String,

  passwordResetExpires: Date,
});

////////////// Hash password before saving ////////////////
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;

  next();
});

////////////// Store date of updating password ////////////////
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

////////////// Is correct password ////////////////
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

////////////// Checking if the password has changed ////////////////
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return changedTimestamp > JWTTimestamp;
  }
  return false;
};

////////////// Generate resetting token ////////////////
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  //expres after 10 minutes
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

////////////// Generate resetting token ////////////////
userSchema.methods.createAccountActivateToken = function () {
  const activationToken = crypto.randomBytes(32).toString("hex");

  this.accountActivationToken = crypto
    .createHash("sha256")
    .update(activationToken)
    .digest("hex");

  //expres after 1 day
  this.accountActivationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;

  return activationToken;
};

const user = new mongoose.model("User", userSchema);

module.exports = user;
