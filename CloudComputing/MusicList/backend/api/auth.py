from fastapi import APIRouter,HTTPException
from pydantic import BaseModel
from botocore.exceptions import ClientError, NoCredentialsError, BotoCoreError
from backend.core.dynamo import DynamoManager
import bcrypt

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
        if not bcrypt.checkpw(req.password.encode('utf-8'), stored_password.encode('utf-8')):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Return success message
        return {
            "status": "ok",
            "message": "Login success",
            "username": stored_username
        }


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