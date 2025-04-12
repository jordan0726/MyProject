from fastapi import APIRouter,HTTPException, Response, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from botocore.exceptions import ClientError, NoCredentialsError, BotoCoreError
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

        print("DynamoDB Response:", response)

        if "Item" not in response:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        item = response["Item"]
        # from dynamoDB get corresponding password and username
        stored_password = item["password"]["S"]
        stored_username = item["username"]["S"]

        print("Stored password:", stored_password)
        print("Input password:", req.password)

        # Compare password
        if stored_password != req.password:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        user_info = {
            "username": stored_username,
            "email": req.email,
            "subscriptions": []  # 之後從 DynamoDB 查詢填入
        }

        return JSONResponse(content={
            "status": "ok",
            "message": "Login success",
            **user_info
        })

    except NoCredentialsError as e:
        raise HTTPException(status_code=500,
                            detail="No AWS credentials found. Please attach IAM role or configure credentials.")
    except ClientError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except BotoCoreError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Register function already moved to AWS Lambda, but still keep it here for local testing
@router.post("/register")
def register_user(req:RegisterRequest):
    table_name = 'login'

    try:
        existing_user = dynamo.client.get_item(
            TableName = table_name,
            Key = {"email": {"S": req.email}}
        )

        if "Item" in existing_user:
            # email already exists
            raise HTTPException(status_code=400, detail="Email already exists")


        dynamo.client.put_item(
            TableName = table_name,
            Item = {
                "email": {"S": req.email},
                "username": {"S": req.username},
                "password": {"S": req.password} # Store the hashed password as str
            }
        )
        # ✅ Successfully registered
        return{
            "status": "ok",
            "message": "User registered successfully"
        }
    except NoCredentialsError as e:
        # AWS credentials missing or incorrect
        raise HTTPException(
            status_code=500,
            detail="No AWS credentials found. Please attach IAM role or configure credentials."
        )
    except ClientError as e:
        # Client error (e.g., permissions issue, incorrect parameters)
        raise HTTPException(status_code=500, detail=f"ClientError: {str(e)}")
    except BotoCoreError as e:
        # General AWS SDK error
        raise HTTPException(status_code=500, detail=f"BotoCoreError: {str(e)}")
    except Exception as e:
        # Catch any other unexpected errors
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )
