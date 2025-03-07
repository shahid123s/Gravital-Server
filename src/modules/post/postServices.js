const { DATABASE_ERROR, ACCESS_DENIED } = require('../../../constants/errorCodes');
const { _id } = require('../../../Constants/predefinedUserDetails');
const { SERVER_ERROR, BAD_REQUEST } = require('../../../constants/httpStatus').HTTP_STATUS_CODE;
const CustomError = require('../../utils/customError');
const Post = require('./postModel');

/**
 * Checks if a post exists in the database. Optionally, returns the `userId` of the post owner.
 *
 * @async
 * @function doesPostExist
 * @param {string} id - The ID of the post to check.
 * @param {boolean} [returnUserID=false] - If `true`, returns the `userId` of the post owner.
 * @returns {Promise<boolean|Object|null>} 
 * - If `returnUserID` is `false`, returns `true` if the post exists, otherwise `false`.
 * - If `returnUserID` is `true`, returns an object `{ userId: <userId> }` if the post exists, otherwise `null`.
 * 
 * @throws {CustomError} Throws a database error if the operation fails.
 */
const doesPostExist = async (id, returnUserID = false) => {
    try {
        if (returnUserID) {
            return await Post.findOne({ _id: id }).select('userId').lean();
        }
        return !!(await Post.exists({ _id: id }));
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        );
    }
};


/**
 * Retrieves the total count of posts for a given user.
 *
 * @param {string} userId - The ID of the user whose post count is to be retrieved.
 * @returns {Promise<number>} - Returns the count of posts created by the user.
 * @throws {CustomError} - Throws an error if a database issue occurs.
 */
const getPostCount = async (userId) => {
    try {
        return await Post.countDocuments({ userId });
    } catch (error) {
        throw new CustomError(
            error.message,
            SERVER_ERROR,
            DATABASE_ERROR,
        )
    }
}

/**
 * Creates a new post in the database.
 *
 * @param {string} userId - The ID of the user creating the post.
 * @param {string} fileName - The name of the file (image/video) associated with the post.
 * @param {string} caption - The caption for the post.
 * @returns {Promise<Object>} - Returns the created post object.
 * @throws {CustomError} - Throws an error if post creation fails.
 */
const createPost = async (userId, fileName, caption) => {
    try {
        // Validate input
        if (!userId || !fileName) {
            throw new CustomError(
                "User ID and file name are required.",
                SERVER_ERROR,
                DATABASE_ERROR
            );
        }

        // Create and save post
        const post = new Post({ userId, caption, fileName });
        return await post.save();

    } catch (error) {
        throw new CustomError(
            error.message || "Failed to create post.",
            SERVER_ERROR,
            DATABASE_ERROR
        );
    }
};

/**
 * Fetches posts while excluding archived posts and posts from blocked users.
 *
 * @async
 * @function fetchPosts
 * @param {Array<string>} archivedPostIds - An array of post IDs that are archived.
 * @param {Array<string>} blockedIds - An array of user IDs that are blocked or have blocked the current user.
 * @param {number} page - The page number for pagination.
 * @param {number} limit - The number of posts to fetch per page.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of post objects.
 * @throws {CustomError} If there is a database error.
 */
const fetchPosts = async (archivedPostIds, blockedIds, page, limit) => {
    try {
        return await Post.find({
            isRestricted: false,
            _id: { $nin: archivedPostIds }, // Exclude archived posts
            userId: { $nin: blockedIds } // Exclude posts from blocked users
        })
            .populate({
                path: 'userId',
                select: 'username fullName profileImage'
            })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
    } catch (error) {
        throw new CustomError(
            error.message || "Failed to create post.",
            SERVER_ERROR,
            DATABASE_ERROR
        );
    }
}

/**
 * Fetches active posts of a user, excluding archived posts.
 *
 * @async
 * @function fetchActiveUserPosts
 * @param {string} userId - The ID of the user whose posts are to be fetched.
 * @param {Array<string>} archivedPostIds - An array of archived post IDs to exclude.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of active post objects.
 * @throws {CustomError} If a database error occurs.
 */
const fetchActiveUserPosts = async (userId, archivedPostIds) => {
    try {
        return (await Post.find({
            userId,
            _id: {
                $nin: archivedPostIds,
            }
        }).populate({
            path: 'userId',
            select: 'username fullName profileImage',
        }).lean());
    } catch (error) {
        throw new CustomError(
            error.message || "Failed to create post.",
            SERVER_ERROR,
            DATABASE_ERROR
        );
    }
}

/**
 * Removes a post from the database by its ID.
 *
 * @async
 * @function removePost
 * @param {string} postId - The ID of the post to be deleted.
 * @returns {Promise<Object|null>} The deleted post object if found and removed, otherwise `null`.
 *
 * @throws {CustomError} Throws an error if the deletion fails due to a database issue.
 */
const removePost = async (postId) => {
    try {
        return await Post.findByIdAndDelete(postId);
    } catch (error) {
        throw new CustomError(
            error.message || "Failed to create post.",
            SERVER_ERROR,
            DATABASE_ERROR
        );
    }
}


const fetchTrendingPosts = async (archivedPostIds, blockedIds, page, limit) => {
    try {
        return await Post.aggregate([
            // Step 1: Lookup Likes Collection
            {
                $lookup: {
                    from: "likes",
                    localField: "_id",
                    foreignField: "postId",
                    as: "likes"
                }
            },
            {
                $addFields: {
                    likesCount: { $size: "$likes" }
                }
            },

            // Step 2: Lookup Comments Collection
            {
                $lookup: {
                    from: "comments",
                    localField: "_id",
                    foreignField: "postId",
                    as: "comments"
                }
            },
            {
                $addFields: {
                    commentsCount: { $size: "$comments" }
                }
            },

            // Step 3: Lookup Saves Collection
            {
                $lookup: {
                    from: "saves",
                    localField: "_id",
                    foreignField: "postId",
                    as: "saves"
                }
            },
            {
                $addFields: {
                    savesCount: { $size: "$saves" }
                }
            },

            // Step 4: Calculate Total Interaction Score
            {
                $addFields: {
                    interactionScore: {
                        $add: [
                            { $multiply: ["$likesCount", 2] },
                            { $multiply: ["$commentsCount", 3] },
                            { $multiply: ["$savesCount", 1] },
                            { $multiply: ["$shareCount", 5] }
                        ]
                    }
                }
            },

            // Step 5: Lookup User Details and Restructure as userId Object
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "userDetails"
                }
            },
            {
                $unwind: "$userDetails"
            },

            // Step 6: Modify User Details to Follow Required Structure
            {
                $addFields: {
                    userId: {
                        _id: "$userDetails._id",
                        username: "$userDetails.username",
                        fullName: "$userDetails.fullName",
                        profileImage: {
                            $concat: [
                                "https://gravital-profile-photo.s3.ap-south-1.amazonaws.com/",
                                "$userDetails.profileImage"
                            ]
                        }
                    }
                }
            },

            // Step 7: Sort Posts by Interaction Score
            { $sort: { interactionScore: -1 } },

            // Step 8: Limit Results
            { $limit: 10 },

            // Step 9: Project Required Fields
            {
                $project: {
                    _id: 1,
                    fileName: 1,
                    uploadedDate: 1,
                    isRestricted: 1,
                    isPostBoost: 1,
                    caption: 1,
                    createdAt: 1,
                    interactionScore: 1,
                    likesCount: 1,
                    commentsCount: 1,
                    savesCount: 1,
                    shareCount: 1,
                    userId: 1 // Includes structured user details
                }
            }
        ]);


    } catch (error) {
        throw new CustomError(
            error.message || "Failed to create post.",
            SERVER_ERROR,
            DATABASE_ERROR
        );
    }
}

const addShareInteraction = async (userId, postId) => {
    try {
        const post = await Post.findById(postId);
        if (!post) throw new CustomError(
            'Invalid Crendtials',
            BAD_REQUEST,
            ACCESS_DENIED,
        )

        return await Post.findByIdAndUpdate(
            postId,
            { $inc: { shareCount: 1 } },
            { new: true }
        );
    } catch (error) {
        throw new CustomError(
            error.message || "Failed to create post.",
            SERVER_ERROR,
            DATABASE_ERRO
        );
    }
}

const fetchPostById = async (postId) => {
    try {
        return await Post
            .findById(postId)
            .populate({
                path: 'userId',
                select: 'username fullName profileImage'
            })
            .lean();
    } catch (error) {
        throw new CustomError(
            error.message || "Failed to create post.",
            SERVER_ERROR,
            DATABASE_ERROR
        );
    }

}

module.exports = {
    doesPostExist,
    getPostCount,
    createPost,
    fetchPosts,
    fetchActiveUserPosts,
    removePost,
    fetchTrendingPosts,
    addShareInteraction,
    fetchPostById,
}