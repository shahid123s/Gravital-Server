const { DATABASE_ERROR } = require('../../../constants/errorCodes');
const { SERVER_ERROR } = require('../../../constants/httpStatus').HTTP_STATUS_CODE;
const CustomError = require('../../utils/customError');
const Follow = require('./followsModel');

/**
 * Retrieves the count of followers for a given user.
 *
 * @param {string} userId - The ID of the user whose followers count is to be retrieved.
 * @returns {Promise<number>} - Returns the count of followers.
 * @throws {CustomError} - Throws an error if a database issue occurs.
 */
const getFollowersCount = async (userId) => {
    try {
        return await Follow.countDocuments({ following: userId });
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        )
    }
}

/**
 * Retrieves the count of users that a given user is following.
 *
 * @param {string} userId - The ID of the user whose followings count is to be retrieved.
 * @returns {Promise<number>} - Returns the count of followings.
 * @throws {CustomError} - Throws an error if a database issue occurs.
 */
const getFollowingsCount = async (userId) => {
    try {
        return await Follow.countDocuments({ follower: userId });
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        )
    }
}

/**
 * Checks if a user is followed by another user.
 *
 * @param {string} userId - The ID of the user performing the check.
 * @param {string} targetUserId - The ID of the user to check if they are followed.
 * @returns {Promise<boolean>} - Returns `true` if the user is followed, otherwise `false`.
 * @throws {CustomError} - Throws an error if a database issue occurs.
 */
const checkIsFollowed = async (userId, targetUserId) => {
    try {
        return !!(await Follow.exists({ follower: userId, following: targetUserId })) // This always return a boolean value 
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        )
    }
}

/**
 * Retrieves the follow relationship document ID between two users.
 * 
 * This function checks if a user is following another user by finding the 
 * follow document and returning its `_id` field.
 * 
 * @param {string} userId - The ID of the user who may be following the target user.
 * @param {string} targetUserId - The ID of the user who is being followed.
 * @returns {Promise<Object|null>} - The follow document containing the _id of the follow relationship, or null if no follow exists.
 * 
 * @throws {CustomError} - Throws a custom error if there is an issue querying the database.
 */
const getFollowDocumentId = async (userId, targetUserId) => {
    try {
        return await Follow.findOne({ follower: userId, following: targetUserId })
            .select('_id'); // Only returns the _id of the follow document
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        );
    }
};

/**
 * Creates a follow relationship between two users.
 * 
 * This function creates a new follow document where `userId` is following `targetUserId`.
 * It saves the relationship to the database.
 * 
 * @param {string} userId - The ID of the user who is following the target user.
 * @param {string} targetUserId - The ID of the user who is being followed.
 * @returns {Promise<Object>} - A Promise that resolves to the saved follow document.
 * 
 * @throws {CustomError} - Throws a custom error if there is an issue saving the follow relationship to the database.
 */
const createFollowRelationship = async (userId, targetUserId) => {
    try {
        const follow = new Follow({
            follower: userId,
            following: targetUserId,
        });
        return await follow.save()
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        );
    }
}

/**
 * Deletes a follow record by its document ID.
 * @param {string} id - The ID of the follow document to be deleted.
 * @returns {Promise<Object|null>} - The deleted follow document, or null if not found.
 * @throws {CustomError} - If a database error occurs.
 */
const removeFollow = async (id) => {
    try {
        return await Follow.findByIdAndDelete(id);
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        )
    }
}

/**
 * Fetches a list of users that the given user is following.
 *
 * @async
 * @function fetchFollowingList
 * @param {string} userId - The ID of the user whose following list needs to be fetched.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of user objects.
 * 
 * @throws {CustomError} Throws a CustomError if there is a database error.
 * 
 * @example
 * try {
 *     const followings = await fetchFollowingList("65c1234abcd5678efg910");
 *     console.log(followings);
 * } catch (error) {
 *     console.error(error.message);
 * }
 */
const fetchFollowingList = async (userId) => {
    try {
        return await Follow.find({follower: userId})
        .populate({
            path: 'following',
            select: 'fullName profileImage',
        })
        .sort({updatedAt: -1})
        .skip(0)
        .limit(12)
        .lean();
    } catch (error) {
        throw new CustomError(
            error.message ,
            SERVER_ERROR,
            DATABASE_ERROR
        );
    }
}

module.exports = {
    getFollowersCount,
    getFollowingsCount,
    checkIsFollowed,
    removeFollow,
    getFollowDocumentId,
    createFollowRelationship,
    fetchFollowingList,
}