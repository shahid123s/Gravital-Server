const express = require('express');
const { toggleFollow, getFollowingList } = require('./followController');
const router = express.Router();


router.post('/toggle-follow', toggleFollow);
router.get('/followings', getFollowingList);

module.exports = router