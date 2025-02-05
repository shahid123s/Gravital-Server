const CustomError = require('../../../utils/customError');
const { SERVER_ERROR } = require('../../../../constants/httpStatus').HTTP_STATUS_CODE;
const {DATABASE_ERROR} = require('../../../../constants/errorCodes');
const Post = require('../../post/postModel');

/**
 * @function fetchALLPost
 * @description Fetches posts from the database with optional filtering, pagination, and population of user details.
 * @param {Object} [filter={}] - The filter object to apply query conditions (e.g., { category: "tech" }).
 * @param {number} [skip=0] - The number of documents to skip (used for pagination).
 * @param {number} [limit=3] - The maximum number of posts to return.
 * @returns {Promise<Array>} Returns an array of posts with populated user details.
 * @throws {CustomError} Throws a database error if the query fails.
 */
const fetchAllPost = async (filter = {}, skip = 0, limit = 3 ) => {
    try {
        return await Post.find(filter)
        .populate({
            path: 'userId',
            select: 'username fullName profileImage',
        })
        .skip(skip)
        .limit(limit)
        .lean();
    } catch (error) {
        
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        )
        
    }
}

/**
 * @function countPostsList
 * @description Counts the number of posts in the database based on the given filter.
 * @param {Object} [filter={}] - The filter object to apply query conditions (e.g., { category: "tech" }).
 * @returns {Promise<number>} Resolves with the count of posts matching the filter.
 * @throws {CustomError} Throws a database error if the query fails.
 */
const countPostsList = async(filter = {}) => {
    try {
        return await Post.countDocuments(filter)
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        )
    }
}

/**
 * @function getPostData
 * @description Fetches a single post's data by its ID, including user details (username and full name).
 * @param {string} postId - The ID of the post to fetch.
 * @returns {Promise<Object>} Returns the post data along with the user details (username and fullName).
 * @throws {CustomError} Throws a custom error if the post is not found or database query fails.
 */
const getPostData = async (postId) => {
    try {
        return await Post.findById(postId)
        .populate({
            path: 'userId',
            select: 'username fullName',
        })
        .lean();
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        )
    }
}

/**
 * @function restrictPost
 * @description Sets the `isRestricted` field of a post to `true`, restricting the post.
 * @param {string} postId - The ID of the post to be restricted.
 * @returns {Promise<Object>} The updated post object with the `isRestricted` field set to `true`.
 * @throws {CustomError} Throws a custom error if an issue occurs during the database query.
 */
const restrictPost = async (postId) => {
    try {
        return await Post.findByIdAndUpdate(
            postId,
            {$set: {isRestricted: true}},
            {new: true},
        );
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        )
    }
}

/**
 * @function unRestrictPost
 * @description Sets the `isRestricted` field of a post to `false`, unrestricting the post.
 * @param {string} postId - The ID of the post to be unrestricted.
 * @returns {Promise<Object>} The updated post object with the `isRestricted` field set to `false`.
 * @throws {CustomError} Throws a custom error if an issue occurs during the database query.
 */
const unRestrictPost = async (postId) => {
    try {
        return await Post.findByIdAndUpdate(
            postId,
            {$set: {isRestricted: false}},
            {new: true},
        );
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        )
    }
}

/**
 * @function boostPostById
 * @description Boosts a post by setting its `isPostBoost` field to `true`.
 * @param {string} postId - The ID of the post to be boosted.
 * @returns {Promise<Object>} The updated post object with the `isPostBoost` field set to `true`.
 * @throws {CustomError} Throws a custom error if the database update operation fails.
 */
const boostPostById = async (postId)  => {
    try {
        return await Post.findByIdAndUpdate(
            postId,
            {$set: {isPostBoost: true}},
            {new: true},
        );
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        )
    }
}


module.exports = {
    fetchAllPost,
    countPostsList,
    getPostData,
    restrictPost,
    unRestrictPost,
    boostPostById,
}