const express = require('express');
const router = express.Router();
const { dynamicUpload } = require('../../utils/multerUtils');
const {
    suggestUsers,
    userDetails,
    updateProfile,
    aboutProfile,
    userStatus
} = require('./userController');


router.get('/suggest-users', suggestUsers);
router.get('/details', userDetails)
router.patch('/update-profile', dynamicUpload('profileImage'),updateProfile)
router.get('/about-profile', aboutProfile)
router.get('/status', userStatus )
module.exports = router;