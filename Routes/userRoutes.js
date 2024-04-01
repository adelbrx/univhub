const express = require("express");
const userController = require("../Controllers/userController");
const authController = require("../Controllers/authController");
const user = require("../Models/userModel");

const router = express.Router();

router.route("/").get(userController.getAllUsers);
router.route("/signup").post(authController.signup);
router.route("/activateAccount/:token").patch(authController.accountActivation);
router.route("/login").post(authController.login);
router.route("/forgotPassword").post(authController.forgotPassword);
router.route("/resetPassword/:token").patch(authController.resetPassword);

router.use(authController.protect);

router.route("/logout").get(authController.logout);
router.route("/updatePassword").patch(authController.updatePassword);

router
  .route("/me")
  .get(userController.getMe, userController.getUser)
  .patch(userController.getMe, userController.updateUser)
  .delete(userController.deleteMe);

router
  .route("/profilePicture")
  .patch(
    userController.uploadUserPhoto,
    userController.resizeUserPhoto,
    userController.getMe,
    userController.updateUser
  );

router.use(authController.restrictTo(["admin"]));

router
  .route("/:email")
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
