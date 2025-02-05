const { HTTP_STATUS_CODE } = require('../../../constants/httpStatus');
const { ResponseMessage } = require('../../../constants/responseMessage');
const { checkIsRestricted, removeRestriction, createRestriction } = require('./restrictionServices')

/**
 * Toggles the restriction status of a user.
 * - If the user is already restricted, it removes the restriction.
 * - If the user is not restricted, it creates a new restriction entry.
 *
 * @async
 * @param {Object} req - Express request object.
 * @param {Object} req.body - The request body containing the target user ID.
 * @param {string} req.body.restrictedUser - The ID of the user to be restricted or unrestricted.
 * @param {Object} req.user - The authenticated user object.
 * @param {string} req.user.userId - The ID of the user performing the restriction.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 * @returns {Promise<void>} - Sends a JSON response indicating success or passes an error to the next middleware.
 * @throws {CustomError} - Throws an error if the database operation fails.
 */
const toggleRestrict = async (req, res, next) => {
    try {
        const { restrictedUser: targetUserId } = req.body;
        const { userId } = req.user;

        const isRestricted = await checkIsRestricted(userId, targetUserId, true);

        if (isRestricted) {
            await removeRestriction(isRestricted._id);
    
        }else {
            await createRestriction(userId, targetUserId);
        }
        
        res
            .status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.UPDATED,
            });
    } catch (error) {
        next(error)
    }
}





module.exports = {
    toggleRestrict,
}