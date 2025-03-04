const { HTTP_STATUS_CODE } = require("../../../constants/httpStatus");
const { ResponseMessage } = require("../../../constants/responseMessage");
const { getCachedProfileImageUrl } = require("../../utils/redisUtils");
const {
    removeFollow,
    getFollowDocumentId,
    createFollowRelationship,
    fetchFollowingList,
} = require('./followServices')

/**
 * Toggles the follow status between two users.
 *
 * - If the user is already following the target user, it removes the follow relationship.
 * - If the user is not following the target user, it creates a new follow relationship.
 *
 * @param {Object} req - Express request object.
 * @param {Object} req.user - The authenticated user data.
 * @param {string} req.user.userId - The ID of the user performing the follow/unfollow action.
 * @param {Object} req.body - The request body containing the target user ID.
 * @param {string} req.body.userId - The ID of the target user to follow/unfollow.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next function for error handling.
 * @returns {Promise<void>} - Sends a JSON response with success status.
 */
const toggleFollow = async (req, res, next) => {
    const { userId } = req.user;
    const { userId: targetUserId } = req.body;
    console.log(req.body, 'ivda')

    try {
        if (!targetUserId) {
            return res
                .status(HTTP_STATUS_CODE.BAD_REQUEST)
                .json({
                    success: false,
                    message: ResponseMessage.ERROR.BAD_REQUEST,
                });
        }

        const isExists = await getFollowDocumentId(userId, targetUserId);
        console.log(isExists) // ivda check cheyyanam
        if (isExists) {
            await removeFollow(isExists._id);
            return res
                .status(HTTP_STATUS_CODE.SUCCESS_OK)
                .json({
                    success: true,
                    message: ResponseMessage.SUCCESS.UPDATED,
                })
        }

        await createFollowRelationship(userId, targetUserId);
        res.status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.UPDATED,
            })

    } catch (error) {
        next(error)
    }
}

/**
 * Fetches the list of users that the current user is following, including cached profile images.
 *
 * @async
 * @function getFollowingList
 * @param {Object} req - Express request object, containing the authenticated user's ID.
 * @param {Object} res - Express response object, used to send the response.
 * @param {Function} next - Express next middleware function, used to handle errors.
 * @returns {Promise<void>} - Sends a JSON response with the following list.
 */
const getFollowingList = async (req, res, next) => {
    try {
        const { userId } = req.user;

        let followList = await fetchFollowingList(userId);


        followList = await Promise.all(followList.map(async (user) => {
            let profileImage = user.following.profileImage
            profileImage = await getCachedProfileImageUrl(user.following._id, profileImage);

            return {
                ...user,
                profileImage,
            }
        }));

        res.status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.OK,
                followList,
            })


    } catch (error) {
        next(error)
    }
}


module.exports = {
    toggleFollow,
    getFollowingList
}