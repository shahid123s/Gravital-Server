const { HTTP_STATUS_CODE } = require('../../../constants/httpStatus')
const { ResponseMessage } = require('../../../constants/responseMessage');
const { existsUserByUsername, existsUserByEmail, createUser, getUserDetailsByEmailWithPassword } = require('../user/userService');
const { hashPassword, comparePassword } = require('../../utils/bcryptUtils');
const { storeData, storeOtp, getOtp, getData } = require('../../utils/redisUtils');
const { generateOTP } = require('../../utils/generateOTP');
const sendEmailVerification = require('../../utils/emailUtils');
const validateInput = require('../../../validations/inputValidation');
const { generateAccessToken, generateRefreshToken } = require('../../utils/jwtUtils');


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

        // Combine existing data and the personal informations 
        const userDetails = { ...userData, fullName, phoneNumber, dob };

        // create the user in the database
        await createUser(userDetails);

        res
            .status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.REGISTRATION.SUCCESS,
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



module.exports = {
    sentOTP,
    otpVerification,
    register,
    userLogin,
}