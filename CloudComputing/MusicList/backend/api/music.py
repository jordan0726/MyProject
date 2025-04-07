from fastapi import APIRouter, Query, HTTPException
import boto3
from boto3.dynamodb.conditions import Attr
from backend.core.dynamo import DynamoManager


router = APIRouter()
dynamo = DynamoManager()
music_table = dynamo.dynamodb.Table("music")


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
        filter_expression = Attr("title").contains(title)
    if year:
        fe = Attr("year").contains(year)
        filter_expression = fe if filter_expression is None else filter_expression & fe
    if artist:
        fe = Attr("artist").contains(artist)
        filter_expression = fe if filter_expression is None else filter_expression & fe
    if album:
        fe = Attr("album").contains(album)
        filter_expression = fe if filter_expression is None else filter_expression & fe

    response = music_table.scan(
        FilterExpression=filter_expression
    )
    items = response.get("Items", [])
    if not items:
        return {"message": "No result is retrieved. Please query again.", "items": []}
    return {"items": items}
