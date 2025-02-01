const multer = require('multer');

// Memory storage for multer
const storage = multer.memoryStorage();

/**
 * Dynamic multer upload middleware
 * @param {string} fieldName - The name of the form field to handle (e.g., 'profileImage' or 'post')
 * @returns {Function} - multer single middleware with dynamic field name
 */
const dynamicUpload = (fieldName) => multer({ storage }).single(fieldName);

module.exports = { dynamicUpload };