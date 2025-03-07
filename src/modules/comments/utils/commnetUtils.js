const { getCachedProfileImageUrl } = require("../../../utils/redisUtils");


/**
 * Enhances a comment by adding a resolved profile image URL.
 *
 * @async
 * @function enrichComment
 * @param {Object} comment - The comment object to enrich.
 * @param {string} comment._id - The unique identifier of the comment.
 * @param {string} comment.postId - The ID of the post associated with the comment.
 * @param {Object} comment.userId - The user object associated with the comment.
 * @param {string} comment.userId._id - The unique identifier of the user.
 * @param {string} comment.userId.username - The username of the user.
 * @param {string} comment.userId.profileImage - The URL of the user's profile image.
 * @returns {Promise<Object>} A promise that resolves to the enriched comment object.
 */
const enrichComment  = async (comment) => {
    if (!comment?.userId) return comment; // Ensure userId exists

    const { _id: userId, profileImage } = comment.userId;

    return {
        ...comment,
        profileImage: await getCachedProfileImageUrl(userId, profileImage)
    };

}


module.exports = {
    enrichComment,
}