const { HTTP_STATUS_CODE } = require("../../../constants/httpStatus");
const { ResponseMessage } = require("../../../constants/responseMessage");
const { createReport } = require("./reportServices");

/**
 * Handles reporting a user.
 *
 * This function allows a logged-in user to report another user. The report is saved in the database.
 *
 * @param {Object} req - Express request object.
 * @param {Object} req.body - The request body containing report details.
 * @param {string} req.body.userId - The ID of the user being reported.
 * @param {string} req.body.message - The message or reason for reporting.
 * @param {Object} req.user - The authenticated user object.
 * @param {string} req.user.userId - The ID of the user submitting the report.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next function for error handling.
 * @returns {Promise<void>} - Sends a success response if the report is created.
 */
const reportUser = async (req, res, next) => {
    const { userId: postId, message } = req.body;
    const { userId } = req.user;

    try {
        if (!postId || !message) {
            return res.status(HTTP_STATUS_CODE.BAD_REQUEST)
            .json({
                success: false,
                message: ResponseMessage.ERROR.NOT_FOUND
            });
        }

        await createReport(userId, postId, 'user', message);
        
        res.status(HTTP_STATUS_CODE.SUCCESS_OK)
        .json({
            success: true,
            message: ResponseMessage.SUCCESS.UPDATED,
        });
    } catch (error) {
        next(error);
    }
};

const reportPost = async (req, res, next) => {
    const { postId, message } = req.body;
    const { userId } = req.user;

    try {
        if (!postId || !message) {
            return res.status(HTTP_STATUS_CODE.BAD_REQUEST)
            .json({
                success: false,
                message: ResponseMessage.ERROR.NOT_FOUND
            });
        }

        await createReport(userId, postId, 'post', message);
        
        res.status(HTTP_STATUS_CODE.SUCCESS_OK)
        .json({
            success: true,
            message: ResponseMessage.SUCCESS.UPDATED,
        });
    } catch (error) {
        next(error);
    }
}
module.exports = {
    reportUser,
    reportPost
}