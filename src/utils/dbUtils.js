const mongoose = require('mongoose');

/**
 * Converts a string to a MongoDB ObjectId.
 *
 * @param {string} id - The string to be converted.
 * @returns {mongoose.Types.ObjectId|null} The ObjectId or null if the string is invalid.
 */
const toObjectId = (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return null; // Return null if the string is not a valid ObjectId
    }
    return new mongoose.Types.ObjectId(id);
};

module.exports = { toObjectId };