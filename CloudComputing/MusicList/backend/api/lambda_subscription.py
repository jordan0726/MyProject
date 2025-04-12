import json
import logging
from pydantic import BaseModel, ValidationError
from botocore.exceptions import ClientError

# need to change to "from dynamo import DynamoManager" on the Lambda and upload dynamo.py file with this lambda function
from backend.core.dynamo import DynamoManager

# Initialize DynamoDB manager and subscription table
dynamo = DynamoManager()
subscription_table = dynamo.dynamodb.Table("subscription")


# Define subscription request data model
class SubscriptionRequest(BaseModel):
    email: str
    musicId: str
    title: str
    album: str
    artist: str
    year: str


def lambda_handler(event, context):
    http_method = event.get("httpMethod", "")

    if http_method == "POST":
        try:
            body = event.get("body", "{}")
            if isinstance(body, str):
                data = json.loads(body)
            else:
                data = body

            # Validate the input using the Pydantic model
            subscription = SubscriptionRequest(**data)

            # Generate normalized musicId (based on title and album)
            normalized_musicId = f"{subscription.title.strip().lower()}|{subscription.album.strip().lower()}"

            # Convert the data to a dictionary and update musicId
            item = subscription.dict()
            item["musicId"] = normalized_musicId

            # Insert into DynamoDB, avoiding duplicate subscriptions
            subscription_table.put_item(
                Item=item,
                ConditionExpression="attribute_not_exists(musicId)"
            )

            return {
                "statusCode": 200,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"message": "Subscription added successfully."})
            }

        except ClientError as e:
            logging.exception("DynamoDB error occurred")
            return {
                "statusCode": 500,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"detail": f"Subscription error: {str(e)}"})
            }
        except (ValidationError, Exception) as e:
            logging.exception("Invalid input or error occurred")
            return {
                "statusCode": 400,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"detail": f"Invalid input or error occurred: {str(e)}"})
            }

    elif http_method == "DELETE":
        try:
            # Retrieve email and musicId from queryStringParameters
            params = event.get("queryStringParameters", {})
            email = params.get("email")
            musicId = params.get("musicId")
            if not email or not musicId:
                raise ValueError("Missing required parameters: email and musicId.")

            try:
                title, album = musicId.split("|", 1)
                normalized_musicId = f"{title.strip().lower()}|{album.strip().lower()}"
            except ValueError:
                raise ValueError("Invalid musicId format.")

            # Delete subscription using the composite key (email and normalized musicId)
            subscription_table.delete_item(
                Key={
                    "email": email,
                    "musicId": normalized_musicId
                }
            )

            return {
                "statusCode": 200,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"message": "Unsubscribed successfully."})
            }
        except ClientError as e:
            logging.exception("DynamoDB error occurred during deletion")
            return {
                "statusCode": 500,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"detail": f"Unsubscription error: {str(e)}"})
            }
        except Exception as e:
            logging.exception("Error occurred during unsubscription")
            return {
                "statusCode": 400,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"detail": f"Invalid input or error occurred: {str(e)}"})
            }
    else:
        return {
            "statusCode": 405,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"detail": "Method not allowed."})
        }
