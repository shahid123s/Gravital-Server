const express = require('express');
const router = express.Router();
const { dynamicUpload } = require('../../utils/multerUtils');
const {
    suggestUsers,
    userDetails,
    updateProfile,
    aboutProfile,
    userStatus,
    searchUsers,
    changePassword
} = require('./userController');


router.get('/suggest-users', suggestUsers);
router.get('/details', userDetails)
router.patch('/update-profile', dynamicUpload('profileImage'),updateProfile)
router.get('/about-profile', aboutProfile)
router.get('/status', userStatus );
router.get('/search',searchUsers );
router.patch('/change-password', changePassword)
module.exports = router;