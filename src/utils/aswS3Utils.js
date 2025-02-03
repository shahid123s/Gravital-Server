const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { PutObjectCommand, s3 } = require('../config/awsS3Config');
const { postBucket, profileBucket } = require('../config/appConfig').awsS3;


/**
 * Generates a pre-signed URL for accessing an S3 object.
 * @param {string} fileKey - The key (filename) of the object in S3.
 * @param {boolean} isPost - Whether the file belongs to posts (true) or profile images (false).
 * @returns {Promise<string>} - A signed URL for accessing the file.
 */


const generatePreSignedUrl = async (fileKey, IsPost) => {

    // Setting the bucket name
    const bucket = IsPost ? postBucket : profileBucket;


    // Setting the getObjectCommand for the S3 
    const command = new GetObjectCommand({
        Bucket: bucket,
        Key: fileKey,
    });

    // return the pre-SignedUrl from s3 
    return await getSignedUrl(s3, command, { expiresIn: 3600 }); // expires after 1 hour

}

/**
 * Upload file to S3
 * @param {Object} file - File object from multer
 * @param {string} userId - User ID (for unique filenames)
 * @param {boolean} isPost - Whether the file belongs to posts (true) or profile images (false)
 * @returns {string} - The file key that uploaded in S3 
 */
const uploadFileToS3 = async (file, userId, isPost) => {
    try {
        const bucket = isPost ? postBucket : profileBucket;
        const filetype = file.mimetype.startsWith('video') ? 'videos' : 'images';
        const fileKey = `${filetype}/${userId}_${file.originalname}`;

        const params = {
            Bucket: bucket,
            Key: fileKey,
            Body: file.buffer,
            ContentType: file.mimetype,
        };

        const command = new PutObjectCommand(params);
        await s3.send(command);

        return fileKey
    } catch (error) {
        throw new Error(`S3 Upload Error: ${error.message}`);
    }
}




// Export the utility functions to use in other parts of the application
module.exports = {
    generatePreSignedUrl,
    uploadFileToS3,
}