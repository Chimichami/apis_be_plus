const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const lambdaClient = new LambdaClient({});
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const REWARDS_TABLE = `${process.env.STAGE}_t_rewards`;
const TOKENS_TABLE = `${process.env.STAGE}_t_access_tokens`;

exports.handler = async (event, context) => {
  try {
    // Obtener el token de autorización desde los headers
    const token = event.headers['Authorization'];
    if (!token) {
      return {
        statusCode: 400,
        body: { error: 'Missing Authorization token' }
      };
    }

    // Validar el token usando la función Lambda ValidateAccessToken
    const validateFunctionName = process.env.VALIDATE_FUNCTION_NAME;
    const validateResponse = await lambdaClient.send(new InvokeCommand({
      FunctionName: validateFunctionName,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify({ token })
    }));

    const validatePayload = JSON.parse(Buffer.from(validateResponse.Payload).toString());
    if (validatePayload.statusCode === 403) {
      return {
        statusCode: 403,
        body: { error: validatePayload.body || 'Unauthorized Access' }
      };
    }

    // Recuperar tenant_id desde el token
    const tokenItem = await docClient.send(new GetCommand({
      TableName: TOKENS_TABLE,
      Key: { token }
    }));

    if (!tokenItem.Item) {
      return {
        statusCode: 500,
        body: { error: 'Failed to retrieve tenant_id from token' }
      };
    }

    const tenantId = tokenItem.Item.tenant_id;

    if (!tenantId) {
      return {
        statusCode: 500,
        body: { error: 'Missing tenant_id in token' }
      };
    }

    // Validar los datos del body
    const body = event.body || {};
    const { reward_id } = body;

    if (!reward_id) {
      return {
        statusCode: 400,
        body: { error: 'Missing reward_id in request body' }
      };
    }

    // Verificar si la recompensa existe
    const existingReward = await docClient.send(new GetCommand({
      TableName: REWARDS_TABLE,
      Key: { tenant_id: tenantId, reward_id }
    }));

    if (!existingReward.Item) {
      return {
        statusCode: 404,
        body: { error: 'Reward not found' }
      };
    }

    // Eliminar la recompensa
    await docClient.send(new DeleteCommand({
      TableName: REWARDS_TABLE,
      Key: { tenant_id: tenantId, reward_id }
    }));

    return {
      statusCode: 200,
      body: { message: 'Reward deleted successfully' }
    };

  } catch (error) {
    console.error('Error occurred:', error);
    return {
      statusCode: 500,
      body: { error: error.message }
    };
  }
};
