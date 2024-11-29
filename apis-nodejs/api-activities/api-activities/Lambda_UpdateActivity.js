// Lambda para actualizar una actividad
const { LambdaClient } = require('@aws-sdk/client-lambda');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const moment = require('moment');

const lambdaClient = new LambdaClient({});
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const ACTIVITIES_TABLE = `${process.env.STAGE}_t_activities`;
const TOKENS_TABLE = `${process.env.STAGE}_t_access_tokens`;

exports.handler = async (event, context) => {
    try {
        const token = event.headers['Authorization'];
        if (!token) {
            return {
                statusCode: 400,
                body: { error: 'Missing Authorization token' }
            };
        }

        // Validar token (mismo procedimiento que en el código anterior)
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
                body: { error: 'Unauthorized Access' }
            };
        }

        // Recuperar tenant_id y student_id desde el token
        const tokenItem = await docClient.send(new GetCommand({
            TableName: TOKENS_TABLE,
            Key: { token }
        }));
        if (!tokenItem.Item) {
            return {
                statusCode: 500,
                body: { error: 'Failed to retrieve tenant_id and student_id from token' }
            };
        }
        const tenantId = tokenItem.Item.tenant_id;
        const studentId = tokenItem.Item.student_id;

        if (!tenantId || !studentId) {
            return {
                statusCode: 500,
                body: { error: 'Missing tenant_id or student_id in token' }
            };
        }

        const { activity_id } = event.pathParameters;
        if (!activity_id) {
            return {
                statusCode: 400,
                body: { error: 'Missing activity_id in path' }
            };
        }

        const body = JSON.parse(event.body);
        const { activitie_type, activity_data } = body;

        if (!activitie_type) {
            return {
                statusCode: 400,
                body: { error: 'Missing activity_type in request body' }
            };
        }

        // Verificar si la actividad existe antes de intentar actualizarla
        const existingActivity = await docClient.send(new GetCommand({
            TableName: ACTIVITIES_TABLE,
            Key: { tenant_id: tenantId, activity_id: activity_id, student_id: studentId }
        }));

        if (!existingActivity.Item) {
            return {
                statusCode: 404,
                body: { error: 'Activity not found' }
            };
        }

        // Actualizar los campos de la actividad
        const updateExpression = [];
        const expressionAttributeValues = {};

        if (activitie_type) {
            updateExpression.push('activitie_type = :activitie_type');
            expressionAttributeValues[':activitie_type'] = activitie_type;
        }

        if (activity_data) {
            updateExpression.push('activity_data = :activity_data');
            expressionAttributeValues[':activity_data'] = activity_data;
        }

        if (updateExpression.length === 0) {
            return {
                statusCode: 400,
                body: { error: 'No fields to update' }
            };
        }

        const updateParams = {
            TableName: ACTIVITIES_TABLE,
            Key: { tenant_id: tenantId, activity_id: activity_id, student_id: studentId },
            UpdateExpression: `set ${updateExpression.join(', ')}`,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW'
        };

        const updatedItem = await docClient.send(new UpdateCommand(updateParams));

        return {
            statusCode: 200,
            body: {
                message: 'Activity updated successfully',
                activity: updatedItem.Attributes
            }
        };

    } catch (error) {
        console.error('Error occurred:', error);
        return {
            statusCode: 500,
            body: { error: error.message }
        };
    }
};
