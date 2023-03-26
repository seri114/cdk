import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as s3_notifications from 'aws-cdk-lib/aws-s3-notifications';
import { Construct } from 'constructs';


export class S3ToTeamsStack {
    constructor(scope: Construct, bucket: s3.Bucket) {

        // Lambda関数の作成
        const notifyFunction = new lambda.Function(scope, 'NotifyFunction', {
            runtime: lambda.Runtime.NODEJS_14_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('lambda'),
            environment: {
                WEBHOOK_SECRET_NAME: 'webhook-secret',
            },
        });

        // Lambda関数に必要なIAMロールの作成
        const role = new iam.Role(scope, 'NotifyFunctionRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        });

        role.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['lambda:InvokeFunction'],
                resources: [notifyFunction.functionArn],
            })
        );

        role.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['sts:AssumeRole'],
                resources: ['arn:aws:iam::*:role/TeamsNotificationRole'],
            })
        );

        notifyFunction.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['sts:AssumeRole'],
                resources: ['arn:aws:iam::*:role/TeamsNotificationRole'],
            })
        );

        // // SNSトピックを作成
        // const topic = new sns.Topic(scope, 'NotificationTopic');

        // Lambda関数をS3バケットのオブジェクト作成イベントのトリガーとして設定
        // const bucket = new s3.Bucket(scope, 'Bucket');
        bucket.addObjectCreatedNotification(new s3_notifications.LambdaDestination(notifyFunction));

        // // Lambda関数にTeams通知を送信するためのコードを追加
        // const webhookSecret = secretsmanager.Secret.fromSecretNameV2(
        //     scope,
        //     'WebhookSecret',
        //     'webhook-secret'
        // );
        const webhookUrl = scope.node.tryGetContext("websocket-url") as string

        notifyFunction.addEnvironment('WEBHOOK_URL', webhookUrl);

        // notifyFunction.addEventSourceMapping('NotifyEventSourceMapping', {
        //     eventSourceArn: topic.topicArn,
        //     batchSize: 1,
        // });

        const teamsNotificationRole = new iam.Role(scope, 'TeamsNotificationRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        });

        // teamsNotificationRole.addToPolicy(
        //     new iam.PolicyStatement({
        //         effect: iam.Effect.ALLOW,
        //         actions: ['sns:Publish'],
        //         resources: [topic.topicArn],
        //     })
        // );

        const teamsNotification = new lambda.Function(scope, 'TeamsNotification', {
            runtime: lambda.Runtime.NODEJS_14_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('lambda'),
            role: teamsNotificationRole,
            environment: {
                WEBHOOK_URL: webhookUrl,
            },
        });

        // topic.grantPublish(teamsNotification);
    }
}

