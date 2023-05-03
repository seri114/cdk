import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';
import { ApiKeySourceType, UsagePlan } from 'aws-cdk-lib/aws-apigateway';

const domainName = 'api.seri114-test1.site';
const certificateArn = 'arn:aws:acm:ap-northeast-1:969666323120:certificate/eae9c6cb-cad3-4fce-a893-95a04fc6b00c';



export class WebAccessLoggingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table for Web Access Logs
    const accessLogsTable = new dynamodb.Table(this, 'WebAccessLogs', {
      tableName: 'WebAccessLogs',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
    });

    // Lambda Function for handling web access logs
    const accessLogsHandler = new lambda.Function(this, 'WebAccessLogsHandler', {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'accessLogs.handler',
      environment: {
        TABLE_NAME: accessLogsTable.tableName
      }
    });

    // Grant write permissions to Lambda to access DynamoDB Table
    accessLogsTable.grantWriteData(accessLogsHandler);

    // Create RestAPI.use domainName and certificateArn
    // https://docs.aws.amazon.com/cdk/api/latest/docs/aws-apigateway-readme.html
    


    // API Gatewayのドメイン名を作成
    const api = new apigateway.RestApi(this, 'WebAccessLoggingAPI', {
      deployOptions: {
        stageName: 'prod'
      },
      domainName: {
        domainName: domainName,
        certificate: acm.Certificate.fromCertificateArn(this, 'Certificate', certificateArn),
      },
    });
    const usagePlan = new UsagePlan(this, 'MyUsagePlan', {
      name: 'MyUsagePlan',
      apiStages: [
        {
          api: api,
          stage: api.deploymentStage
        }
      ]
    });

    const apiKey = api.addApiKey('MyApiKey', {
      description: 'My API Key',
    });
    usagePlan.addApiKey(apiKey);
    

    // Integration between API Gateway and Lambda
    const accessLogsIntegration = new apigateway.LambdaIntegration(accessLogsHandler);
    api.root.addMethod('GET', accessLogsIntegration, { apiKeyRequired: true });

    // Output the URL of the API Gateway
    new cdk.CfnOutput(this, 'WebAccessLoggingAPIEndpoint', {
      value: `${api.domainName?.domainName} ${api.url}`,
    });
  }
}
