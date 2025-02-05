const { HTTP_STATUS_CODE } = require("../../../../constants/httpStatus");
const { ResponseMessage } = require("../../../../constants/responseMessage");
const { postActionButton } = require("../../../utils/actionButtonUtils");
const { convertDateToMMYY } = require("../../../utils/dateUtils");
const { getCachedPostUrl } = require("../../../utils/redisUtils");
const { fetchAllPost, countPostsList, getPostData, unRestrictPost, restrictPost, boostPostById } = require("../services/adminPostServices");

/**
 * @function getPostList
 * @description Fetches posts based on search data, paginates results, and processes post details.
 * @param {Object} req - Express request object.
 * @param {Object} req.body - Request body containing search parameters.
 * @param {string} [req.body.searchData] - Search query for filtering posts by caption.
 * @param {number} [req.body.page=1] - Current page number (default is 1).
 * @param {number} [req.body.limit=3] - Number of posts per page (default is 3).
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next function for error handling.
 * @returns {Promise<void>} Sends a JSON response with paginated post data.
 * @throws {CustomError} Throws an error if the database query fails.
 */
const getPostsList = async (req, res, next) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const searchData = req.query.search ? req.query.search.trim().replace(/[^a-zA-Z\s]/g, "") : "";

    const filter = searchData
        ? { caption: { $regex: searchData, $options: "i" } }
        : {};

    try {
        const [posts, totalCount] = await Promise.all([
            fetchAllPost(filter, skip, limit),
            countPostsList(filter),
        ]);

        const totalPage = Math.ceil(totalCount / limit);

        const postList = await Promise.all(
            posts.map(async (post) => ({
                ...post,
                fileName: await getCachedPostUrl(post._id, post.fileName),
                uploadDate: convertDateToMMYY(post.uploadDate),
                actions: await postActionButton(post),
            }))
        )

        res.status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                postList,
                totalPage,
                currentPage: page,
                message: ResponseMessage.SUCCESS.OK,
                success: true,
            });

    } catch (error) {
        next(error);
    }
}

/**
 * @function getPostDetails
 * @description Fetches and returns the details of a specific post by its ID. It also includes post-related actions and file URLs.
 * @param {Object} req - The request object containing query parameters.
 * @param {Object} res - The response object used to send the result back to the client.
 * @param {Function} next - The next middleware function in case of an error.
 * @returns {Promise<void>} Responds with a success message and post data, or an error message if the post isn't found.
 * @throws {CustomError} Throws a custom error if an issue occurs during the database query or URL retrieval.
 */
const getPostDetails = async (req, res, next) => {
    const { postId } = req.query;
    try {
        const postData = await getPostData(postId);
        if (!postData) {
            return res
                .status(HTTP_STATUS_CODE.NOT_FOUND)
                .json({
                    success: false,
                    message: ResponseMessage.ERROR.NOT_FOUND,
                });
        }

        await Promise.all([
            postData.fileName = await getCachedPostUrl(postData._id, postData.fileName),
            postData.actions = await postActionButton(postData),
        ])

        res.status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.OK,
                postData,
            })

    } catch (error) {
        next(error);
    }
}

/**
 * @function togglePostRestriction
 * @description Toggles the restriction status of a post. If the post is restricted, it will be unrestricted, and if it is not restricted, it will be restricted.
 * @param {Object} req - The request object.
 * @param {Object} req.body - The request body containing the `postId` of the post to be toggled.
 * @param {string} req.body.postId - The ID of the post to be toggled.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function to handle errors.
 * @returns {Promise<void>} Sends a response indicating whether the post was updated successfully.
 * @throws {CustomError} Throws a custom error if an issue occurs during the database query or post update.
 */
const togglePostRestriction = async (req, res, next) => {
    const { postId } = req.body;
    try {
        const post = await getPostData(postId);
        if (post.isRestricted) {
            await unRestrictPost(postId);
        } else {
            await restrictPost(postId);
        }
        res.status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.UPDATED,
            });
    } catch (error) {
        next(error)
    }
}

/**
 * @function boostPost
 * @description Handles the request to boost a post by calling `boostPostById`.
 * @param {Object} req - The request object containing the `postId` in the body.
 * @param {Object} res - The response object used to send a success message if the post is boosted.
 * @param {Function} next - The next middleware function to handle errors.
 * @returns {Promise<void>} Sends a JSON response indicating success if the post is boosted.
 * @throws {CustomError} Passes any errors to the next middleware for error handling.
 */
const boostPost = async (req, res, next) => {
    const { postId } = req.body;
    try {
        await boostPostById(postId);
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
    getPostsList,
    getPostDetails,
    togglePostRestriction,
    boostPost,
}