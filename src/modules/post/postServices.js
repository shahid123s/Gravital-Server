const { DATABASE_ERROR } = require('../../../constants/errorCodes');
const { SERVER_ERROR } = require('../../../constants/httpStatus').HTTP_STATUS_CODE;
const CustomError = require('../../utils/customError');
const Post = require('./postModel');

/**
 * Retrieves the total count of posts for a given user.
 *
 * @param {string} userId - The ID of the user whose post count is to be retrieved.
 * @returns {Promise<number>} - Returns the count of posts created by the user.
 * @throws {CustomError} - Throws an error if a database issue occurs.
 */
const getPostCount = async (userId) => {
    try {
        return await Post.countDocuments({ userId });
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        )
    }
}

module.exports = {
    getPostCount,
}