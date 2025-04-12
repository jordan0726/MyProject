from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from backend.api import auth, music, subscription

app = FastAPI()

origins = [
    "http://ec2-54-161-232-48.compute-1.amazonaws.com",  # e.g. http://ec2-xx-xxx-xxx-xxx.compute-1.amazonaws.com
    "http://54.161.232.48",        # Frontend IP
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(music.router, prefix="/music", tags=["music"])
app.include_router(subscription.router, prefix="/subscription", tags=["subscription"])



@app.get("/hello")
def say_hello():
    return {"message": "Hello from Backend!"}


