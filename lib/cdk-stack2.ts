import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import path = require('path');
import { RemovalPolicy } from 'aws-cdk-lib';

export class S3ToCloudFrontStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create S3 bucket to store files
    const bucket = new s3.Bucket(this, 'S3Bucket',{
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // ファイルをアップロードするディレクトリを指定します
    const directoryPath = 'contents';

    // S3 バケットにファイルをアップロードするための設定を作成します
    const deployment = new s3deploy.BucketDeployment(this, 'DeployFiles', {
      sources: [s3deploy.Source.asset(directoryPath)],
      destinationBucket: bucket,
    });


    // CloudFrontのOrigin Access Identityを作成
    const oai = new cloudfront.OriginAccessIdentity(this, 'OAI');

    // S3バケットにOrigin Access Identityの許可を付与
    bucket.grantRead(oai);


    // Create CloudFront distribution
    const distribution = new cloudfront.CloudFrontWebDistribution(this, 'CloudFrontDistribution', {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: bucket,
            originAccessIdentity: oai,
          },
          behaviors: [{ isDefaultBehavior: true }],
        },
      ],
    });
    // // Restrict access to S3 objects through CloudFront only
    // const s3BucketPolicy = new iam.PolicyStatement({
    //   actions: ['s3:GetObject'],
    //   effect: iam.Effect.DENY,
    //   principals: [new iam.AnyPrincipal()],
    //   resources: [`${bucket.bucketArn}/*`],
    //   conditions: {
    //     NotIpAddress: {
    //       'aws:SourceIp': [`${distribution.distributionDomainName}/32`],
    //     },
    //   },
    // });
    // // Attach the policy to the S3 bucket
    // bucket.addToResourcePolicy(s3BucketPolicy);

    // Output the CloudFront distribution URL
    new cdk.CfnOutput(this, 'CloudFrontUrl', {
      value: distribution.distributionDomainName,
    });

    new cdk.CfnOutput(this, 'S3BucketName', {
      value: bucket.bucketName,
    });


    // // Create Lambda function to send Teams notification
    // const teamsFunction = new lambda.Function(this, 'TeamsFunction', {
    //   runtime: lambda.Runtime.NODEJS_18_X,
    //   handler: 'index.handler',
    //   code: lambda.Code.fromAsset('src/teams-function'),
    // });

    // // Create S3 notification configuration
    // const notificationConfig = new s3n.LambdaDestination(
    //   teamsFunction
    // );

    // // Add notification configuration to S3 bucket
    // bucket.addEventNotification(s3.EventType.OBJECT_CREATED, notificationConfig);

    // Create Teams webhook
    // const webhookUrl = scope.node.tryGetContext("websocket-url") as string
    // const teamsWebhook = new teams.Webhook(webhookUrl);
    const webhookUrl = "https://webhook.site/5abb3f13-ccb2-4123-9294-bec4606d183f"

    // Create handler function to send Teams notification
    const handler = new lambda.Function(this, 'TeamsNotificationHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'teams.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        WEBHOOK_URL: webhookUrl,
      },
    });

    // Add S3 trigger to handler function
    handler.addEventSource(new sources.S3EventSource(bucket, {
      events: [s3.EventType.OBJECT_CREATED],
    }));

    // Output the Teams webhook URL
    new cdk.CfnOutput(this, 'TeamsWebhookUrl', {
      value: webhookUrl,
    });
  }
}