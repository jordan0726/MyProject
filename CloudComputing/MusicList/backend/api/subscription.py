from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from backend.core.dynamo import DynamoManager
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key
from backend.core.s3 import S3Manager



router = APIRouter()
dynamo = DynamoManager()
subscription_table = dynamo.dynamodb.Table("subscription")
s3_manager = S3Manager()
s3_bucket = "media-storage-s4068959"

class SubscriptionRequest(BaseModel):
    email: str
    musicId: str
    title: str
    album: str
    artist: str
    year: str

@router.post("/")
def subscribe(subscription: SubscriptionRequest):
    try:
        # Normalize musicId to lowercase and trim whitespace
        normalized_musicId = f"{subscription.title.strip().lower()}|{subscription.album.strip().lower()}"

        item = subscription.model_dump()
        item["musicId"] = normalized_musicId  # Overwrite original musicId

        subscription_table.put_item(Item=item)
        return {"message": "Subscription added successfully."}
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Subscription error: {e}")


@router.delete("/")
def unsubscribe(email: str = Query(...), musicId: str = Query(...)):
    try:
        # Normalize incoming musicId: split and trim, lowercase both parts
        try:
            title, album = musicId.split("|", 1)
            normalized_musicId = f"{title.strip().lower()}|{album.strip().lower()}"
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid musicId format.")

        subscription_table.delete_item(
            Key={
                "email": email,
                "musicId": normalized_musicId
            }
        )
        return {"message": "Subscription removed successfully."}
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Unsubscribe error: {e}")

@router.get("/list")
def get_subscriptions(email: str = Query(...)):
    try:
        # Query subscriptions by email (partition key)
        response = subscription_table.query(
            KeyConditionExpression=Key('email').eq(email)
        )
        items = response.get("Items", [])
        # Return just the musicId list (or full items if needed)
        music_ids = [item["musicId"] for item in items]
        return {"items": music_ids}
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Subscription retrieval error: {e}")

@router.get("/details")
def get_subscription_details(email: str = Query(...)):
    try:
        # Query subscriptions by email (partition key)
        response = subscription_table.query(
            KeyConditionExpression=Key('email').eq(email)
        )
        items = response.get("Items", [])

        # For each item, add the artist image URL like in music.py
        for item in items:
            if "artist" in item:
                # Normalize the artist name (trim, replace spaces with underscore, lowercase)
                formatted_artist = item["artist"].strip().replace(" ", "_").lower()
                s3_key = f"artist-images/{formatted_artist}.jpg"
                try:
                    presigned_url = s3_manager.s3_client.generate_presigned_url(
                        ClientMethod='get_object',
                        Params={
                            'Bucket': s3_bucket,
                            'Key': s3_key
                        },
                        ExpiresIn=3600  # URL 有效期 1 小時
                    )
                except ClientError as e:
                    print(f"Failed to generate presigned URL: {e}")
                    # Fallback image URL
                    presigned_url = f"https://{s3_bucket}.s3.amazonaws.com/artist-images/no_image_available.jpg"
                item["artistImageUrl"] = presigned_url

        return {"items": items}
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Subscription retrieval error: {e}")