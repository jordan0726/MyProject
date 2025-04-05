from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from backend.api import auth

app = FastAPI()

origins = [
    "http://ec2-54-165-19-130.compute-1.amazonaws.com",  # e.g. http://ec2-xx-xxx-xxx-xxx.compute-1.amazonaws.com
    "http://54.165.19.130",        # Frontend IP
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])

@app.get("/hello")
def say_hello():
    return {"message": "Hello from Backend!"}


# Reference:
# S3 creating and upload file: https://docs.aws.amazon.com/code-library/latest/ug/python_3_s3_code_examples.html
# requests package: https://www.simplilearn.com/tutorials/python-tutorial/python-requests
# Login page: https://github.com/mui/material-ui/blob/master/docs/src/pages/premium-themes/onepirate/SignIn.js