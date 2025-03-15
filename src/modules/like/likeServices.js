const { DATABASE_ERROR } = require('../../../constants/errorCodes');
const { SERVER_ERROR } = require('../../../constants/httpStatus').HTTP_STATUS_CODE;
const CustomError = require('../../utils/customError');
const Like = require('./likeModel');

/**
 * Checks if a given post is liked by the specified user.
 * @param {string} userId - The ID of the user to check.
 * @param {string} postId - The ID of the post to check.
 * @returns {Promise<boolean>} - A promise that resolves to `true` if the post is liked by the user, otherwise `false`.
 * 
 * @throws {CustomError} - Throws a custom error if there is a problem with the database query.
 */
const checkUserIsLikedThePost = async (userId, postId) => {
    try {
        return !!(await Like.exists({ postId, userId }))
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        )
    }
}

/**
 * Retrieves the count of likes for a specific post.
 * @param {string} postId - The ID of the post for which the like count is being fetched. 
 * @returns {Promise<number>} - A promise that resolves to the total number of likes on the post.
 * @throws {CustomError} - Throws a custom error if there is an issue with the database query.
 */
const getLikedCountofPost = async (postId) => {
    try {
        return await Like.countDocuments({ postId });
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        );
    }
}

/**
 * Checks if a user has liked a post.
 * If `returnId` is true, it returns the `_id` of the like document.
 * Otherwise, it returns a boolean indicating if the like exists.
 *
 * @param {string} userId - The ID of the user.
 * @param {string} postId - The ID of the post.
 * @param {boolean} [returnId=false] - If true, returns the `_id` of the like document.
 * @returns {Promise<boolean | { _id: string } | null>} - Returns `_id` of the like document if `returnId` is true, `true/false` otherwise.
 * @throws {CustomError} - Throws an error if the database query fails.
 */
const isPostLikedByUser = async (userId, postId, returnId = false) => {
    try {
        if (returnId) {
            return await Like.findOne({ userId, postId })
                .select('_id')
                .lean();
        }

        return !!(await Like.exists({ userId, postId }));
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR
        );
    }
};

/**
 * Removes a like by its ID.
 * 
 * @param {string} id - The ID of the like document to be removed.
 * @returns {Promise<{ _id: string } | null>} - Returns the deleted like document if found, otherwise `null`.
 * @throws {CustomError} - Throws an error if the database query fails.
 */
const deleteLikeById = async (id) => {
    try {
        const deletedLike = await Like.findByIdAndDelete(id);
        return deletedLike; // Returns the deleted document or null if not found
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR
        );
    }
};

/**
 * Adds a like to a post by a user.
 *
 * @param {string} userId - The ID of the user who likes the post.
 * @param {string} postId - The ID of the post being liked.
 * @returns {Promise<Object>} - The created like document.
 * @throws {CustomError} - Throws an error if the database operation fails.
 */
const likePost = async (userId, postId) => {
    try {
        const like = new Like({
            userId,
            postId,
        })
        return await  like.save();
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR
        );
    }
}

/**
 * Removes all likes associated with a specific post.
 *
 * @async
 * @function removeLikedPosts
 * @param {string} postId - The ID of the post whose likes need to be removed.
 * @returns {Promise<Object>} The result of the delete operation.
 *
 * @throws {CustomError} Throws an error if the deletion fails due to a database issue.
 */
const removeLikedPosts = async (postId) =>{
    try {
        return await Like.deleteMany({postId})
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR
        );
    }
}

const fetchLikedPostByUser = async (userId) => {
    try {
        return await Like
        .find({userId})
        .populate({
            path: 'postId',
            populate: {
                path: 'userId',
                select: 'username profileImage fullName',
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
    checkUserIsLikedThePost,
    getLikedCountofPost,
    isPostLikedByUser,
    deleteLikeById,
    likePost,
    removeLikedPosts,
    fetchLikedPostByUser,
}