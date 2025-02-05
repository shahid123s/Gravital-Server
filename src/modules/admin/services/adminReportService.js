const { SERVER_ERROR } = require('../../../../constants/httpStatus').HTTP_STATUS_CODE;
const { DATABASE_ERROR } = require('../../../../constants/errorCodes');
const CustomError = require('../../../utils/customError');
const Report = require('../../report/reportModel');

/**
 * @function getReportList
 * @description Retrieves a list of reports from the database based on the provided filter, with pagination, and aggregates relevant data from users and posts.
 * @param {Object} filter - The filter conditions to apply on the report data. Defaults to an empty object.
 * @param {number} skip - The number of documents to skip for pagination. Defaults to 0.
 * @param {number} limit - The number of documents to limit the result to. Defaults to 0 (no limit).
 * @returns {Promise<Array>} A promise that resolves to an array of reports, including user and post details.
 * @throws {CustomError} Throws a `CustomError` with a database error message if the query fails.
 */
const getReportList = async (filter = {}, skip = 0, limit = 0) => {
    try {
        return await Report.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: {
                        reportedId: "$reportedId",
                        type: "$reportType",
                    },
                    reportCount: { $sum: 1 },
                    createdAt: { $first: "$createdAt" },
                    status: { $first: "$status" },
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id.reportedId",
                    foreignField: "_id",
                    as: "reportedUserDetails",
                },
            },
            { $unwind: { path: "$reportedUserDetails", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "posts",
                    localField: "_id.reportedId",
                    foreignField: "_id",
                    as: "reportedPostDetails",
                },
            },
            { $unwind: { path: "$reportedPostDetails", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: "$_id.reportedId",
                    reportCount: 1,
                    type: "$_id.type",
                    status: 1,
                    details: {
                        $cond: {
                            if: { $eq: ["$_id.type", "post"] },
                            then: {
                                caption: "$reportedPostDetails.caption",
                                fileName: { $ifNull: ["$reportedPostDetails.fileName", null] },
                                uploadDate: "$reportedPostDetails.uploadDate",
                                status: { $ifNull: ["$reportedPostDetails.status", "unknown"] },
                                postId: "$reportedPostDetails._id",
                            },
                            else: {
                                username: "$reportedUserDetails.username",
                                email: "$reportedUserDetails.email",
                                profileImage: { $ifNull: ["$reportedUserDetails.profileImage", null] },
                                status: { $ifNull: ["$reportedUserDetails.status", "unknown"] },
                            },
                        },
                    },
                    createdAt: 1,
                },
            },
            { $skip: skip },
            { $limit: Number(limit) },
        ])
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR
        )
    }
}

/**
 * @function getReportListCount
 * @description Retrieves the count of reports based on the provided filter, grouped by `reportedId` and `postId`.
 * @param {Object} filter - The filter conditions to apply on the report data. Defaults to an empty object.
 * @returns {Promise<Array>} A promise that resolves to an array containing the total count of reports.
 * @throws {CustomError} Throws a `CustomError` with a database error message if the query fails.
 */
const getReportListCount = async (filter = {}) => {
    try {
        return await Report.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: { reportedId: "$reportedId", postId: "$postId" },
                },
            },
            { $count: "totalCount" },
        ]);
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR
        )
    }
}

/**
 * Fetches report details along with reporter's username.
 *
 * @async
 * @function fetchReportDetails
 * @param {string} reportId - The ID of the reported entity.
 * @returns {Promise<Array>} Resolves to an array of report details containing:
 *  - `_id`: Report ID
 *  - `username`: Username of the reporter
 *  - `status`: Current status of the report
 *  - `reportMessage`: Report message content
 * @throws {CustomError} Throws a `CustomError` in case of a database or server error.
 */
const fetchReportDetails = async (reportId) => {
    try {
        return await Report.aggregate([
            {
                $match: {
                    reportedId: reportId,
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'reporterId',
                    foreignField: '_id',
                    as: 'reporterDetails'
                },
            },
            {
                $unwind: {
                    path: '$reporterDetails',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    _id: 1,
                    username: '$reporterDetails.username',
                    status: 1,
                    reportMessage: 1,
                },
            },
        ]);
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR
        )
    }
}

/**
 * Updates the status of a report by its ID.
 *
 * @async
 * @function updateReport
 * @param {string} reportId - The unique ID of the report to be updated.
 * @param {string} action - The new status to set for the report (converted to lowercase).
 * @returns {Promise<Object|null>} The updated report document if successful, or `null` if not found.
 * 
 * @throws {CustomError} If a database error occurs during the update.
 * 
 * @example
 * // Example usage
 * const updatedReport = await updateReport("60d5f9e8b3e4b814b56fa181", "RESOLVED");
 * console.log(updatedReport);
 */
const updateReport = async (reportId, action) => {
    try {
        return await Report.findByIdAndUpdate(
            reportId,
            { status: action.toLowerCase() },
            { new: true }
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
    getReportList,
    getReportListCount,
    fetchReportDetails,
    updateReport,
}