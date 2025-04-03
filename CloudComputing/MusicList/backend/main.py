from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins = [
    "http://前端EC2的PublicDNS",  # e.g. http://ec2-xx-xxx-xxx-xxx.compute-1.amazonaws.com
    "http://前端EC2的IP"         # 或者直接 "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/hello")
def say_hello():
    return {"message": "Hello from Backend!"}


# Reference:
# S3 creating and upload file: https://docs.aws.amazon.com/code-library/latest/ug/python_3_s3_code_examples.html
# requests package: https://www.simplilearn.com/tutorials/python-tutorial/python-requests