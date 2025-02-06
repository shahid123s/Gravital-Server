const express = require('express');
const router = express.Router()
const {
    sentOTP,
    otpVerification,
    register,
    userLogin,
    userLogout,
    sentOTPOnForgetPassword,
    adminLogin,
    adminLogout,
    refreshAccessToken,
} = require('./authController')


router.post('/send-otp', sentOTP);
router.post('/otp-verification', otpVerification);
router.post('/register', register);
router.post('/user/login', userLogin);
router.post('/user/logout',userLogout);
router.post('/user/refresh-token' , refreshAccessToken )
router.post('/user/sent-otp/forget-password',sentOTPOnForgetPassword );
router.post('/user/reset-password', );
router.post('/admin/login', adminLogin);
router.post('/admin/logout', adminLogout);

module.exports = router;



'/api/auth/'