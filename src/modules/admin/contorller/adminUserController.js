const { HTTP_STATUS_CODE } = require("../../../../constants/httpStatus");
const { ResponseMessage } = require("../../../../constants/responseMessage");
const { userActionButton } = require("../../../utils/actionButtonUtils");
const { getCachedProfileImageUrl } = require("../../../utils/redisUtils");
const { getUserById } = require("../../user/userService");
const { fetchAllUser, countUsersList, unbanUser, banUser, unblockUser, blockUser } = require("../services/adminUserServices");

/**
 * Fetches a paginated list of users based on a search query.
 *
 * @param {Object} req - The request object.
 * @param {Object} req.query - The query parameters from the request.
 * @param {string} [req.query.search] - The search term for filtering users (optional).
 * @param {string} req.query.page - The current page number for pagination.
 * @param {string} req.query.limit - The number of users per page.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 *
 * @returns {Promise<void>} Responds with a JSON object containing:
 * - `success` {boolean} - Indicates whether the operation was successful.
 * - `message` {string} - Response message.
 * - `userList` {Array<Object>} - List of users.
 * - `totalPage` {number} - Total number of pages.
 * - `currentPage` {number} - The current page number.
 *
 * @throws {Error} Passes the error to the `next` middleware for handling.
 */
const getUserList = async (req, res, next) => {
    const { search, page, limit } = req.query;
    const skip = (page - 1) * limit;
    const searchData = search.trim().replace(/[^a-zA-Z\s]/g, "");

    try {
        const [users, totalCount] = await Promise.all([
            fetchAllUser(searchData, skip, limit),
            countUsersList(searchData),
        ]);

        const totalPage = Math.ceil(totalCount / limit);

        const userList = await Promise.all(
            users.map(async (user) => {
                if (user.profileImage) {
                    user.profileImage = await getCachedProfileImageUrl(user._id, user.profileImage);
                }
                user.actions = userActionButton(user);
                return user;
            })
        );

        res.status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.OK,
                userList,
                totalPage,
                currentPage: page,

            })
    } catch (error) {
        next(error)
    }
}

/**
 * Toggles the ban status of a user (bans if currently unbanned, unbans if banned).
 *
 * @param {Object} req - The request object containing the userId in the body.
 * @param {Object} res - The response object for sending the response.
 * @param {Function} next - The next middleware function to handle errors.
 *
 * @returns {Object} - A JSON response with a success message and status code.
 *
 * @throws {CustomError} - If there is an issue with banning/unbanning or fetching user data.
 */
const toggleBan = async (req, res, next) => {
    const { userId } = req.body;
    try {
        const user = await getUserById(userId);
        if (!user) {
            return res.status(HTTP_STATUS_CODE.NOT_FOUND)
                .json({
                    success: false,
                    message: ResponseMessage.ERROR.NOT_FOUND
                });
        }
        if (user.isBan) {
            await unbanUser(userId)
        } else {
            await banUser(userId);
        }
        res.status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.UPDATED
            });
    } catch (error) {
        next(error)
    }
}

/**
 * Get the details of a specific user by their user ID.
 * 
 * This function retrieves the user details from the database, checks if the user exists,
 * processes their profile image URL (if available), adds user action buttons, and then 
 * returns the user information in the response.
 * 
 * @async
 * @function
 * @param {Object} req - The request object containing the user ID in the body.
 * @param {Object} req.body - The body of the request.
 * @param {string} req.body.userId - The ID of the user to fetch details for.
 * @param {Object} res - The response object used to send the result back to the client.
 * @param {function} next - The next middleware function.
 * @returns {void} - Sends a JSON response containing the user details or an error message.
 * 
 * @throws {CustomError} Throws a CustomError if any database or server errors occur during the process.
 */
const getUserDetails = async (req, res, next) => {
    const { userId } = req.query
    try {
        console.log(userId)
        const user = await getUserById(userId);
        if (!user) {

            return res.status(HTTP_STATUS_CODE.NOT_FOUND)
                .json({
                    success: false,
                    message: ResponseMessage.ERROR.NOT_FOUND
                })

        }

        if (user.profileImage) {
            user.profileImage = await getCachedProfileImageUrl(userId, user.profileImage);
        }

        user.actions = await userActionButton(user)

        res.status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.OK,
                user,
            })

    } catch (error) {
        next(error)
    }
}

/**
 * @function toggleBlock
 * @description Toggles the block status of a user (blocks if unblocked, unblocks if blocked).
 * @param {Object} req - The request object.
 * @param {Object} req.body - The request body.
 * @param {string} req.body.userId - The ID of the user to toggle block status.
 * @param {Object} res - The response object.
 * @param {Function} next - Express middleware function to handle errors.
 * @returns {Promise<void>} Sends a JSON response with success status and message.
 */
const toggleBlock = async (req, res, next) => {
    const {userId} = req.body;
    try {
        const user = await getUserById(userId);
        if (!user) {
            return res.status(HTTP_STATUS_CODE.NOT_FOUND)
                .json({
                    success: false,
                    message: ResponseMessage.ERROR.NOT_FOUND
                });
        }
        if(user.isBlock) {
            await unblockUser(userId);
        } else {
            await blockUser(userId);
        }

        res.status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.UPDATED
            });
    } catch (error) {
        next(error)
    }
}

module.exports = {
    getUserList,
    toggleBan,
    getUserDetails,
    toggleBlock

}