const AWS = require('aws-sdk');
const teamsSdk = require('microsoft-teams-notification');

exports.handler = async (event: any) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

//   const s3 = new AWS.S3();
//   const secretName = process.env.WEBHOOK_URL;
//   const secret = await s3.getObject({
//     Bucket: process.env.S3_BUCKET_NAME,
//     Key: secretName,
//   }).promise();

  const webhookURL = process.env.WEBHOOK_URL;

  try {
    const message = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      summary: `S3バケット ${event.Records[0].s3.bucket.name} にオブジェクトがアップロードされました`,
      themeColor: '0076D7',
      sections: [
        {
          activityTitle: `S3バケット ${event.Records[0].s3.bucket.name} にオブジェクトがアップロードされました`,
          activitySubtitle: `オブジェクトキー: ${event.Records[0].s3.object.key}`,
          activityImage: 'https://avatars.githubusercontent.com/u/79178587?s=200&v=4',
          markdown: true,
        },
      ],
    };

    const result = await teamsSdk.sendWebhook(
      webhookURL,
      message
    );
    console.log(result);
  } catch (err) {
    console.error(err);
    throw err;
  }
};
