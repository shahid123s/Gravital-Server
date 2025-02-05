const express = require('express');
const { toggleLike } = require('./likeController');
const router = express.Router();


router.patch('/post/toggle-like',  toggleLike);


module.exports = router;