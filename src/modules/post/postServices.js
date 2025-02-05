const { DATABASE_ERROR } = require('../../../constants/errorCodes');
const { _id } = require('../../../Constants/predefinedUserDetails');
const { SERVER_ERROR } = require('../../../constants/httpStatus').HTTP_STATUS_CODE;
const CustomError = require('../../utils/customError');
const Post = require('./postModel');

/**
 * Checks if a post exists in the database. Optionally, returns the `userId` of the post owner.
 *
 * @async
 * @function doesPostExist
 * @param {string} id - The ID of the post to check.
 * @param {boolean} [returnUserID=false] - If `true`, returns the `userId` of the post owner.
 * @returns {Promise<boolean|Object|null>} 
 * - If `returnUserID` is `false`, returns `true` if the post exists, otherwise `false`.
 * - If `returnUserID` is `true`, returns an object `{ userId: <userId> }` if the post exists, otherwise `null`.
 * 
 * @throws {CustomError} Throws a database error if the operation fails.
 */
const doesPostExist = async (id, returnUserID = false) => {
    try {
        if(returnUserID) {
            return await Post.findOne({_id: id}).select('userId').lean();
        }
        return !!(await Post.exists({ _id: id }));
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        );
    }
};


/**
 * Retrieves the total count of posts for a given user.
 *
 * @param {string} userId - The ID of the user whose post count is to be retrieved.
 * @returns {Promise<number>} - Returns the count of posts created by the user.
 * @throws {CustomError} - Throws an error if a database issue occurs.
 */
const getPostCount = async (userId) => {
    try {
        return await Post.countDocuments({ userId });
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        )
    }
}

/**
 * Creates a new post in the database.
 *
 * @param {string} userId - The ID of the user creating the post.
 * @param {string} fileName - The name of the file (image/video) associated with the post.
 * @param {string} caption - The caption for the post.
 * @returns {Promise<Object>} - Returns the created post object.
 * @throws {CustomError} - Throws an error if post creation fails.
 */
const createPost = async (userId, fileName, caption) => {
    try {
        // Validate input
        if (!userId || !fileName) {
            throw new CustomError(
                "User ID and file name are required.",
                SERVER_ERROR,
                DATABASE_ERROR
            );
        }

        // Create and save post
        const post = new Post({ userId, caption, fileName });
        return await post.save();

    } catch (error) {
        throw new CustomError(
            error.message || "Failed to create post.",
            SERVER_ERROR,
            DATABASE_ERROR
        );
    }
};

/**
 * Fetches posts while excluding archived posts and posts from blocked users.
 *
 * @async
 * @function fetchPosts
 * @param {Array<string>} archivedPostIds - An array of post IDs that are archived.
 * @param {Array<string>} blockedIds - An array of user IDs that are blocked or have blocked the current user.
 * @param {number} page - The page number for pagination.
 * @param {number} limit - The number of posts to fetch per page.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of post objects.
 * @throws {CustomError} If there is a database error.
 */
const fetchPosts = async (archivedPostIds, blockedIds, page, limit) => {
    try {
        return await Post.find({
            isRestricted: false,
            _id: { $nin: archivedPostIds }, // Exclude archived posts
            userId: { $nin: blockedIds } // Exclude posts from blocked users
        })
            .populate({
                path: 'userId',
                select: 'username fullName profileImage'
            })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
    } catch (error) {
        throw new CustomError(
            error.message || "Failed to create post.",
            SERVER_ERROR,
            DATABASE_ERROR
        );
    }
}

/**
 * Fetches active posts of a user, excluding archived posts.
 *
 * @async
 * @function fetchActiveUserPosts
 * @param {string} userId - The ID of the user whose posts are to be fetched.
 * @param {Array<string>} archivedPostIds - An array of archived post IDs to exclude.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of active post objects.
 * @throws {CustomError} If a database error occurs.
 */
const fetchActiveUserPosts = async (userId, archivedPostIds) => {
    try {
        return (await Post.find({
            userId,
            _id: {
                $nin: archivedPostIds,
            }
        }).populate({
            path: 'userId',
            select: 'username fullName profileImage',
        }).lean());
    } catch (error) {
        throw new CustomError(
            error.message || "Failed to create post.",
            SERVER_ERROR,
            DATABASE_ERROR
        );
    }
}

/**
 * Removes a post from the database by its ID.
 *
 * @async
 * @function removePost
 * @param {string} postId - The ID of the post to be deleted.
 * @returns {Promise<Object|null>} The deleted post object if found and removed, otherwise `null`.
 *
 * @throws {CustomError} Throws an error if the deletion fails due to a database issue.
 */
const removePost = async (postId) => {
    try {
        return await Post.findByIdAndDelete(postId);
    } catch (error) {
        throw new CustomError(
            error.message || "Failed to create post.",
            SERVER_ERROR,
            DATABASE_ERROR
        );
    }
}

module.exports = {
    doesPostExist,
    getPostCount,
    createPost,
    fetchPosts,
    fetchActiveUserPosts,
    removePost,
}