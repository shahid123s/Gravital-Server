const express = require('express');
const router = express.Router()
const {
    sentOTP,
    otpVerification,
    register,
    userLogin,
} = require('./authController')


router.post('/send-otp', sentOTP)
router.post('/otp-verification', otpVerification);
router.post('/register', register);
router.post('/user/login', userLogin);

module.exports = router;