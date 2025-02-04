const express = require('express');
const router = express.Router();
const {
    reportUser,
    reportPost,
} = require('./reportController')


router.post('/user', reportUser);
router.post('/post', reportPost)



module.exports = router;