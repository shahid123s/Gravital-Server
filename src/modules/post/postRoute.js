const express = require('express');
const router = express.Router();
const { dynamicUpload } = require('../../utils/multerUtils');
const { 
    addPost, 
    getAllPosts, 
    getUsersPost,
    deletePost,
    getTrendingPosts,
    sharePost,
    getPost,
    getLikedPost
} = require('./postController');

router.get('/',getPost)
router.post('/create', dynamicUpload('post'), addPost);
router.get('/get-post', getAllPosts);
router.get('/user', getUsersPost);
router.post('/delete', deletePost);
router.get('/get-trending', getTrendingPosts)
router.patch('/share', sharePost)
router.get('/liked-posts', getLikedPost)

module.exports = router;