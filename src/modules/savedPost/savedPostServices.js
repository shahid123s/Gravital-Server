const { DATABASE_ERROR } = require('../../../constants/errorCodes');
const { SERVER_ERROR } = require('../../../constants/httpStatus').HTTP_STATUS_CODE;
const CustomError = require('../../utils/customError');
const Saved = require('./savedPostModel');

/**
 * Checks whether a specific user has saved a post.
 * 
 * @param {string} userId - The ID of the user to check.
 * @param {string} postId - The ID of the post to check if the user has saved.
 * @returns {Promise<boolean>} - A promise that resolves to `true` if the post is saved by the user, `false` otherwise.
 * @throws {CustomError} - Throws a custom error if there is an issue with the database query.
 */
const checkUserIsSavedThePost = async (userId, postId) => {
    try {
        return !!(await Saved.exists({postId, userId}));
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR
        )
    }
}

/**
 * Deletes a saved post for a specific user.
 * 
 * @async
 * @function deleteSavedPost
 * @param {string} postId - The ID of the post to be deleted from the saved posts.
 * @param {string} userId - The ID of the user who saved the post.
 * @returns {Promise<Object>} A promise that resolves to the result of the delete operation.
 * @throws {CustomError} If an error occurs during the deletion process.
 */
const deleteSavedPost = async (postId, userId) => {
    try {
        return await Saved.deleteOne({postId, userId});
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR
        )
    }
}

/**
 * Saves a post for a specific user.
 *
 * @async
 * @function createSavedPost
 * @param {string} postId - The ID of the post to be saved.
 * @param {string} userId - The ID of the user saving the post.
 * @returns {Promise<Object>} A promise that resolves to the saved post document.
 * @throws {CustomError} If an error occurs during the saving process.
 */
const createSavedPost = async (postId, userId) => {
    try {
        const savedPost = new Saved({
            postId,
            userId,
        })
        return await savedPost.save();
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR
        )
    }
}

/**
 * Removes all saved instances of a post from the database.
 *
 * @async
 * @function removeSavedPosts
 * @param {string} postId - The ID of the post whose saved instances need to be deleted.
 * @returns {Promise<Object>} The result of the delete operation.
 *
 * @throws {CustomError} Throws an error if the deletion fails due to a database issue.
 */
const removeSavedPosts = async (postId) => {
    try {
        return await Saved.deleteMany({postId});
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR
        )
    }
}

module.exports = {
    checkUserIsSavedThePost,
    deleteSavedPost,
    createSavedPost,
    removeSavedPosts,

}