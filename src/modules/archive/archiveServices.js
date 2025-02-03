const { DATABASE_ERROR } = require('../../../constants/errorCodes');
const { SERVER_ERROR } = require('../../../constants/httpStatus').HTTP_STATUS_CODE;
const CustomError = require('../../utils/customError');
const Archive = require('./archiveModel');

/**
 * Retrieves the count of archived posts for a given user.
 *
 * @param {string} userId - The ID of the user whose archived post count is to be retrieved.
 * @returns {Promise<number>} - Returns the count of archived posts.
 * @throws {CustomError} - Throws an error if a database issue occurs.
 */
const getArchivePostCount = async (userId) => {
    try {
        return await Archive.countDocuments({ userId });
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        )
    }
}

module.exports = {
    getArchivePostCount,
}