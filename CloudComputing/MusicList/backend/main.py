
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse #Default response fro FastAPI is JSONResponse, this can make it response in HTML
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pathlib import Path

app = FastAPI()

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR/'frontend'
# Serve static files (html/css/js) locate in the frontend folder
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

# Jinja2 template
templates = Jinja2Templates(directory=str(FRONTEND_DIR))

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """
   Root endpoint that renders and returns the 'index.html' page.
   The HTML file should be located within the 'frontend' directory.
   """
    return templates.TemplateResponse("index.html", {"request": request})


# Reference:
# S3 creating and upload file: https://docs.aws.amazon.com/code-library/latest/ug/python_3_s3_code_examples.html
# requests package: https://www.simplilearn.com/tutorials/python-tutorial/python-requests