import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as AWS from 'aws-sdk';

const dynamodb = new AWS.DynamoDB.DocumentClient();
const tableName = 'WebAccessLogs';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const requestContext = event.requestContext;
  const httpMethod = event.httpMethod;
  const path = event.path;
  const queryStringParameters = event.queryStringParameters;

  // Create a unique ID for the access log
  const id = `${requestContext.requestId}-${requestContext.requestTimeEpoch}`;

  // Prepare the item to be saved to DynamoDB
  const item = {
    id,
    httpMethod,
    path,
    queryStringParameters,
    timestamp: new Date().toISOString()
  };

  // Save the item to DynamoDB
  await dynamodb.put({
    TableName: tableName,
    Item: item
  }).promise();

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Access log saved successfully.' })
  };
};
