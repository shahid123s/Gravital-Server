const { SERVER_ERROR } = require('../../../constants/httpStatus').HTTP_STATUS_CODE;
const { DATABASE_ERROR } = require('../../../constants/errorCodes')
const CustomError = require('../../utils/customError');
const Report = require('./reportModel');

/**
 * Creates a report for a user or a post.
 *
 * This function allows a user to report another user or a post.
 * It saves the report details in the database.
 *
 * @param {string} userId - The ID of the user who is submitting the report.
 * @param {string} reportedId - The ID of the user or post being reported.
 * @param {string} type - The type of report (e.g., "user", "post").
 * @param {string} message - The message or reason for the report.
 * @returns {Promise<Object>} - A Promise that resolves to the saved report document.
 *
 * @throws {CustomError} - Throws a custom error if the report cannot be saved to the database.
 */
const createReport = async (userId, reportedId, type, message) => {
    try {
        const report = new Report({
            reporterId: userId,
            reportedId,
            reportType: type,
            reportMessage: message,
        })
        return await report.save();
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        )
    }
}

/**
 * Removes all reports associated with a specific post.
 *
 * @async
 * @function removeReportedPosts
 * @param {string} postId - The ID of the post whose reports need to be removed.
 * @returns {Promise<Object>} The result of the delete operation.
 *
 * @throws {CustomError} Throws an error if the deletion fails due to a database issue.
 */
const removeReportedPosts = async (postId) => {
    try {
        return await Report.deleteMany({postId});
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        )
    }
}

module.exports = {
    createReport,
    removeReportedPosts,
}