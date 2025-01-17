const {S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand} = require('@aws-sdk/client-s3');

const s3 = new S3Client ({
    region: process.env.AWS_S3_BUCKET_REGION,
    credentials: {
        accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
    },
});
const BUCKET_NAME  =  process.env.AWS_S3_BUCKET_NAME;
const POST_BUCKET_NAME = process.env.AWS_S3_POST_BUCKET_NAME;

module.exports ={
    s3,
    BUCKET_NAME,
    POST_BUCKET_NAME,
    PutObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
}