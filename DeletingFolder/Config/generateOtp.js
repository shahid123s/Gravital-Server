const crypto = require('crypto')


const genrateOtp = () => {
    const otp = crypto.randomInt(100000, 999999);
    return otp 

}


module.exports = genrateOtp;