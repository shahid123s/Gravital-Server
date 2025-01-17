const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { BUCKET_NAME, PutObjectCommand, s3, POST_BUCKET_NAME } = require('../Config/s3');


const generatePreSignedUrlForProfileImageS3 = async (fileKey, IsPost) => {

    const bucket  = IsPost ? POST_BUCKET_NAME : BUCKET_NAME ;

    const objParams = {
        Bucket: bucket,
        Key: fileKey,
    }

    const command = new GetObjectCommand(objParams);
    const url = await getSignedUrl(s3, command, {expiresIn: 3600 });
    return url
}

module.exports ={ 
    generatePreSignedUrlForProfileImageS3,
}