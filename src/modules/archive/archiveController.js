const { HTTP_STATUS_CODE } = require("../../../constants/httpStatus");
const { ResponseMessage } = require("../../../constants/responseMessage");
const { doesPostExist } = require("../post/postServices");
const { enrichPosts } = require("../post/utils/postUtils");
const { isArchived, deleteArchive, makeArchive, fetchArchivedPost } = require("./archiveServices");

/**
 * @function archivePost
 * @description Toggles the archive status of a post for the logged-in user.
 *              Only the owner of the post can archive/unarchive it.
 *
 * @param {Object} req - Express request object.
 * @param {Object} req.user - Authenticated user object.
 * @param {string} req.user.userId - ID of the logged-in user.
 * @param {Object} req.body - Request body.
 * @param {string} req.body.postId - ID of the post to be archived/unarchived.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 *
 * @returns {Promise<void>} Sends a success response if the operation is successful,
 *                          otherwise calls the error handler.
 *
 * @throws {CustomError} If a database error occurs.
 */
const archivePost = async (req, res, next) => {
    const { userId } = req.user;
    const { postId } = req.body;

    try {

        const isPostExist = await doesPostExist(postId, true);

        if (!isPostExist || isPostExist.userId !== userId) {
            return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
                success: false,
                message: ResponseMessage.ERROR.BAD_REQUEST,
            });
        }

        const isExists = await isArchived(postId);
        if (isExists) {
            await deleteArchive(postId, userId);
        } else {
            await makeArchive(postId, userId);
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

/**
 * Retrieves all archived posts of the authenticated user, enriches them with additional data, and sends the response.
 *
 * @async
 * @function getArchivedPosts
 * @param {Object} req - Express request object.
 * @param {Object} req.user - Authenticated user object.
 * @param {string} req.user.userId - ID of the authenticated user.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 *
 * @returns {Promise<void>} Sends a JSON response containing the enriched archived posts.
 *
 * @throws {Error} Passes errors to the next middleware.
 */
const getArchivedPosts = async (req, res, next) => {
    const { userId } = req.user;
    try {
        const archivedPost = await fetchArchivedPost(userId);
        const posts = await enrichPosts(archivedPost, userId);

        res.status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.OK,
                posts,
            });
    } catch (error) {
        next(error)
    }
}

/**
 * Publishes a previously archived post by removing it from the archive.
 *
 * @async
 * @function publishPost
 * @param {Object} req - Express request object.
 * @param {Object} req.user - Authenticated user object.
 * @param {string} req.user.userId - ID of the authenticated user.
 * @param {Object} req.body - Request body object.
 * @param {string} req.body.postId - ID of the post to be published.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 *
 * @returns {Promise<void>} Sends a JSON response confirming the post has been published.
 *
 * @throws {Error} Passes errors to the next middleware.
 */
const publishPost = async (req, res, next) => {
    const { postId } = req.body;
    const { userId } = req.user;

    try {
        if (!postId) {
            return res.status(HTTP_STATUS_CODE.BAD_REQUEST)
                .json({
                    success: false,
                    message: ResponseMessage.ERROR.BAD_REQUEST,
                });
        }

        const isExists = await isArchived(postId);
        if (!isExists) {
            return res.status(HTTP_STATUS_CODE.NOT_FOUND)
                .json({
                    success: false,
                    message: ResponseMessage.ERROR.NOT_FOUND,
                });
        }

        await deleteArchive(postId, userId);
        res.status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.UPDATED,
            });

    } catch (error) {
        next(error);
    }
};

module.exports = {
    archivePost,
    getArchivedPosts,
    publishPost,
}