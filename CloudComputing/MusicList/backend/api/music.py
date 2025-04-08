from fastapi import APIRouter, Query, HTTPException
import boto3
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Attr
from backend.core.dynamo import DynamoManager
from backend.core.s3 import S3Manager


router = APIRouter()
dynamo = DynamoManager()
music_table = dynamo.dynamodb.Table("music")

s3_manager = S3Manager()
s3_bucket = "media-storage-s4068959"


@router.get("/music")
def query_music(
        title: str = Query("", description="Music title"),
        year: str = Query("", description="Year"),
        artist: str = Query("", description="Artist"),
        album: str = Query("", description="Album")
):
    # at least one query parameter must be provided
    if not any([title, year, artist, album]):
        raise HTTPException(status_code=400, detail="At least one query parameter must be provided.")

    filter_expression = None
    if title:
        filter_expression = Attr("title_lower").contains(title.strip().lower())
    if year:
        fe = Attr("year").contains(year)
        filter_expression = fe if filter_expression is None else filter_expression & fe
    if artist:
        fe = Attr("artist_lower").contains(artist.strip().lower())
        filter_expression = fe if filter_expression is None else filter_expression & fe
    if album:
        fe = Attr("album_lower").contains(album.strip().lower())
        filter_expression = fe if filter_expression is None else filter_expression & fe

    response = music_table.scan(
        FilterExpression=filter_expression
    )
    items = response.get("Items", [])

    s3_base_url = f"https://{s3_bucket}.s3.amazonaws.com/artist-images/"

    for item in items:
        if "artist" in item:
            formatted_artist = item["artist"].strip().replace(" ", "_").lower()
            s3_key = f"artist-images/{formatted_artist}.jpg"
            try:
                presigned_url = s3_manager.s3_client.generate_presigned_url(
                    ClientMethod='get_object',
                    Params={
                        'Bucket': s3_bucket,
                        'Key': s3_key
                    },
                    ExpiresIn=3600  # URL valid for 1 hour
                )
            except ClientError as e:
                print(f"Failed to generate presigned URL: {e}")
                presigned_url = "https://media-storage-s4068959.s3.amazonaws.com/artist-images/no_image_available.jpg"

            item["artistImageUrl"] = presigned_url


    if not items:
        return {"message": "No result is retrieved. Please query again.", "items": []}
    return {"items": items}
