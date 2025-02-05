const express = require('express');
const router = express.Router();
const { dynamicUpload } = require('../../utils/multerUtils');
const { 
    addPost, 
    getAllPosts, 
    getUsersPost,
    deletePost
} = require('./postController');


router.post('/create', dynamicUpload('post'), addPost);
router.get('/get-post', getAllPosts);
router.get('/user', getUsersPost);
route.post('/delete', deletePost);

module.exports = router