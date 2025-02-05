const { DATABASE_ERROR } = require('../../../constants/errorCodes');
const { SERVER_ERROR } = require('../../../constants/httpStatus').HTTP_STATUS_CODE;
const CustomError = require('../../utils/customError');
const Block = require('./blockModel');

/**
 * Checks if a user has blocked another user. Optionally returns the block document's ID.
 *
 * @param {string} userId - The ID of the user performing the check (blocker).
 * @param {string} targetUserId - The ID of the target user being checked (blocked user).
 * @param {boolean} [returnId=false] - If true, returns the block document's ID instead of a boolean.
 *
 * @returns {Promise<boolean | object>} - Returns `true` if the target user is blocked, `false` if not.
 * If `returnId` is true, returns the block document with its `_id` instead.
 *
 * @throws {CustomError} - Throws a custom error in case of database or server issues.
 */
const checkUserIsBlocked = async (userId, targetUserId, returnId = false) => {
    try {
        if (returnId) {
            return await Block.findOne({
                blockedId: targetUserId,
                blockerId: userId
            })
                .select('_id')
                .lean();
        };

        return !!(await Block.exists({
            blockedId: targetUserId,
            blockerId: userId
        }));
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR
        )
    }
}

/**
 * Creates a block record to prevent interactions between users.
 *
 * @param {string} userId - The ID of the user initiating the block (blocker).
 * @param {string} targetUserId - The ID of the user being blocked.
 *
 * @returns {Promise<Object>} - Returns the saved block document.
 *
 * @throws {CustomError} - Throws an error in case of database or server issues.
 */
const createBlock = async (userId, targetUserId) => {
    try {
        const block = new Block({
            blockerId: userId,
            blockedId: targetUserId,
        })
        return await block.save()
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR
        )
    }
}

/**
 * Removes a block record, allowing interactions between users again.
 *
 * @param {string} id - The ID of the block document to be removed.
 *
 * @returns {Promise<Object | null>} - Returns the deleted block document if found, otherwise `null`.
 *
 * @throws {CustomError} - Throws an error in case of database or server issues.
 */
const removeBlock = async (id) => {
    try {
        return await Block.findByIdAndDelete(id);
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR
        )
    }
}

/**
 * Retrieves a list of users who have blocked the current user.
 *
 * @async
 * @function getUsersWhoBlockedCurrentUser
 * @param {string} userId - The ID of the current user.
 * @returns {Promise<Array<string>>} A promise that resolves to an array of user IDs who blocked the current user.
 * @throws {CustomError} If a database error occurs.
 */
const getUsersWhoBlockedCurrentUser = async (userId) => {
    try {
        const blockedByUsers = await Block.find({ blockedId: userId }).select('blockerId').lean();
        return blockedByUsers.map(block => block.blockerId); // Extract only blocker IDs
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        );
    }
};

/**
 * Retrieves a list of users that the current user has blocked.
 *
 * @async
 * @function getBlockedUsersByCurrentUser
 * @param {string} userId - The ID of the current user.
 * @returns {Promise<Array<string>>} A promise that resolves to an array of user IDs that the current user has blocked.
 * @throws {CustomError} If a database error occurs.
 */
const getBlockedUsersByCurrentUser = async (userId) => {
    try {
        const blockedUsers = await Block.find({ blockerId: userId }).select('blockedId').lean();
        return blockedUsers.map(block => block.blockedId); // Extract only blocked user IDs
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        );
    }
};

module.exports = {
    checkUserIsBlocked,
    createBlock,
    removeBlock,
    getUsersWhoBlockedCurrentUser,
    getBlockedUsersByCurrentUser,
}