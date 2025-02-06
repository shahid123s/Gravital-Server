const { HTTP_STATUS_CODE } = require("../../../../constants/httpStatus");
const { ResponseMessage } = require("../../../../constants/responseMessage");
const { reportActionButton } = require("../../../utils/actionButtonUtils");
const { toObjectId } = require("../../../utils/dbUtils");
const { getCachedPostUrl, getCachedProfileImageUrl } = require("../../../utils/redisUtils");
const { getReportList, getReportListCount, fetchReportDetails, updateReport } = require("../services/adminReportService");

/**
 * @function getAllReport
 * @description Retrieves a list of reports with pagination, filtering, and search functionality.
 * @param {Object} req - The request object containing query parameters for search, page, limit, and filter.
 * @param {Object} res - The response object for sending the result.
 * @param {Function} next - The next middleware function for error handling.
 * @returns {Promise<void>} Sends a response with the list of reports, total pages, and current page.
 * @throws {CustomError} Throws a `CustomError` in case of a database or server error.
 */
const getAllReport = async (req, res, next) => {
    const { search, page = 1, limit = 10, filter } = req.query;
    const skip = (page - 1) * limit;
    console.log(filter)
    const searchData = search?.trim()?.replace(/[^a-zA-Z\s]/g, "");
    const filterData = filter !== 'All'  ? filter.toLowerCase() :  null
    const filterStage = filterData ? { reportType: filterData } : {};

    const matchStage = searchData
        ? { reportMessage: { $regex: searchData, $options: "i" } }
        : {};

        
        try {
            const [reports, totalCount] = await Promise.all([
                getReportList({ ...filterStage, ...matchStage }, skip, limit),
                getReportListCount({...matchStage, ...filterStage} ),
            ]);

        const reportDetails = await Promise.all(
            reports.map(async (report) => {
                try {
                    if (report.details.fileName) {
                        report.details.fileName = await getCachedPostUrl(
                            report._id,
                            report.details.fileName
                        );
                    } else {
                        report.details.profileImage = await getCachedProfileImageUrl(
                            report._id,
                            report.details.profileImage
                        );
                    }
                    report.actions = await reportActionButton(report.status);
                    return report;
                } catch (error) {
                    next(error);
                }
            })
        );

        const filteredReports = reportDetails.filter((report) => report !== null);

        console.log(totalCount)

        const totalPage = totalCount.length > 0 ? Math.ceil(totalCount[0].totalCount / limit) : 1;

        res.status(HTTP_STATUS_CODE.SUCCESS_OK).json({
            reportDetails: filteredReports,
            totalPage,
            currentPage: page,
            message: ResponseMessage.SUCCESS.OK,
        });
    } catch (error) {
        next(error)
    }
}

/**
 * Retrieves report details for a given report ID.
 *
 * @async
 * @function getReportDetails
 * @param {Object} req - Express request object.
 * @param {Object} req.query - Query parameters from the request.
 * @param {string} req.query.reportId - The ID of the report to fetch details for.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 * @returns {Promise<void>} Sends a JSON response with:
 *  - `success` (boolean): Whether the request was successful.
 *  - `message` (string): Response message.
 *  - `reports` (Array): Array of report details, empty if no reports found.
 * 
 * @throws {Error} Calls `next(error)` for global error handling.
 * 
 * @example
 * // Example Request
 * GET /api/reports/details?reportId=60d5f9e8b3e4b814b56fa181
 * 
 * // Example Response
 * {
 *   "success": true,
 *   "message": "Request successful",
 *   "reports": [{ "_id": "60d5f9e8b3e4b814b56fa181", "reportMessage": "Spam content", ... }]
 * }
 */
const getReportDetails = async (req, res, next) => {
   try {
    const {reportId} = req.query;

    const id = await toObjectId(reportId);
    const reports = await fetchReportDetails(id) ;

    res.status(HTTP_STATUS_CODE.SUCCESS_OK)
    .json({
        success: true, 
        message: ResponseMessage.SUCCESS.OK,
        reports,
    })
   } catch (error) {
    next(error);
   }
}

/**
 * Updates the status of a report based on the provided report ID and action.
 *
 * @async
 * @function updateReportStatus
 * @param {Object} req - Express request object.
 * @param {Object} req.body - Request body containing the report ID and action.
 * @param {string} req.body.reportId - The unique ID of the report to be updated.
 * @param {string} req.body.action - The new status to set for the report.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next function to handle errors.
 * 
 * @returns {Promise<void>} Sends a JSON response indicating success or passes an error to the next middleware.
 *
 * @throws {CustomError} If a database error occurs during the update.
 * 
 * @example
 * // Example API request
 * fetch('/api/report/update', {
 *     method: 'POST',
 *     body: JSON.stringify({ reportId: '60d5f9e8b3e4b814b56fa181', action: 'resolved' }),
 *     headers: { 'Content-Type': 'application/json' }
 * })
 * .then(response => response.json())
 * .then(data => console.log(data));
 */
const updateReportStatus = async (req, res, next) => {
    const { reportId, action } = req.body;
    
    try {
        await updateReport(reportId, action);
    
    res.status(HTTP_STATUS_CODE.SUCCESS_OK)
    .json({
        success: true,
        message: ResponseMessage.SUCCESS.UPDATED
    })
    } catch (error) {
      next(error)  
    }
}

module.exports = {
    getAllReport,
    getReportDetails,
    updateReportStatus
}