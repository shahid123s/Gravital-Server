const { SERVER_ERROR } = require('../../../constants/httpStatus').HTTP_STATUS_CODE;
const { DATABASE_ERROR } = require('../../../constants/errorCodes');
const CustomError = require('../../utils/customError');
const Restriction = require('./restrictionModel');

/**
 * Checks if a user has restricted another user.
 * If `returnId` is true, it returns the restriction document's `_id`, otherwise, it returns a boolean indicating existence.
 *
 * @param {string} userId - The ID of the user performing the restriction.
 * @param {string} targetUserId - The ID of the user being checked.
 * @param {boolean} [returnId=false] - If true, returns the restriction document `_id`; otherwise, returns a boolean.
 * @returns {Promise<boolean | string | null>} - Returns `true` if restricted, `false` if not (when `returnId` is false).
 *                                               Returns `_id` if restricted, `null` if not (when `returnId` is true).
 * @throws {CustomError} - Throws an error if a database operation fails.
 */
const checkIsRestricted = async (userId, targetUserId, returnId = false) => {
    try {

        if (returnId) {
            const restriction = await Restriction.findOne({
                restrictedBy: userId,
                restrictedUser: targetUserId,
            }).select('_id').lean();
            return restriction ? restriction._id : null; // Return the ID if found, otherwise null
        }

        return!!(await Restriction.exists({
            restrictedBy: userId,
            restrictedUser: targetUserId,
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
 * Creates a new restriction entry to block a user.
*
* @async
* @param {string} userId - The ID of the user who is restricting another user.
* @param {string} targetUserId - The ID of the user being restricted.
* @returns {Promise<Object>} - Returns the created restriction document.
* @throws {CustomError} - Throws an error if the database operation fails.
*/
const createRestriction = async (userId, targetUserId) => {
    try {
        const restriction = new Restriction({
            restrictedBy: userId,
            restrictedUser: targetUserId,
        });
        return await restriction.save();
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR
        )
    }
}

/**
 * Removes a restriction entry by its ID.
 *
 * @async
 * @param {string} id - The ID of the restriction document to be deleted.
 * @returns {Promise<Object | null>} - Returns the deleted restriction document if successful, otherwise `null`.
 * @throws {CustomError} - Throws an error if the database operation fails.
 */
const removeRestriction = async (id) => {
    try {
        return await Restriction.findByIdAndDelete(id);
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR
        )
    }
}


module.exports = {
    checkIsRestricted,
    createRestriction,
    removeRestriction
}