const { response } = require("express");
const { getCachedProfileImageUrl } = require("../../utils/redisUtils");
const { HTTP_STATUS_CODE } = require("../../../constants/httpStatus");
const { ResponseMessage } = require("../../../constants/responseMessage");
const { convertDateToMMYY } = require('../../utils/dateUtils');
const { getPostCount } = require('../post/postServices')
const { getArchivePostCount } = require('../archive/archiveServices');
const { checkUserIsBlocked } = require("../block/blockServices");
const PreDefinedUserDetails = require("../../../constants/predefinedUserDetails");
const { uploadFileToS3 } = require("../../utils/aswS3Utils");
const {
    getSuggestedUsers,
    getUserById,
    getUserByUsername,
    updateUserDetailsById,
    getUserInfo,
    getUsersByUsername,
    getUserEmailById,
    updateUserPassword,
} = require("./userService");
const {
    getFollowersCount,
    getFollowingsCount,
    checkIsFollowed
} = require('../follows/followServices');
const { checkIsRestricted } = require("../restriction/restrictionServices");
const { comparePassword } = require("../auth/authService");

/**
 * Controller to get a list of suggested users for the logged-in user.
 * Excludes users who are already followed or blocked.
 * Fetches and caches profile images before sending the response.
 *
 * @param {Object} req - Express request object.
 * @param {Object} req.user - User object extracted from authentication middleware.
 * @param {string} req.user.userId - The ID of the currently logged-in user.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 * @returns {Promise<void>} - Sends a JSON response with a list of suggested users.
 */
const suggestUsers = async (req, res, next) => {
    const { userId } = req.user;
    try {
        const suggestion = await getSuggestedUsers(userId);
        console.log(suggestion, userId, 'look now new here ')
        const usersList = await Promise.all(
            suggestion.map(async (user) => {
                user.profileImage = await getCachedProfileImageUrl(
                    user._id,
                    user.profileImage,
                );
                return user;
            })
        );

        res.status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                usersList,
                message: ResponseMessage.SUCCESS.OK,
            });
    } catch (error) {
        next(error)
    }

}

/**
 * Fetches user details, including followers count, following count, post count, and archive count.
 * If a username is provided, it fetches the corresponding user; otherwise, it fetches details for the authenticated user.
 * 
 * @param {Object} req - Express request object containing `userId` in `req.user` and optional `username` in `req.query`.
 * @param {Object} res - Express response object for sending JSON responses.
 * @param {Function} next - Express middleware next function.
 * @returns {Promise<void>} - Sends a JSON response with user details.
 */
const userDetails = async (req, res, next) => {
    const { userId } = req.user;
    const { username } = req.query;

    let user;
    let followersCount = 0;
    let followingCount = 0;
    let isFollowed = false;
    let postCount = 0;
    let archivePostCount = 0;

    if (!username) {
        [user, followersCount, followingCount, postCount, archivePostCount] = await Promise.all([
            getUserById(userId),
            getFollowersCount(userId),
            getFollowingsCount(userId),
            getPostCount(userId),
            getArchivePostCount(userId),
        ]);
    } else {
        console.log('ivda ana ')
        user = await getUserByUsername(username);

        if (!user) {
            return res.status(HTTP_STATUS_CODE.NOT_FOUND)
                .json({
                    success: false,
                    message: ResponseMessage.ERROR.NOT_FOUND,
                });
        }

        const isBlock = await checkUserIsBlocked(userId, user._id);
        if (isBlock) {
            return res.status(HTTP_STATUS_CODE.SUCCESS_OK)
                .json({
                    success: true,
                    user: PreDefinedUserDetails,
                    message: ResponseMessage.SUCCESS.OK,
                });
        };

        [followersCount, followingCount, isFollowed, postCount, archivePostCount] = await Promise.all([
            getFollowersCount(user._id),
            getFollowingsCount(user._id),
            checkIsFollowed(userId, user._id),
            getPostCount(user._id),
            getArchivePostCount(user._id),
        ])
        console.log(user)

        console.log('varunilla')

    };
    if (user && user.profileImage) {

        const profileImage = await getCachedProfileImageUrl(user._id, user.profileImage);

        console.log('varuna')

        return res.status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                user: {
                    ...user,
                    profileImage,
                    postCount: postCount - archivePostCount,
                    followersCount,
                    followingCount,
                    isFollowed,
                },
                success: true,
                message: ResponseMessage.SUCCESS.OK,
            });
    };

    res.status(HTTP_STATUS_CODE.SUCCESS_OK)
        .json({
            user: {
                ...user,
                postCount: postCount - archivePostCount,
                followersCount,
                followingCount,
                isFollowed,
            },
            success: true,
            message: ResponseMessage.SUCCESS.OK,
        });


}

/**
 * Updates the user's profile details, including bio, gender, and profile image.
 * @param {Object} req - Express request object containing user data and file.
 * @param {Object} req.user - The authenticated user object.
 * @param {string} req.user.userId - The ID of the authenticated user.
 * @param {Object} req.body - The request body containing the profile update fields.
 * @param {string} [req.body.bio] - The new bio for the user (optional).
 * @param {string} [req.body.gender] - The new gender for the user (optional).
 * @param {Object} [req.file] - The uploaded profile image file (optional).
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 * @returns {Promise<void>} - Responds with success or passes an error to the next middleware.
 */
const updateProfile = async (req, res, next) => {
    const { userId } = req.user;
    const { bio, gender } = req.body;
    const file = req.file;

    try {
        const filekey = file ? await uploadFileToS3(file, userId, false) : null;
        const updateFields = { bio, gender };
        if (filekey) updateFields.profileImage = filekey
        await updateUserDetailsById(userId, updateFields);

        res.status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.UPDATED
            })
    } catch (error) {
        next(error)
    }
}

/**
 * Retrieves and processes the profile information of a user.
 * @param {object} req - The request object containing the query parameters.
 * @param {object} res - The response object to send the processed data.
 * @param {Function} next - The next middleware function to handle errors.
 * @returns {void} - Sends the user data as a response or passes error to the next middleware.
 * @throws {CustomError} - Throws an error if the user retrieval or image processing fails.
 */
const aboutProfile = async (req, res, next) => {
    const { username } = req.query;

    try {
        const user = await getUserInfo(username);
        user.createdAt = convertDateToMMYY(user.createdAt);
        user.profileImage = await getCachedProfileImageUrl(user.profileImage);

        res.status(HTTP_STATUS_CODE.SUCCESS_OK).json({
            success: true,
            message: ResponseMessage.SUCCESS.UPDATED,
            user
        });
    } catch (error) {
        next(error)
    }

}

/**
 * Retrieves the restriction and block status of a target user relative to the requesting user.
 *
 * @param {Object} req - Express request object.
 * @param {Object} req.query - Query parameters from the request.
 * @param {string} req.query.userId - The ID of the target user whose status is being checked.
 * @param {Object} req.user - Authenticated user object.
 * @param {string} req.user.userId - The ID of the authenticated user making the request.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 *
 * @returns {Promise<void>} - Responds with a JSON object containing restriction and block status.
 * @throws {Error} - Passes errors to the next middleware.
 */
const userStatus = async (req, res, next) => {
    const { userId: targetUserId } = req.query;
    const { userId } = req.user;

    try {
        const [isRestricted, isBlocked] = await Promise.all([
            checkIsRestricted(userId, targetUserId),
            checkUserIsBlocked(userId, targetUserId),
        ]);

        res.status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.OK,
                isRestricted,
                isBlocked,
            })

    } catch (error) {
        next(error)
    }
}


const searchUsers = async (req, res, next) => {
    const { username } = req.query;
    const { userId } = req.user;

    try {
        if (!username) return res.status(HTTP_STATUS_CODE.BAD_REQUEST)
        const usersList = await getUsersByUsername(username, userId);
        const modifiedUsersList = await Promise.all(
            usersList.map(async (user) => {
                user.profileImage = await getCachedProfileImageUrl(user._id, user.profileImage);
                return user;
            })
        );
        res.status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.OK,
                usersList: modifiedUsersList,
            });
    } catch (error) {
        next(error)
    }
}

const changePassword = async (req, res, next) => {
    const { userId } = req.user;
    const { currentPassword, newPassword } = req.body;

    try {
        const user = await getUserEmailandPasswordById(userId);
        console.log(user)

        if (!user) {
            return res.status(HTTP_STATUS_CODE.NOT_FOUND)
                .json({
                    success: false,
                    message: ResponseMessage.ERROR.NOT_FOUND,
                });
        }

        const isMatch = await comparePassword(currentPassword, user.password);
        if (!isMatch) {
            return res.status(HTTP_STATUS_CODE.UNAUTHORIZED)
                .json({
                    success: false,
                    message: ResponseMessage.ERROR.INVALID_PASSWORD,
                });
        }

        await updateUserPassword(user.email, newPassword);
        res.status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.UPDATED,
            });

    } catch (error) {
        next(error)
    }
}

module.exports = {
    suggestUsers,
    userDetails,
    updateProfile,
    aboutProfile,
    userStatus,
    searchUsers,
    changePassword,
    
}