const User = require('../user/userModel')
const { DATABASE_ERROR } = require('../../../constants/errorCodes');
const { SERVER_ERROR } = require('../../../constants/httpStatus').HTTP_STATUS_CODE;
const CustomError = require('../../utils/customError');
const { email } = require('../../config/appConfig');
const { toObjectId } = require('../../utils/dbUtils');
const { username } = require('../../../Constants/predefinedUserDetails');
const mongoose = require('mongoose')
 
/**
 * Checks the user is exists with username in mongoDB
 * @param {string} username - username of the user 
 * @returns {Promise<object>} - A boolean or MongoDb ObjectId.
 */
const existsUserByUsername = async (username) => {
    try {
        return await User.exists({ username });
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        )
    }
}

/**
 * Checks if a user exists in the database by their ID.
 *
 * @param {string} userId - The MongoDB user ID to check.
 * @returns {Promise<boolean>} - Returns `true` if the user exists, otherwise `false`.
 * @throws {CustomError} - Throws an error if the database query fails.
 */
const doesUserExist = async (userId) => {
    try {
        return !!(await User.exists({ _id: userId }));
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        );
    }
};

/**
 * Checks the user is exists with email in mongoDB
 * @param {string} email - User email 
 * @returns {Promise<object>} - A boolean or MongoDb ObjectId.
 */
const existsUserByEmail = async (email) => {
    try {
        return await User.exists({ email });
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        )
    }
}

/**
 * Creates a new user in the database
 * @param {object} userData - The user data to be stored in the database (fullName, phoneNumber, email, dob, etc.)
 * @returns {Promise<object>} - The saved user object from the database
 * @throws {CustomError} - If an error occurs while saving the user to the database
 */
const createUser = async (userData) => {
    try {
        const user = new User({ ...userData });
        return await user.save();
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        )
    }
}

/**
 * Fetches user details by email, including password and role.
 * 
 * @param {string} email - The email of the user to retrieve.
 * @returns {Promise<object|null>} - Returns user object if found, otherwise null.
 * @throws {CustomError} - Throws a database error if retrieval fails.
 */
const getUserDetailsByEmailWithPassword = async (email) => {
    try {
        return await User.findOne({ email }).select('username isBlock password role');
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        );
    }
}

/**
 * Updates the user's password in the database.
 * 
 * @async
 * @function updateUserPassword
 * @param {string} email - The email of the user whose password needs to be updated.
 * @param {string} newPassword - The new password to set for the user.
 * 
 * @returns {Object|null} The updated user object if the password is successfully updated, null if no user is found.
 * 
 * @throws {CustomError} If there's an issue during the database operation.
 */
const updateUserPassword = async (email, newPassword) => {
    try {
        return await User.findOneAndUpdate(
            { email },
            { password: newPassword, },
            { new: true }
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
 * Fetches suggested users for a given user ID.
 * Excludes already followed and blocked users, sorts by post count.
 *
 * @param {string} userId - The ID of the current user.
 * @returns {Promise<Array>} - List of suggested users.
 */
const getSuggestedUsers = async (userId) => {
    try {
        const userIDObject = toObjectId(userId); // Convert string to ObjectId (use your utility function)
        if (!userIDObject) {
            throw new Error("Invalid User ID");
        }

        const response = await User.aggregate([
            // Lookup if the user is followed
            {
                $lookup: {
                    from: "follows",
                    localField: "_id",
                    foreignField: "following",
                    as: "isFollowed",
                },
            },
            {
                $addFields: {
                    isFollowedByUser: {
                        $in: [userIDObject, "$isFollowed.follower"],
                    },
                },
            },

            // Lookup if the user is blocked (both ways)
            {
                $lookup: {
                    from: "blocks",
                    let: { suggestedUserId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        { $and: [{ $eq: ["$blockerId", userIDObject] }, { $eq: ["$blockedId", "$$suggestedUserId"] }] },
                                        { $and: [{ $eq: ["$blockerId", "$$suggestedUserId"] }, { $eq: ["$blockedId", userIDObject] }] }
                                    ],
                                },
                            },
                        },
                    ],
                    as: "blockStatus",
                },
            },
            {
                $addFields: {
                    isBlocked: { $gt: [{ $size: "$blockStatus" }, 0] },
                },
            },

            // Lookup post count
            {
                $lookup: {
                    from: "posts",
                    localField: "_id",
                    foreignField: "userID",
                    as: "userPosts",
                },
            },
            {
                $addFields: {
                    postCount: { $size: "$userPosts" },
                },
            },

            // Filtering conditions
            {
                $match: {
                    isFollowedByUser: false,
                    isBlocked: false,
                    role: { $ne: "admin" },
                    _id: { $ne: userIDObject },
                },
            },

            // Project required fields
            {
                $project: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    profileImage: 1,
                    postCount: 1,
                },
            },

            // Sort and limit
            { $sort: { postCount: -1 } },
            { $limit: 4 },
        ]);

        return response; // Return the aggregated response

    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        );
    }
};

/**
 * Retrieves a user by their ID from the database.
 * Excludes sensitive fields like password, refreshToken, and role.
 *
 * @param {string} userId - The ID of the user to retrieve.
 * @returns {Promise<Object|null>} - Returns the user object if found, otherwise null.
 * @throws {CustomError} - Throws an error if the userId is invalid or a database error occurs.
 */
const getUserById = async (userId, forChecking = false) => {
    try {
        // Validate userId format
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new CustomError("Invalid user ID", HTTP_STATUS_CODE.BAD_REQUEST, ERROR_CODE.INVALID_INPUT);
        }

        const exculdeProperties = forChecking ? '-password ': '-password -refreshToken -role'

        // Query user without sensitive fields & use .lean() for performance
        const user = await User.findById(userId)
            .select('-password ')
            .lean();

        return user || null; // Return null if user not found
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        );
    }
};

/**
 * Retrieves a user by their username from the database.
 * Excludes sensitive fields like password, refreshToken, and role.
 *
 * @param {string} username - The username of the user to retrieve.
 * @returns {Promise<Object|null>} - Returns the user object if found, otherwise null.
 * @throws {CustomError} - Throws an error if a database error occurs.
 */
const getUserByUsername = async (username) => {
    try {
        return await User.findOne({ username })
            .select('-password -refreshToken -role')
            .lean();
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        );
    }
}

/**
 * Updates user details by user ID.
 * @param {string} userId - The ID of the user to update.
 * @param {object} updateFields - An object containing the fields to update.
 * @returns {Promise<Object>} - The updated user object.
 * @throws {CustomError} - Throws an error if the update fails.
 */
const updateUserDetailsById = async (userId, updateFields) => {
    try {
        return await User.findByIdAndUpdate(
            userId,
            updateFields,
            { new: true },
        );
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        );
    }
}

/**
 * Retrieves user information based on the username.
 * @param {string} username - The username of the user to retrieve.
 * @returns {Promise<Object|null>} - Returns user info including username, profile image, and createdAt date. Returns `null` if user is not found.
 * @throws {CustomError} - Throws an error if a database issue occurs.
 */
const getUserInfo = async (username) => {
    try {
        return await User.findOne({ username })
        .select('username createdAt profileImage')
        .lean();
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        )
    }
}

module.exports = {
    existsUserByUsername,
    existsUserByEmail,
    doesUserExist,
    createUser,
    getUserDetailsByEmailWithPassword,
    updateUserPassword,
    getSuggestedUsers,
    getUserById,
    getUserByUsername,
    updateUserDetailsById,
    getUserInfo
}  