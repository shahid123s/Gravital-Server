const { HTTP_STATUS_CODE } = require("../../../constants/httpStatus");
const { ResponseMessage } = require("../../../constants/responseMessage");
const { getIo } = require("../../config/socketConfig");
const { doesPostExist } = require("../post/postServices");
const { doesUserExist } = require("../user/userService");
const { isPostLikedByUser, deleteLikeById, likePost } = require("./likeServices");

/**
 * Toggles the like status of a post for a user.
 * If the user has already liked the post, it removes the like.
 * If the user has not liked the post, it adds a new like.
 *
 * @param {Object} req - Express request object containing user ID in `req.user` and post ID in `req.body`.
 * @param {Object} res - Express response object used to send the response.
 * @param {Function} next - Express next function for error handling.
 * @returns {Promise<void>} - Sends a JSON response indicating success or failure.
 */
const toggleLike = async(req, res, next) => {
    const {userId} = req.user;
    const {postId} = req.body
    try {
        const [post, user] = await Promise.all([
            doesPostExist(postId),
            doesUserExist(userId),
        ])
        if(!post|| !user) {
            return res
            .status(HTTP_STATUS_CODE.BAD_REQUEST)
            .json({
                success: true,
                message: ResponseMessage.ERROR.BAD_REQUEST,
            });
        }
        const isExists = await isPostLikedByUser(userId, postId, true);
        if(isExists){
            await deleteLikeById(isExists._id);
            return res
            .status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.UPDATED,
            });
        };
        await likePost(userId, postId);
        const io = getIo()
        const notification = {message: 'Notification comes'}
        io.to('shahid1').emit('receiveNotification', notification);
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
    toggleLike,
    
}