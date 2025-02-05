const { SERVER_ERROR } = require('../../../../constants/httpStatus').HTTP_STATUS_CODE;
const {DATABASE_ERROR} = require('../../../../constants/errorCodes');
const CustomError = require('../../../utils/customError');
const User = require('../../user/userModel');

/**
 * Fetches all users (excluding admins) whose full name matches the given search query.
 * 
 * @param {string} [searchData=''] - The search query to filter users by full name.
 * @param {number} [skip=0] - The number of users to skip (for pagination).
 * @param {number} [limit=2] - The maximum number of users to return.
 * @returns {Promise<Array<Object>>} - A list of user objects (excluding password and refreshToken).
 * @throws {CustomError} - Throws a custom error if the database operation fails.
 */
 const fetchAllUser = async (searchData = '', skip = 0, limit = 2 , ) => {
    try {
        return await User.find({
            $and: [
                {fullName: { $regex: new RegExp(`^${searchData || '.*'}`, "i") }},
                {role: 'user'},
            ]
        }, ' -password -refreshToken').skip(skip).limit(limit).lean();
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR
        )
    }
 }

 /**
 * Counts the number of users (excluding admins) whose full name matches the given search query.
 *
 * @param {string} [searchData=''] - The search query to filter users by full name.
 * @returns {Promise<number>} - The count of matching users.
 * @throws {CustomError} - Throws a custom error if the database operation fails.
 */
 const countUsersList = async (searchData = '') => {
    try {
        return await User.countDocuments({
            $and: [
                { fullName: { $regex: new RegExp(`^${searchData || '.*'} `, "i") } },
                { role: 'user' }
            ]
        })
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR
        )
    }
 }

/**
 * Unbans a user by setting `isBan` to `false`.
 *
 * @param {string} userId - The ID of the user to be unbanned.
 * @returns {Promise<Object>} The updated user document.
 *
 * @throws {CustomError} Throws a database error if the operation fails.
 */
 const unbanUser = async (userId) => {
     try {
        return await User.findByIdAndUpdate(
            userId,
            {$set: { isBan: false,}},
            {new: true}
        );
     } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR
        )
     }
 }
/**
 * Bans a user by setting `isBan` to `true`.
 *
 * @param {string} userId - The ID of the user to be banned.
 * @returns {Promise<Object>} The updated user document.
 *
 * @throws {CustomError} Throws a database error if the operation fails.
 */
 const banUser = async (userId) => {
    try {
        return await User.findByIdAndUpdate(
            userId,
            {$set: {isBan: true}},
            {new: true}
        )
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR
        )
    }
 }

 /**
 * Blocks a user by setting the `isBlock` field to `true`.
 * 
 * @async
 * @function
 * @param {string} userId - The ID of the user to be blocked.
 * @returns {Promise<Object>} - The updated user document.
 * @throws {CustomError} - Throws an error if the operation fails.
 */
 const blockUser = async (userId) => {
    try {
        return await User.findByIdAndUpdate(
            userId,
            {$set: { isBlock: true}},
            {new: true}
        );
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR
        )
    }
 }

 /**
 * Unblocks a user by setting the `isBlock` field to `false`.
 * 
 * @async
 * @function
 * @param {string} userId - The ID of the user to be unblocked.
 * @returns {Promise<Object>} - The updated user document.
 * @throws {CustomError} - Throws an error if the operation fails.
 */
 const unblockUser = async (userId) => {
    try {
        return await User.findByIdAndUpdate(
            userId,
            {$set: { isBlock: false}},
            {new: true}
        );
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR
        )
    }
 }

 module.exports = {
    fetchAllUser,
    countUsersList,
    unbanUser,
    banUser,
    blockUser,
    unblockUser,
 }