import json
import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize DynamoDB resource
dynamo = boto3.resource('dynamodb')
login_table = dynamo.Table('login')

# Unified CORS headers
CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}

def lambda_handler(event, context):
    logger.info(f"EVENT: {json.dumps(event)}")

    try:
        body = json.loads(event.get('body', '{}'))
        email = body['email']
        username = body['username']
        password = body['password']

        # Check if user already exists
        resp = login_table.get_item(Key={'email': email})

        if 'Item' in resp:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'status': 'error',
                    'detail': 'Email already exists'
                })
            }

        # Insert new user
        login_table.put_item(
            Item={
                'email': email,
                'username': username,
                'password': password
            }
        )

        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'status': 'ok',
                'message': 'Register success'
            })
        }

    except Exception as e:
        logger.exception("Error occurred during registration")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'detail': str(e)})
        }
