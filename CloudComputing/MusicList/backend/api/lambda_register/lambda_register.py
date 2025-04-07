# backend/api/lambda_register.py
import json
import boto3
import bcrypt

dynamo = boto3.client('dynamodb')

def lambda_handler(event, context):
    try:
        body = json.loads(event['body'])
        email = body['email']
        username = body['username']
        password = body['password']

        resp =  dynamo.get_item(TableName='login', Key={'email': {'S': email}})
        if 'Item' in resp:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': 'http://localhost:3000',
                    'Access-Control-Allow-Credentials': 'true'
                },
                'body': json.dumps({
                    'status': 'error',
                    'detail': 'Email already exists'
                })
            }

        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        dynamo.put_item(
            TableName='login',
            Item={
                'email': {'S': email},
                'username': {'S': username},
                'password': {'S': hashed_password}
            }
        )

        print("📥 Raw event received:", event)
        print("📬 Body:", event.get('body'))

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': 'http://localhost:3000',
                'Access-Control-Allow-Credentials': 'true'
            },
            'body': json.dumps({
                'status': 'ok',
                'message': 'Register success'
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'detail': str(e)})
        }
