const ResponseMessage = {
    SUCCESS: {
        OK: 'Request processed successfully',
        UPDATED: 'Resource updated successfully',
        CREATED: 'Resource created successfully',

        AUTHENTICATION: {
            OTP_SEND: 'OTP Send Successfully',
            OTP_VERIFIED: 'OTP Verified Successfully',
            REGISTRATION: 'User Registred Successfully',
            LOGIN: 'Login Successfully',
            CHANGE_PASSWORD: 'Password Changed Successfully',
            LOGOUT: 'User Logout Successfully',
        },

    },
    ERROR: {
        AUTHENTICATION: {
            EXISTS_EMAIL: 'Email is already Exists',
            EXISTS_USERNAME: 'Username is already Exists',
            INSUFFICENT_CREDENTIALS: 'Insufficent Crendentials. Please Check',
            INVALID_CREDENTIALS: 'Invalid Crendetials. Please Check Througly',
            OTP_EXPIRED: 'OTP Expired. Please try again',
            OTP_MISMATCH: 'Invalid OTP',
        },

        AUTHORIZATION: {
            USER_BLOCK: 'User profile is Blocked',
            USER_BAN: 'User profile is Banned for certain period',
            INVALID_TOKEN: 'Invalid Token or Expired Token',
            INVALID_ACCESS_TOKEN: 'AccessToken Required',

        },

        BAD_REQUEST: 'Invalid request. Please check the inputs.',
        UNAUTHORIZED: 'You are not authorized to perform this action.',
        FORBIDDEN: 'Access to this resource is forbidden.',
        NOT_FOUND: 'Resource Not Found ',
        INTERNET_SERVER_ERROR: 'An unexpected error occured. Please try again later',

    }
}


module.exports = {
    ResponseMessage,
}

