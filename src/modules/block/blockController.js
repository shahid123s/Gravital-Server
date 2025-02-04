const { HTTP_STATUS_CODE } = require("../../../constants/httpStatus");
const { ResponseMessage } = require("../../../constants/responseMessage");
const { checkUserIsBlocked, removeBlock, createBlock } = require("./blockServices");

/**
 * Toggles the block status between two users.
 *
 * - If the user is already blocked, it removes the block.
 * - If the user is not blocked, it creates a new block entry.
 *
 * @param {Object} req - Express request object.
 * @param {Object} req.user - The authenticated user data.
 * @param {string} req.user.userId - The ID of the user performing the block/unblock action.
 * @param {Object} req.body - The request body containing the target user ID.
 * @param {string} req.body.userId - The ID of the target user to block/unblock.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next function for error handling.
 * @returns {Promise<void>} - Sends a JSON response with success status.
 */
const toggleBlock = async (req, res, next) => {
    try {
        const { userId } = req.user;
        const { userId: targetUserId } = req.body;

        const isBlocked = await checkUserIsBlocked(userId, targetUserId, true);

        if (isBlocked) {
            await removeBlock(isBlocked._id);
            return res.status(HTTP_STATUS_CODE.SUCCESS_OK)
                .json({
                    success: true,
                    message: ResponseMessage.SUCCESS.UPDATED,
                })
        }

        await createBlock(userId, targetUserId);

        res.status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.UPDATED,
            })

    } catch (error) {
        next(error)
    }

}


module.exports = {
    toggleBlock,

}