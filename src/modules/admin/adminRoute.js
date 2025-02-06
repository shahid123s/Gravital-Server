const express = require('express');
const { getUserList, toggleBan, getUserDetails, toggleBlock } = require('./contorller/adminUserController');
const { getPostsList, getPostDetails, togglePostRestriction, boostPost } = require('./contorller/adminPostController');
const { getAllReport, getReportDetails, updateReportStatus } = require('./contorller/adminReportController');
const router = express.Router();


router.post('/refresh-token', )

router.get('/users', getUserList);
router.patch('/user/toggle-ban', toggleBan);
router.get('/user/user-details', getUserDetails);
router.patch('/user/toggle-block', toggleBlock);

router.get('/posts', getPostsList);
router.get('/post', getPostDetails)
router.patch('/post/toggleRestriction', togglePostRestriction);
router.patch('/post/boost-post', boostPost);

router.get('/reports', getAllReport)
router.route('/report')
.get(getReportDetails)
.patch(updateReportStatus);

module.exports = router