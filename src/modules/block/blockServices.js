const {DATABASE_ERROR} = require('../../../constants/errorCodes');
const { SERVER_ERROR } = require('../../../constants/httpStatus').HTTP_STATUS_CODE;
const CustomError = require('../../utils/customError');
const Block = require('./blockModel');

/**
 * Checks if a user has blocked another user.
 *
 * @param {string} userId - The ID of the user performing the check.
 * @param {string} targetUserId - The ID of the user being checked.
 * @returns {Promise<boolean>} - Returns `true` if the user is blocked, otherwise `false`.
 * @throws {CustomError} - Throws an error if a database issue occurs.
 */
const checkUserIsBlocked = async (userId, targetUserId) => {
    try {
        return !!(await Block.exists({blockedId: targetUserId, blockerId: userId}))
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR
        )
    }
} 

module.exports = {
    checkUserIsBlocked
}