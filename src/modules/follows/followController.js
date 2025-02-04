const { HTTP_STATUS_CODE } = require("../../../constants/httpStatus");
const { ResponseMessage } = require("../../../constants/responseMessage");
const {
    removeFollow,
    getFollowDocumentId,
    createFollowRelationship,
} = require('./followServices')

/**
 * Toggles the follow status between two users.
 *
 * - If the user is already following the target user, it removes the follow relationship.
 * - If the user is not following the target user, it creates a new follow relationship.
 *
 * @param {Object} req - Express request object.
 * @param {Object} req.user - The authenticated user data.
 * @param {string} req.user.userId - The ID of the user performing the follow/unfollow action.
 * @param {Object} req.body - The request body containing the target user ID.
 * @param {string} req.body.userId - The ID of the target user to follow/unfollow.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next function for error handling.
 * @returns {Promise<void>} - Sends a JSON response with success status.
 */
const toggleFollow = async (req, res, next) => {
    const {userId} = req.user;
    const targetUserId = req.body.userId;

    try {
        if(!targetUserId) {
            return res
            .status(HTTP_STATUS_CODE.BAD_REQUEST)
            .json({
                success: false,
                message: ResponseMessage.ERROR.BAD_REQUEST,
            });
        }

        const isExists = await getFollowDocumentId(userId, targetUserId);
        console.log(isExists) // ivda check cheyyanam
        if(isExists){
            await removeFollow(isExists._id);
            return res 
            .status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.UPDATED,
            })
        }
        
        await createFollowRelationship(userId, targetUserId);
        res.status(HTTP_STATUS_CODE.SUCCESS_OK)
        .json({
            success: true,
            message:ResponseMessage.SUCCESS.UPDATED,
        })

    } catch (error) {
        next(error)
    }
}


module.exports = {
    toggleFollow,
}