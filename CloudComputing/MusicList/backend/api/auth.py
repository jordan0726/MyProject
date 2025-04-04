from fastapi import APIRouter,HTTPException
from pydantic import BaseModel
from typing import Optional
import botocore.exceptions as ClientError
from backend.core.dynamo import DynamoManager

router = APIRouter()
dynamo = DynamoManager()

#Pydantic model for request body
class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    username: str
    password: str

@router.post("/login")
def login_user(req:LoginRequest):
    table_name = "login"
    try:
        response = dynamo.client.get_item(
            TableName=table_name,
            Key={"email": {"S": req.email}}
        )
        if "Item" not in response:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        item = response["Item"]
        # from dynamoDB get corresponding password and username
        stored_password = item["password"]["S"]
        stored_username = item["username"]["S"]

        # Compare password
        if stored_password != req.password:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Return success message
        return {
            "status": "ok",
            "message": "Login success",
            "username": stored_username
        }

    except ClientError as e:
        raise HTTPException(status_code=500, detail=f"Error querying DynamoDB: {e}")


    # 1. Query DynamoDB 'login' table by 'email'
    # 2. Compare password
    # 3. if fail => raise HTTPException(status_code=401, detail="Invalid email or password")
    # 4. if success => return {"status": "ok", "message": "Login success", "username": user_name}

@router.post("/register")
def register_user(req:RegisterRequest):
    pass
    # 1. Query DynamoDB 'login' table by 'email' => check if email already exist
    # 2. if exist => raise HTTPException(status_code=400, detail="Email already exists")
    # 3. else => Insert new item => return {"status": "ok", "message": "Register success"}
