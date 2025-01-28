const express = require('express');
const postRoute = express.Router();
const postController  = require('../../Controller/postController');
const {authenticateUser: authenticate, verifyUserStatus}  = require('../../Middleware/userAuth');
const upload = require('../../Config/multer');


postRoute.post('/add-post',authenticate,upload.single('post'), postController.addPost);
postRoute.get('/get-post', authenticate, verifyUserStatus, postController.getAllPost);
postRoute.post('/toggle-like', authenticate, verifyUserStatus, postController.toggleLike);
postRoute.get('/get-users-post',authenticate, postController.getUsersPost);
postRoute.post('/toggle-save', authenticate, postController.toggleSave);
postRoute.route('/archive')
.get( authenticate, postController.getArchivePost)
.post(authenticate, postController.archivePost);


module.exports = postRoute;