const { HTTP_STATUS_CODE } = require("../../../constants/httpStatus");
const { ResponseMessage } = require("../../../constants/responseMessage");
const appConfig = require("../../config/appConfig");
const { uploadFileToS3 } = require("../../utils/aswS3Utils");
const { getCachedPostUrl, getCachedProfileImageUrl } = require("../../utils/redisUtils");
const { getArchivedPostIds, deleteArchive } = require("../archive/archiveServices");
const { getBlockedUsersByCurrentUser, getUsersWhoBlockedCurrentUser, checkUserIsBlocked } = require("../block/blockServices");
const { checkUserIsLikedThePost, getLikedCountofPost, removeLikedPosts } = require("../like/likeServices");
const { removeReportedPosts } = require("../report/reportServices");
const { checkUserIsSavedThePost, removeSavedPosts } = require("../savedPost/savedPostServices");
const { existsUserByUsername } = require("../user/userService");
const { createPost, fetchPosts, fetchActiveUserPosts, removePost, fetchTrendingPosts, addShareInteraction, doesPostExist, fetchPostById } = require("./postServices");
const { enrichPosts, enrichPost } = require("./utils/postUtils");


/**
 * Handles the addition of a new post by uploading a file to S3 and saving post details.
 *
 * @param {Object} req - The request object containing user details and uploaded file.
 * @param {Object} res - The response object used to send back the HTTP response.
 * @param {Function} next - The next middleware function for error handling.
 * @returns {Promise<void>} - Returns a success response if the post is created.
 * @throws {CustomError} - Throws an error if file upload or post creation fails.
 */
const addPost = async (req, res, next) => {
    const { userId } = req.user;
    const { caption } = req.body;
    const file = req.file;

    try {
        if (!file) {
            return res.status(HTTP_STATUS_CODE.BAD_REQUEST).json({
                success: false,
                message: ResponseMessage.ERROR.BAD_REQUEST,
            });
        }
        const fileKey = await uploadFileToS3(file, userId, true);

        await createPost(userId, fileKey, caption);

        res.status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.OK,
            })
    } catch (error) {
        next(error);
    }
}

/**
 * Retrieves all posts while filtering out archived posts and posts from blocked users.
 *
 * @param {Object} req - The request object containing user information.
 * @param {Object} req.user - The authenticated user making the request.
 * @param {string} req.user.userId - The ID of the current user.
 * @param {Object} req.body - The request body containing pagination details.
 * @param {number} req.body.page - The page number for pagination.
 * @param {Object} res - The response object used to send the response.
 * @param {Function} next - The next middleware function to handle errors.
 *
 * @returns {Promise<void>} - Sends a JSON response containing the filtered posts.
 *
 * @throws {CustomError} - Throws an error if there's an issue retrieving posts.
 */
const getAllPosts = async (req, res, next) => {
    const limit = 3;
    const { userId } = req.user;
    const { page } = req.query;

    try {
        const [archivedPostIds, blockedByUsers, blockedUsers] = await Promise.all([
            getArchivedPostIds(),
            getUsersWhoBlockedCurrentUser(userId),
            getBlockedUsersByCurrentUser(userId),
        ]);

        const blockedIds = [...blockedByUsers, ...blockedUsers];
        const response = await fetchPosts(archivedPostIds, blockedIds, page, limit);

        posts = await enrichPosts(response, userId);

        res.status(HTTP_STATUS_CODE.SUCCESS_OK)
            .json({
                success: true,
                message: ResponseMessage.SUCCESS.OK,
                posts,
                hasMore: posts.length === limit,
            })

    } catch (error) {
        next(error)
    }
}
/**
 * Fetches and enriches posts for the authenticated user or a specified user by username.
 * It handles the case when the user has archived posts and blocked users.
 * 
 * @async
 * @function getUsersPost
 * @param {Object} req - The request object, containing user and query data.
 * @param {Object} res - The response object, used to send the result.
 * @param {Function} next - The next middleware function in the stack.
 * @returns {Promise<void>} A response with the enriched posts or an error message.
 * 
 * @throws {Error} If there is an issue with fetching posts or enriching the data.
 */
const getUsersPost = async (req, res, next) => {
    const { userId } = req.user;
    const { username } = req.query;

    try {
        let posts = [];

        if (!username) {
            const archivedPostIds = await getArchivedPostIds(userId);
            posts = await fetchActiveUserPosts(userId, archivedPostIds);
        } else {
            const user = await existsUserByUsername(username);
            if (!user) {
                return res
                    .status(HTTP_STATUS_CODE.NOT_FOUND)
                    .json({
                        success: false,
                        message: ResponseMessage.ERROR.NOT_FOUND,
                    });
            }

            if (await checkUserIsBlocked(user._id, userId)) {
                return res
                    .status(HTTP_STATUS_CODE.SUCCESS_OK)
                    .json({
                        success: true,
                        message: ResponseMessage.SUCCESS.OK,
                        posts: [],
                    });
            }

            const archivedPostIds = await getArchivedPostIds(user._id);
            posts = await fetchActiveUserPosts(user._id, archivedPostIds);
        }

        posts = await enrichPosts(posts, userId);

        return res.status(HTTP_STATUS_CODE.SUCCESS_OK).json({
            success: true,
            message: ResponseMessage.SUCCESS.OK,
            posts,
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Deletes a post and removes all associated data (archives, likes, saves, and reports).
 *
 * @async
 * @function deletePost
 * @param {Object} req - Express request object.
 * @param {Object} req.body - The request body.
 * @param {string} req.body.postId - The ID of the post to be deleted.
 * @param {Object} req.user - The authenticated user object.
 * @param {string} req.user.userId - The ID of the user making the request.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next function for error handling.
 * @returns {Promise<void>} Responds with success message upon successful deletion.
 *
 * @throws {CustomError} Throws an error if the deletion process fails.
 */
const deletePost = async(req, res, next) => {
    const {postId} = req.body;
    const {userId} = req.user;
try {
    
    await Promise.all([
        removePost(postId),
        deleteArchive(postId, userId),
        removeLikedPosts(postId),
        removeSavedPosts(postId),
        removeReportedPosts(postId),
    ])
    res.status(HTTP_STATUS_CODE.SUCCESS_OK)
    .json({
        success: true,
        message: ResponseMessage.SUCCESS.UPDATED,
    })
} catch (error) {
    next(error)
}
}


const getTrendingPosts = async (req, res, next) =>{
    const limit = 3;
    const {userId} = req.user;
    const {page} = req.query;

    const response = await fetchTrendingPosts();

    console.log(response, 'response');

    const posts = await enrichPosts(response, userId);

    res.status(HTTP_STATUS_CODE.SUCCESS_OK)
    .json({
        success: true,
        message: ResponseMessage.SUCCESS.OK,
        posts,
    })
}

const sharePost = async (req, res, next) => {
    const {postId} = req.body;
    const {userId} = req.user;
     try {
        await addShareInteraction(userId, postId);
        return res.status(HTTP_STATUS_CODE.SUCCESS_OK).json({
            success: true,
            message: ResponseMessage.SUCCESS.OK,
            data: `${appConfig.cors.origin}/post/${postId}`
        });
    } catch (error) {
        next(error)
    }
}


const getPost = async (req, res, next) => {
    const {postId} = req.query;
    const {userId} = req.user;
    try {

        let post = await doesPostExist(postId, true);
        console.log(post)
        if(!post) return res.status(HTTP_STATUS_CODE.NOT_FOUND).json({
            success: false,
            message: ResponseMessage.ERROR.NOT_FOUND,
        });
        
        post = await fetchPostById(postId);
        // console.log(post, 'post look 1 ');
        post =await enrichPost(post, userId)

        console.log(post, 'post look');

        res.status(HTTP_STATUS_CODE.SUCCESS_OK).json({
            success: true,
            message: ResponseMessage.SUCCESS.OK,
            post
        })
    } catch (error) {
        next(error)
    }
}

module.exports = {
    addPost,
    getAllPosts,
    getUsersPost,
    deletePost,
    getTrendingPosts,
    sharePost,
    getPost,
}