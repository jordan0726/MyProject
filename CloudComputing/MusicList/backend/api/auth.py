from fastapi import APIRouter,HTTPException, Response, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from botocore.exceptions import ClientError, NoCredentialsError, BotoCoreError
from backend.core.dynamo import DynamoManager
from backend.core.auth_utils import create_access_token, decode_access_token


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

        access_token = create_access_token({"sub": req.email})
        # Send token as cookie
        response = JSONResponse(content={
            "status": "ok",
            "message": "Login success",
            "username": stored_username
        })
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            max_age=1800, # 30 minutes
            samesite="None",
            secure=False
        )

        # Return success message
        return response


    except NoCredentialsError as e:
        raise HTTPException(status_code=500,
                            detail="No AWS credentials found. Please attach IAM role or configure credentials.")
    except ClientError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except BotoCoreError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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

        # Hash the password
        hashed_password = bcrypt.hashpw(req.password.encode('utf-8'), bcrypt.gensalt())

        dynamo.client.put_item(
            TableName = table_name,
            Item = {
                "email": {"S": req.email},
                "username": {"S": req.username},
                "password": {"S": hashed_password.decode('utf-8')} # Store the hashed password as str
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

@router.get("/me")
def get_current_user(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    email = payload.get("sub")

    # 你可以自己實作查詢，假設是這樣：
    user = dynamo.client.get_item(
        TableName="login",
        Key={"email": {"S": email}}
    ).get("Item")

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "email": user["email"]["S"],
        "username": user["username"]["S"],
        # 這邊 subscriptions 可以先回傳空陣列，之後串音樂資料時補上
        "subscriptions": []
    }