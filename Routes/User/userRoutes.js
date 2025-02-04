const express = require('express');
const userRoute = express.Router();
const userController = require('../../Controller/userController');
const moderationController = require('../../Controller/moderationController');
const {authenticateUser: authenticate}  = require ('../../DeletingFolder/Middleware/userAuth');
const upload = require('../../Config/multer');



userRoute.post('/refresh-token', userController.refreshAccessToken);

userRoute.get('/get-profile-url', authenticate, moderationController.getProfileLink);
module.exports = userRoute;