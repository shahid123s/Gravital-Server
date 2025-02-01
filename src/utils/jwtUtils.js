const jwt = require('jsonwebtoken');
const CustomError = require('./customError');
const ERROR_CODES = require('../../constants/errorCodes');
const {refreshSecret, refreshExpiry, accessSecret, accessExpiry} = require('../config/appConfig').jwt;


/**
 * Generate Access Token using jsonwebtoken
 * @param {string} userId -- Mongodb user objectId
 * @param {string} role -- The user role to be assigned for user
 * @returns {Promise<string>} -- Access Token 
 */

const generateAccessToken = async (userId, role) => {
    return jwt.sign(
        {userId, role},
        accessSecret,
        {expiresIn: accessExpiry}
    );
};

/**
 * Generate Refresh Token using jsonwebtoken
 * @param {string} userId -- Mongodb user objectId
 * @param {string} role -- The user role to be assigned for user
 * @returns {Promise<string>} -- Access Token 
 */

const generateRefreshToken = async (userId, role) => {
    return jwt.sign(
        {userId, role},
        refreshSecret,
        {expiresIn :refreshExpiry},
    );
};

/**
 * Decode Access Token using jsonwebtoken
 * @param {string} accessToken -- The valuating accessToken
 * @returns {Promise<object>} -- Decoded Object
 */

const decodeAccessToken = async (accessToken) => {
    try {
        return jwt.verify(accessToken, accessSecret);
    } catch (error) {
        console.error(error)
        throw new CustomError('Invalid or Expired Access Token', 401, ERROR_CODES.ACCESS_DENIED);
    }
}


/**
 * Decode Refresh Token using jsonwebtoken
 * @param {string} refreshToken -- The valuating accessToken
 * @returns {Promise<object>} -- Decoded object
 */

const decodeRefreshToken = async (refreshToken) => {
    try {
        return jwt.verify(refreshToken, refreshSecret);
    } catch (error) {
        console.error(error)
        throw new CustomError('Invalid or Expired Access Token', 401, ERROR_CODES.ACCESS_DENIED);
    }
}


// Exporting function to use on other modules
module.exports = { 
    generateAccessToken,
    generateRefreshToken,
    decodeAccessToken,
    decodeRefreshToken,
}