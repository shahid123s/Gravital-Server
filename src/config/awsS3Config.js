const {S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand} = require('@aws-sdk/client-s3');
const appConfig = require('./appConfig');

// Initializing the s3  
const s3 = new S3Client({
    region: appConfig.awsS3.region,
    credentials: {
        accessKeyId: appConfig.awsS3.accessKeyId,
        secretAccessKey: appConfig.awsS3.secretAccessKey,
    },
});


module.exports = {
    s3,
    PutObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
}