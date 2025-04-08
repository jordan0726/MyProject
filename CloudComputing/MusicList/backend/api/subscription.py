from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from backend.core.dynamo import DynamoManager
from botocore.exceptions import ClientError

router = APIRouter()
dynamo = DynamoManager()
subscription_table = dynamo.dynamodb.Table("subscription")

class SubscriptionRequest(BaseModel):
    email: str
    musicId: str
    title: str
    album: str
    artist: str
    year: str

# 訂閱：新增項目到 subscription table
@router.post("/")
def subscribe(subscription: SubscriptionRequest):
    try:
        subscription_table.put_item(Item=subscription.model_dump())
        return {"message": "Subscription added successfully."}
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Subscription error: {e}")

# 取消訂閱：根據 email 與 musicId 刪除項目
@router.delete("/")
def unsubscribe(email: str = Query(...), musicId: str = Query(...)):
    try:
        subscription_table.delete_item(
            Key={
                "email": email,
                "musicId": musicId
            }
        )
        return {"message": "Subscription removed successfully."}
    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Unsubscribe error: {e}")
