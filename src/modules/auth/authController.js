const { HTTP_STATUS_CODE } = require('../../../constants/httpStatus')
const { ResponseMessage } = require('../../../constants/responseMessage');
const { decodeRefreshToken } = require('../../utils/jwtUtils');
const { storeRefreshToken, getRefreshToken } = require('../../utils/redisUtils');
const {v4 : uuid} = require('uuid')
const {
    existsUserByUsername,
    existsUserByEmail,
    createUser,
    getUserDetailsByEmailWithPassword,
    updateUserPassword,
    getUserById,
} = require('../user/userService');
const {
    hashPassword,
    comparePassword,
    validateInput,
    sendEmailVerification,
    generateOTP,
    storeData,
    getData,
    storeOtp,
    getOtp,
    generateAccessToken,
    generateRefreshToken
} = require('./authService');



/**
 * Handles the sending of an OTP to the user's email.
 * This function checks if the user already exists, validates input, 
 * hashes the password, stores user data in Redis, generates an OTP, 
 * and sends it to the user's email.
 *
 * @param {Object} req - The request object containing the user's input data.
 * @param {Object} req.body - The request body containing the user's details (username, email, password).
 * @param {string} req.body.username - The username of the user.
 * @param {string} req.body.email - The email of the user.
 * @param {string} req.body.password - The password of the user.
 * @param {Object} res - The response object used to send back the HTTP response.
 * @param {Function} next - The next middleware function to call in case of error.
 *
 * @returns {Object} - A JSON response with a success or error message.
 * 
 * @throws {CustomError} - Throws an error if there's an issue during the process (e.g., user already exists, validation failure).
 */
const sentOTP = async (req, res, next) => {
    const { username, email, password } = req.body;

    if (!email) {
        return res
            .status(HTTP_STATUS_CODE.BAD_REQUEST)
            .json({
                success: false,
                message: ResponseMessage.ERROR.BAD_REQUEST,
            })
    }

    const validateErrors = validateInput({ email, username, password });

    if (Object.keys(validateErrors).length) {
        return res
            .status(HTTP_STATUS_CODE.BAD_REQUEST)
            .json({
                success: false,
                message: ResponseMessage.ERROR.BAD_REQUEST,
                errors: validateErrors
            });
    }

    try {
        if (username && email && password) {
            let isExists = await existsUserByUsername(username);
            if (isExists) {
                return res
                    .status(HTTP_STATUS_CODE.CONFLICT)
                    .json({
                        success: false,
                        message: ResponseMessage.ERROR.AUTHENTICATION.EXISTS_USERNAME,
                    })
            }

            isExists = await existsUserByEmail(email);
            if (isExists) {
                return res
                    .status(HTTP_STATUS_CODE.CONFLICT)
                    .json({
                        success: false,
                        message: ResponseMessage.ERROR.AUTHENTICATION.EXISTS_USERNAME,
                    })
            }
            const hashedPassword = await hashPassword(password);

            const user = {
                username,
                email,
                password: hashedPassword,
            };
            await storeData(email, user, 1000);
        }

        const OTP = generateOTP();
        await storeOtp(email, OTP);
        sendEmailVerification(email, OTP);

        res
            .status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.AUTHENTICATION.OTP_SEND
            });

    } catch (error) {
        next(error)
    }

}

/**
 * Verifies the OTP sent to the user's email
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function to pass control to the next middleware
 * @returns {void}
 */
const otpVerification = async (req, res, next) => {
    try {
        const { otp, email } = req.body;
        if (!otp || !email) {
            return res
                .status(HTTP_STATUS_CODE.BAD_REQUEST)
                .json({
                    success: false,
                    message: ResponseMessage.ERROR.AUTHENTICATION.INSUFFICENT_CREDENTIALS,
                });
        }
        const currentOTP = await getOtp(email);
        if (!currentOTP) {
            return res
                .status(HTTP_STATUS_CODE.NOT_FOUND)
                .json({
                    success: false,
                    message: ResponseMessage.ERROR.AUTHENTICATION.OTP_EXPIRED,
                });
        }

        if (+otp !== Number(currentOTP)) {
            return res
                .status(HTTP_STATUS_CODE.NOT_ACCEPTED)
                .json({
                    success: false,
                    message: ResponseMessage.ERROR.AUTHENTICATION.OTP_MISMATCH,
                });
        }

        res
            .status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.AUTHENTICATION.OTP_VERIFIED,
            })
    } catch (error) {
        console.log(error.message);
        next(error)
    }
}

/**
 * Registers a new user
 * @param {object} req - Express request object containing the user registration data (fullName, phoneNumber, email, dob)
 * @param {object} res - Express response object
 * @param {function} next - Express next function to pass control to the next middleware or error handler
 * @returns {void}
 */
const register = async (req, res, next) => {
    const { fullName, phoneNumber, email, dob } = req.body;

    // Validate Inputs
    const validateErrors = validateInput({ fullName, phoneNumber, email });
    if (Object.keys(validateErrors).length) {
        return res
            .status(HTTP_STATUS_CODE.BAD_REQUEST)
            .json({
                success: false,
                message: ResponseMessage.ERROR.BAD_REQUEST,
                errors: validateErrors,
            });
    };

    try {
        // Taskes user data form the redis stored on OTP sending .
        const userData = await getData(email);
        if(userData === null) {
            return res
                .status(HTTP_STATUS_CODE.NOT_FOUND)
                .json({
                    success: false,
                    message: ResponseMessage.ERROR.AUTHENTICATION.OTP_EXPIRED,
                });
        }

        // Combine existing data and the personal informations 
        const userDetails = { ...userData, fullName, phoneNumber, dob, userID:uuid() };

        // create the user in the database
        await createUser(userDetails);

        res
            .status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.OK,
            });

    } catch (error) {
        console.log(error)
        next(error)
    }

}

/**
 * Handles user login authentication.
 * 
 * @param {object} req - Express request object containing `email` and `password` in the body.
 * @param {object} res - Express response object.
 * @param {function} next - Express next function for error handling.
 * @returns {void}
 */
const userLogin = async (req, res, next) => {
    const { email, password } = req.body;
    try {

        console.log('ivda varunna')
        const user = await getUserDetailsByEmailWithPassword(email);
        if (!user) {
            return res
                .status(HTTP_STATUS_CODE.NOT_FOUND)
                .json({
                    success: false,
                    message: ResponseMessage.ERROR.AUTHENTICATION.INVALID_CREDENTIALS,
                })
        }
        const isMatchPassword = await comparePassword(password, user.password);

        if (!isMatchPassword || user.role !== 'user') {
            return res
                .status(HTTP_STATUS_CODE.NOT_FOUND)
                .json({
                    success: false,
                    message: ResponseMessage.ERROR.AUTHENTICATION.INVALID_CREDENTIALS,
                })
        }
        if (user.isBlock) {
            return res
                .status(HTTP_STATUS_CODE.FORBIDDEN)
                .json({
                    success: false,
                    message: ResponseMessage.ERROR.AUTHORIZATION.USER_BLOCK
                })
        }

        const accessToken = await generateAccessToken(user._id, user.role);
        const refreshToken = await generateRefreshToken(user._id, user.role);
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'Lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        })

        await storeRefreshToken(email, refreshToken)

        res
            .status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.OK,
                accessToken,
                username: user.username
            })


    } catch (error) {
        next(error)
    }
}

/**
 * Logs the user out by clearing the refresh token cookie.
 * This function removes the `refreshToken` cookie and sends a response indicating successful logout.
 * 
 * @async
 * @function userLogout
 * @param {Object} req - The request object, containing information about the HTTP request.
 * @param {Object} res - The response object, used to send the response to the client.
 * @param {Function} next - The next middleware function in the request-response cycle.
 * 
 * @returns {void} - The function doesn't return anything. It sends a response to the client.
 * 
 * @throws {Error} - If there's an error during the logout process, it's passed to the next error-handling middleware.
 */
const userLogout = async (req, res, next) => {
    try {
        // Clear the refresh token cookie
        res.clearCookie('refreshToken', {
            httpOnly: true, // Make sure to match the options used when setting the cookie
            secure: process.env.NODE_ENV === 'production', // Only true in production environments
            sameSite: 'Lax', // Adjust the sameSite attribute if needed
        });

        // Log cookies from the request (res.cookies doesn't exist)
        console.log('Cookies before logout:', req.cookies);



        // Respond with a success message
        res
            .status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.AUTHENTICATION.LOGOUT,
            });
    } catch (error) {
        next(error); // Pass error to the next middleware for handling
    }
}

/**
 * Sends OTP for password reset to the user's email address.
 * If the user exists, an OTP is generated and sent to the email for verification.
 * 
 * @async
 * @function sentOTPOnForgetPassword
 * @param {Object} req - The request object containing the email in the body.
 * @param {Object} res - The response object used to send the response.
 * @param {Function} next - The next middleware function in case of errors.
 * 
 * @returns {void} - Sends a response to the client indicating success or failure.
 * 
 * @throws {Error} - If any error occurs during the OTP sending process, it's passed to the next error-handling middleware.
 */
const sentOTPOnForgetPassword = async (req, res, next) => {
    const { email } = req.body;

    try {
        const isExists = await existsUserByEmail(email);
        if (!isExists) {
            return res
                .status(HTTP_STATUS_CODE.NOT_FOUND)
                .json({
                    success: false,
                    message: ResponseMessage.ERROR.AUTHENTICATION.INVALID_CREDENTIALS
                })
        }

        const OTP = generateOTP();
        await storeOtp(email, OTP);
        const emailSent = await sendEmailVerification(email, OTP);
        if (!emailSent) {
            return res.status(HTTP_STATUS_CODE.SERVER_ERROR).json({
                success: false,
                message: ResponseMessage.ERROR.AUTHENTICATION.EMAIL_SEND_FAILED
            });
        }

        res.status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.AUTHENTICATION.OTP_SEND,
            });
    } catch (error) {
        next(error)
    }

}

/**
 * Updates the user's password in the database.
 * 
 * @async
 * @function updateUserPassword
 * @param {string} email - The email of the user whose password needs to be updated.
 * @param {string} newPassword - The new password to set for the user.
 * 
 * @returns {Object|null} The updated user object if the password is successfully updated, null if no user is found.
 * 
 * @throws {CustomError} If there's an issue during the database operation.
 */
const resetPassword = async (req, res, next) => {
    const { password, email } = req.body;

    try {
        if (!password || !email) {
            return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
                success: false,
                message: ResponseMessage.ERROR.AUTHENTICATION.INVALID_CREDENTIALS,
            });
        }

        const securedPassword = await hashPassword(password);

        const updatedUser = await updateUserPassword(email, securedPassword);

        // Check if the user exists
        if (!updatedUser) {
            return res.status(HTTP_STATUS_CODE.NOT_FOUND).json({
                success: false,
                message: ResponseMessage.ERROR.NOT_FOUND,
            });
        }

    } catch (error) {
        next(error)
    }

}

/**
 * Admin login controller that authenticates an admin using email and password.
 * 
 * @async
 * @function adminLogin
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function to handle errors.
 * 
 * @returns {Object} The response object containing success or error message along with the access token.
 * 
 * @throws {Error} If an error occurs during the login process.
 */
const adminLogin = async (req, res, next) => {
    const { email, password } = req.body;

    try {

        if (!email || !password) {
            return res
                .status(HTTP_STATUS_CODE.BAD_REQUEST)
                .json({
                    success: false,
                    message: ResponseMessage.ERROR.AUTHENTICATION.INVALID_CREDENTIALS,
                })
        }

        const user = await getUserDetailsByEmailWithPassword(email);
        const isMatch = await comparePassword(password, user.password);

        if (!user || user.role !== 'admin' || !isMatch) {
            return res
                .status(HTTP_STATUS_CODE.BAD_REQUEST)
                .json({
                    success: false,
                    message: ResponseMessage.ERROR.AUTHENTICATION.INVALID_CREDENTIALS,
                })
        }
        const accessToken = await generateAccessToken(user._id, user.role);
        const refreshToken = await generateRefreshToken(user._id, user.role);

        await storeRefreshToken(email, refreshToken);

        res.cookie('adminToken', refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'Lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.AUTHENTICATION.LOGIN,
                accessToken,
            })

    } catch (error) {
        next(error)
    }
}

/**
 * Admin logout controller that clears the admin's session by removing the refresh token cookie.
 * 
 * @async
 * @function adminLogout
 * @param {Object} req - The request object containing the cookies.
 * @param {Object} res - The response object to send the result back to the client.
 * 
 * @returns {Object} The response object containing a success message.
 * 
 * @throws {Error} If an error occurs during the logout process.
 */
const adminLogout = async (req, res, next) => {
    try {
        // Clear the admin refresh token cookie
        res.clearCookie('adminToken', {
            httpOnly: true, // Ensures that the cookie is not accessible via JavaScript
            secure: process.env.NODE_ENV === 'production', // Ensures the cookie is sent only over HTTPS in production
            sameSite: 'Lax', // Controls the sending of cookies in cross-site requests
        });

        // Log cookies from the request (as `res.cookies` doesn't exist)
        console.log('Cookies before logout:', req.cookies);

        // Respond with a success message
        res
            .status(STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.AUTHENTICATION.LOGOUT,
            });
    } catch (error) {
        next(error); // Pass error to the next middleware for handling
    }
};


const refreshAccessToken = async (req, res, next) => {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
        return res
            .status(HTTP_STATUS_CODE.FORBIDDEN)
            .json({
                success: false,
                message: ResponseMessage.ERROR.AUTHORIZATION.INVALID_TOKEN,
            })
    }
    try {
        const decode = await decodeRefreshToken(refreshToken);
        const user = await getUserById(decode.userId, true);
        const currentToken = await getRefreshToken(user.email)

        if (!user || refreshToken !== currentToken) {
            return res
                .status(HTTP_STATUS_CODE.FORBIDDEN)
                .json({
                    success: false,
                    message: ResponseMessage.ERROR.AUTHORIZATION.INVALID_TOKEN,
                })
        }

        const accessToken = await generateAccessToken(user._id, user.role);

        res.status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                accessToken,
                massage: ResponseMessage.SUCCESS.OK
            });
    } catch (error) {
        next(error)
    }
}

module.exports = {
    sentOTP,
    otpVerification,
    register,
    userLogin,
    userLogout,
    sentOTPOnForgetPassword,
    resetPassword,
    adminLogin,
    adminLogout,
    refreshAccessToken,
}