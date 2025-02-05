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
const enrichPosts = async (posts, userId) => {
    return Promise.all(
        posts.map(async (post) => {
            const postId = post._id;

            const postUrl = await getCachedPostUrl(postId, post.fileName);
            post.userId.profileImage = await getCachedProfileImageUrl(post.userId._id, post.userId.profileImage);

            const [likedByUser, likedCount, isSavedByUser] = await Promise.all([
                checkUserIsLikedThePost(userId,postId),
                getLikedCountofPost(postId),
                checkUserIsSavedThePost(userId, postId),
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