const { DATABASE_ERROR } = require('../../../constants/errorCodes');
const { SERVER_ERROR } = require('../../../constants/httpStatus').HTTP_STATUS_CODE;
const CustomError = require('../../utils/customError');
const { post } = require('../user/userRoutes');
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

/**
 * Retrieves archived post IDs, either for all users or a specific user.
 *
 * @async
 * @function getArchivedPostIds
 * @param {string|null} [userId=null] - Optional user ID to filter archived posts. If null, retrieves all archived post IDs.
 * @returns {Promise<string[]>} A promise resolving to an array of archived post IDs.
 * @throws {CustomError} If a database error occurs.
 */
const getArchivedPostIds = async (userId = null) => {
    try {
        const filter = userId ? { userId } : {}; // Filter by user if userId is provided
        const archivedPosts = await Archive.find(filter).select('postId').lean();
        return archivedPosts.map(post => post.postId);
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR
        );
    }
};

/**
 * Checks if a post is archived.
 * 
 * @async
 * @function isArchived
 * @param {string} postId - The ID of the post to check.
 * @returns {Promise<boolean>} - Returns `true` if the post is archived, otherwise `false`.
 * 
 * @throws {CustomError} Throws a database error if the query fails.
 */
const isArchived = async (postId) => {
    try {
        return !!(await Archive.exists({ postId }));
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR
        );
    }
}

/**
 * Deletes an archived post for a specific user.
 *
 * @async
 * @function deleteArchive
 * @param {string} postId - The ID of the post to unarchive.
 * @param {string} userId - The ID of the user performing the action.
 * @returns {Promise<Object>} - The result of the deletion operation.
 *
 * @throws {CustomError} Throws a database error if the operation fails.
 */
const deleteArchive = async (postId, userId) => {
    try {
        return await Archive.deleteOne({ postId, userId });
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR
        );
    }
}


/**
 * Archives a post for a specific user.
 *
 * @async
 * @function makeArchive
 * @param {string} postId - The ID of the post to be archived.
 * @param {string} userId - The ID of the user performing the action.
 * @returns {Promise<Object>} - The archived post document.
 *
 * @throws {CustomError} Throws a database error if the operation fails.
 */
const makeArchive = async (postId, userId) => {
    try {

        return new Archive({
            postId,
            userId,
        }).save();
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR
        );
    }
}

/**
 * @function fetchArchivedPost
 * @description Fetches all archived posts of a specific user, including post details and the post owner's basic information.
 * @param {string} userId - The ID of the user whose archived posts are to be retrieved.
 *
 * @returns {Promise<Array>} - A promise that resolves to an array of archived posts with populated post details and user information.
 *
 * @throws {CustomError} If a database error occurs.
 */
const fetchArchivedPost = async (userId) => {
    try {
        return await Archive.find({userId})
        .populate({
            path: 'postId',
            populate: {
                path: 'userId',
                select: 'username fullName profileImage',
            },
        }).lean();

    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR
        );
    }
}

module.exports = {
    getArchivePostCount,
    isArchived,
    getArchivedPostIds,
    deleteArchive,
    makeArchive,
    fetchArchivedPost,
}