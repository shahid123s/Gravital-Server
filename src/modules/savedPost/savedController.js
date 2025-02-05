const { doesPostExist } = require("../post/postServices");
const { doesUserExist } = require("../user/userService");
const { HTTP_STATUS_CODE } = require('../../../constants/httpStatus');
const { ResponseMessage } = require("../../../constants/responseMessage");
const { checkUserIsSavedThePost, deleteSavedPost, createSavedPost } = require("./savedPostServices");

/**
 * Toggles the saved status of a post for a user.
 * 
 * - If the post is already saved by the user, it gets unsaved.
 * - If the post is not saved, it gets saved.
 *
 * @async
 * @function toggleSave
 * @param {Object} req - The request object.
 * @param {Object} req.user - The user object containing the authenticated user's ID.
 * @param {string} req.user.userId - The ID of the authenticated user.
 * @param {Object} req.body - The request body.
 * @param {string} req.body.postId - The ID of the post to toggle save status.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function for error handling.
 * @returns {Promise<void>} Sends a JSON response indicating success or failure.
 * 
 * @throws {Error} Passes any encountered errors to the next middleware.
 */
const toggleSave = async (req, res, next) => {
    const { userId } = req.user;
    const { postId } = req.body;

    try {
        const post = await doesPostExist(postId)
        if (!post) {
            return res
                .status(HTTP_STATUS_CODE.NOT_FOUND)
                .json({
                    success: false,
                    message: ResponseMessage.ERROR.NOT_FOUND,
                });
        }
        const isSaved = await checkUserIsSavedThePost(userId, postId);
        if (isSaved) {
            await deleteSavedPost(postId, userId);
        }else{
            await createSavedPost(postId, userId);
        }

        res.status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.UPDATED,
            });

    } catch (error) {
        next(error);
    }
}

module.exports = {
    toggleSave,
}