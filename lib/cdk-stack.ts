import { StackProps, aws_s3 as s3, aws_cloudfront as cloudfront, aws_iam as iam, Duration, Stack, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import { S3ToTeamsStack } from './s3-to-teams';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const myBucket = new s3.Bucket(this, "my-bucket")

    // ファイルをアップロードするディレクトリを指定します
    const directoryPath = 'contents';

    // S3 バケットにファイルをアップロードするための設定を作成します
    const deployment = new s3deploy.BucketDeployment(this, 'DeployFiles', {
      sources: [s3deploy.Source.asset(directoryPath)],
      destinationBucket: myBucket,
    });

    // CloudFrontのOrigin Access Identityを作成
    const oai = new cloudfront.OriginAccessIdentity(this, 'OAI');

    // S3バケットにOrigin Access Identityの許可を付与
    myBucket.grantRead(oai);


    // Create CloudFront WebDistribution
    const distribution = new cloudfront.CloudFrontWebDistribution(this, "WebsiteDistribution", {
      viewerCertificate: {
        aliases: [],
        props: {
          cloudFrontDefaultCertificate: true,
        },
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: myBucket,
            originAccessIdentity: oai,
          },
          behaviors: [
            {
              isDefaultBehavior: true,
              minTtl: Duration.seconds(0),
              maxTtl: Duration.days(365),
              defaultTtl: Duration.days(1),
              pathPattern: "my-contents/*",
            },
          ],
        },
      ],
      errorConfigurations: [
        {
          errorCode: 403,
          responsePagePath: "/index.html",
          responseCode: 200,
          errorCachingMinTtl: 0,
        },
        {
          errorCode: 404,
          responsePagePath: "/index.html",
          responseCode: 200,
          errorCachingMinTtl: 0,
        },
      ],
    });

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'CdkQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });

    // CloudFrontのドメイン名を出力
    new CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
    });

    new S3ToTeamsStack(this, myBucket)
  }
}
