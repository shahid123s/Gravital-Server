const User = require('../user/userModel')
const CustomError = require('../../utils/customError');
const { HTTP_STATUS_CODE } = require('../../../constants/httpStatus');
const ERROR_CODE = require('../../../constants/errorCodes');
const { email } = require('../../config/appConfig');

/**
 * Checks the user is exists with username in mongoDB
 * @param {string} username - username of the user 
 * @returns {Promise<object>} - A boolean or MongoDb ObjectId.
 */
const existsUserByUsername = async (username) => {
    try {
        return await User.exists({ username });
    } catch (error) {
        throw new CustomError(
            error.message,
            HTTP_STATUS_CODE.SERVER_ERROR,
            ERROR_CODE.DATABASE_ERROR,
        )
    }
}

/**
 * Checks the user is exists with email in mongoDB
 * @param {string} email - User email 
 * @returns {Promise<object>} - A boolean or MongoDb ObjectId.
 */
const existsUserByEmail = async (email) => {
    try {
        return await User.exists({ email });
    } catch (error) {
        throw new CustomError(
            error.message,
            HTTP_STATUS_CODE.SERVER_ERROR,
            ERROR_CODE.DATABASE_ERROR,
        )
    }
}

/**
 * Creates a new user in the database
 * @param {object} userData - The user data to be stored in the database (fullName, phoneNumber, email, dob, etc.)
 * @returns {Promise<object>} - The saved user object from the database
 * @throws {CustomError} - If an error occurs while saving the user to the database
 */
const createUser = async (userData) => {
    try {
        const user = new User({ ...userData });
        return await user.save();
    } catch (error) {
        throw new CustomError(
            error.message,
            HTTP_STATUS_CODE.SERVER_ERROR,
            ERROR_CODE.DATABASE_ERROR,
        )
    }
}

/**
 * Fetches user details by email, including password and role.
 * 
 * @param {string} email - The email of the user to retrieve.
 * @returns {Promise<object|null>} - Returns user object if found, otherwise null.
 * @throws {CustomError} - Throws a database error if retrieval fails.
 */
const getUserDetailsByEmailWithPassword = async (email) => {
    try {
        return await User.findOne({ email }).select('username isBlock password role');
    } catch (error) {
        throw new CustomError(
            error.message,
            HTTP_STATUS_CODE.SERVER_ERROR,
            ERROR_CODE.DATABASE_ERROR,
        );
    }
}



module.exports = {
    existsUserByUsername,
    existsUserByEmail,
    createUser,
    getUserDetailsByEmailWithPassword,

}