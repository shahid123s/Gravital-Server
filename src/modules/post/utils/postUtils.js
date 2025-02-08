const { getCachedPostUrl, getCachedProfileImageUrl } = require("../../../utils/redisUtils");
const { checkUserIsLikedThePost, getLikedCountofPost } = require("../../like/likeServices");
const { checkUserIsSavedThePost } = require("../../savedPost/savedPostServices");

/**
 * Enriches posts with additional data such as URLs, likes, and saved status.
 *
 * @async
 * @function enrichPosts
 * @param {Array<Object>} posts - The array of post objects to enrich.
 * @param {string} userId - The user ID to check likes and saved status.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of enriched post objects.
 */
const enrichPosts = async (posts, userId, forArchive = false) => {



    return Promise.all(
        posts.map(async (post) => {
            const postId = forArchive? post.postId._id :post._id;
            const fileName = forArchive? post.postId.fileName: post.fileName;
            const postOwnerId = forArchive ? post.postId.userId: post.userId;


            const postUrl = await getCachedPostUrl(postId, fileName);
            if(forArchive) post.postId.postUrl = postUrl
            post.userId.profileImage = await getCachedProfileImageUrl(postOwnerId._id, postOwnerId.profileImage);

            const [likedByUser, likedCount, isSavedByUser] = await Promise.all([
                checkUserIsLikedThePost(userId,postId),
                getLikedCountofPost(postId),
                checkUserIsSavedThePost(userId._id, postId),
            ]);

            return {
                ...post,
                postUrl,
                likedByUser,
                likedCount,
                isSavedByUser,
            };
        })
    );
};

module.exports = {
    enrichPosts,
}