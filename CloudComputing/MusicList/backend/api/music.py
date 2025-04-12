from fastapi import APIRouter, Query, HTTPException
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Attr, Key
from backend.core.dynamo import DynamoManager
from backend.core.s3 import S3Manager
import json

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
    # Require at least one query parameter
    if not any([title, year, artist, album]):
        raise HTTPException(status_code=400, detail="At least one query parameter must be provided.")

    # Normalize parameters for case-insensitive search
    title_norm = title.strip().lower() if title else ""
    artist_norm = artist.strip().lower() if artist else ""
    album_norm = album.strip().lower() if album else ""

    try:
        # Determine query method based on provided parameters
        if artist_norm and album_norm:
            # Query using ArtistAlbumIndex
            key_condition = Key("artist_lower").eq(artist_norm) & Key("album_lower").begins_with(album_norm)

            response = music_table.query(
                IndexName="ArtistAlbumIndex",
                KeyConditionExpression=key_condition
            )
        elif artist_norm and year:
            # Query using ArtistYearIndex
            key_condition = Key("artist_lower").eq(artist_norm) & Key("year").begins_with(year)
            response = music_table.query(
                IndexName="ArtistYearIndex",
                KeyConditionExpression=key_condition
            )
        else:
            # Fallback to Scan with filter expressions for other combinations
            filter_expression = None
            if title_norm:
                filter_expression = Attr("title_lower").contains(title_norm)
            if year:
                fe = Attr("year").contains(year)
                filter_expression = fe if filter_expression is None else filter_expression & fe
            if artist_norm:
                fe = Attr("artist_lower").contains(artist_norm)
                filter_expression = fe if filter_expression is None else filter_expression & fe
            if album_norm:
                fe = Attr("album_lower").contains(album_norm)
                filter_expression = fe if filter_expression is None else filter_expression & fe
            response = music_table.scan(FilterExpression=filter_expression)
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Query/Scan failed: {e}")

    items = response.get("Items", [])

    # Further strict filtering to ensure all provided query fields must match
    def is_match(item):
        if title_norm and title_norm not in item.get("title_lower", ""):
            return False
        if year and year not in item.get("year", ""):
            return False
        if artist_norm and artist_norm not in item.get("artist_lower", ""):
            return False
        if album_norm and album_norm not in item.get("album_lower", ""):
            return False
        return True

    # Apply strict filtering
    items = [item for item in items if is_match(item)]

    # Generate presigned URLs for artist images from S3
    for item in items:
        if "artist" in item:
            formatted_artist = item["artist"].strip().replace(" ", "_").lower()
            s3_key = f"artist-images/{formatted_artist}.jpg"
            try:
                presigned_url = s3_manager.s3_client.generate_presigned_url(
                    ClientMethod='get_object',
                    Params={'Bucket': s3_bucket, 'Key': s3_key},
                    ExpiresIn=3600  # URL valid for 1 hour
                )
            except ClientError as e:
                # Use default image if failed to generate presigned URL
                print(f"Failed to generate presigned URL: {e}")
                presigned_url = f"https://{s3_bucket}.s3.amazonaws.com/artist-images/no_image_available.jpg"
            item["artistImageUrl"] = presigned_url

    if not items:
        return {"message": "No result is retrieved. Please query again.", "items": []}
    return {"items": items}
