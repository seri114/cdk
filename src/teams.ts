import * as https from 'https';

export async function handler(event: any, context: any) {
  const record = event.Records[0];
  const bucketName = record.s3.bucket.name;
  const objectKey = record.s3.object.key;
  const objectUrl = `https://${bucketName}.s3.amazonaws.com/${objectKey}`;

  const teamsMessage = {
    type: 'message',
    text: `[${objectKey}](${objectUrl}) がアップロードされました。`,
  };
  

  const teamsWebhookUrl = process.env.WEBHOOK_URL as string;

  const postData = JSON.stringify(teamsMessage);

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length,
    },
  };

  console.log(`teamsWebhookUrl:${teamsWebhookUrl}  options:${JSON.stringify(options)} postData:${postData}`)


  return new Promise((resolve, reject) => {
    const request = https.request(teamsWebhookUrl, options, (response) => {
      response.setEncoding('utf8');
      let body = '';


      response.on('data', (chunk) => {
        body += chunk;
      });

      response.on('end', () => {
        console.log(body)
        resolve(body)
      });
    });

    request.on('error', (error) => {
      console.error(error);
      reject(error);
    });

    request.write(postData);

    request.end();
  });
}
