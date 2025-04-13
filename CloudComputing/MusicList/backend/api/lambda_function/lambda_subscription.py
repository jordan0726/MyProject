import json
import logging
from pydantic import BaseModel, ValidationError
from botocore.exceptions import ClientError
from dynamo import DynamoManager # Need to upload this file (backend/core/dynamo.py) to the lambda deployment package
from boto3.dynamodb.conditions import Key
from s3 import S3Manager # Need to upload this file (backend/core/s3.py) to the lambda deployment package as well

# Initialize DynamoDB manager and subscription table
dynamo = DynamoManager()
subscription_table = dynamo.dynamodb.Table("subscription")

# Initialize S3 manager and bucket name for generating presigned URLs
s3_manager = S3Manager()
s3_bucket = "media-storage-s4068959"


# Define subscription request data model
class SubscriptionRequest(BaseModel):
    email: str
    musicId: str
    title: str
    album: str
    artist: str
    year: str


logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    logger.info(f"EVENT: {json.dumps(event)}")
    http_method = event.get("httpMethod", "")

    if http_method == "POST":
        try:
            body = json.loads(event.get("body", "{}"))

            # Validate the input using the Pydantic model
            subscription = SubscriptionRequest(**body)

            # Generate normalized musicId (based on title and album)
            normalized_musicId = f"{subscription.title.strip().lower()}|{subscription.album.strip().lower()}"

            # Convert the data to a dictionary and update musicId
            item = subscription.dict()
            item["musicId"] = normalized_musicId

            # Insert into DynamoDB, avoiding duplicate subscriptions
            subscription_table.put_item(
                Item=item,
                ConditionExpression="attribute_not_exists(email)"
            )

            return {
                "statusCode": 200,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
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
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
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

    elif http_method == "GET":
        try:
            # Retrieve email from queryStringParameters
            params = event.get("queryStringParameters", {})
            email = params.get("email")
            if not email:
                return {
                    "statusCode": 400,
                    "headers": {"Content-Type": "application/json"},
                    "body": json.dumps({"message": "Missing required parameter: email"})
                }

            # Query subscriptions by email (partition key)
            response = subscription_table.query(
                KeyConditionExpression=Key('email').eq(email),
                ConsistentRead=True
            )
            items = response.get("Items", [])

            # Log the raw response for debugging
            logging.info(f"Retrieved items: {items}")

            # For each subscription item, add the artist image presigned URL
            for item in items:
                if "artist" in item:
                    formatted_artist = item["artist"].strip().replace(" ", "_").lower()
                    s3_key = f"artist-images/{formatted_artist}.jpg"
                    try:
                        presigned_url = s3_manager.s3_client.generate_presigned_url(
                            ClientMethod="get_object",
                            Params={"Bucket": s3_bucket, "Key": s3_key},
                            ExpiresIn=3600  # URL expiration time in seconds
                        )
                    except ClientError as e:
                        logging.exception("Failed to generate presigned URL")
                        presigned_url = f"https://{s3_bucket}.s3.amazonaws.com/artist-images/no_image_available.jpg"
                    item["artistImageUrl"] = presigned_url

            return {
                "statusCode": 200,
                "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
                "body": json.dumps({"items": items})
            }
        except ClientError as e:
            logging.exception("DynamoDB error occurred during GET")
            return {
                "statusCode": 500,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"detail": f"Subscription retrieval error: {str(e)}"})
            }
        except Exception as e:
            logging.exception("Error occurred during GET")
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
