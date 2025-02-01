const express = require('express');
const userRoute = express.Router();
const userController = require('../../Controller/userController');
const moderationController = require('../../Controller/moderationController');
const {authenticateUser: authenticate}  = require ('../../DeletingFolder/Middleware/userAuth');
const upload = require('../../Config/multer');


userRoute.post('/send-otp', userController.sendotp);
userRoute.post('/otp-verification', userController.otpVerification);
userRoute.post('/register', userController.register);
userRoute.post('/login', userController.login);
userRoute.post('/logout', userController.logout);
userRoute.post('/reset-password/email', userController.resetPasswordEmail);
userRoute.post('/reset-password', userController.resetPassword);
userRoute.post('/refresh-token', userController.refreshAccessToken);
userRoute.get('/suggeted-users',authenticate,  userController.suggesstingUser);
userRoute.get('/user-details',authenticate, userController.userDetails)
userRoute.post('/update-profile', authenticate,upload.single('profileImage'), userController.updateProfile )
userRoute.post('/toggle-follow', authenticate, userController.toggleFollow);
userRoute.get('/about-profile', authenticate, userController.aboutProfile);
userRoute.get('/user-status', authenticate, moderationController.userStatus);
userRoute.post('/toggle-restriction', authenticate, moderationController.toggleRestrict)
userRoute.post('/report-user', authenticate, moderationController.reportUser);
userRoute.post('/report-post', authenticate, moderationController.reportPost);
userRoute.post('/toggle-block', authenticate, moderationController.toggleBlock);
userRoute.get('/get-profile-url', authenticate, moderationController.getProfileLink);
module.exports = userRoute;