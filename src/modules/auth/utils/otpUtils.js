const crypto = require('crypto');
/**
 * Generate a OTP using crypto
 * @returns {string} - The generated OTP
 */
const generateOTP = () => {
    return crypto.randomInt(100000, 999999)
}

// Exporting the function to use other module
module.exports  ={ 
    generateOTP,
}