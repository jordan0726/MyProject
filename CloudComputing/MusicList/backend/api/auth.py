from fastapi import APIRouter,HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter

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
    # 1. Query DynamoDB 'login' table by 'email'
    # 2. Compare password
    # 3. if fail => raise HTTPException(status_code=401, detail="Invalid email or password")
    # 4. if success => return {"status": "ok", "message": "Login success", "username": user_name}

@router.post("/register")
def register_user(req:RegisterRequest):
    # 1. Query DynamoDB 'login' table by 'email' => check if email already exist
    # 2. if exist => raise HTTPException(status_code=400, detail="Email already exists")
    # 3. else => Insert new item => return {"status": "ok", "message": "Register success"}
