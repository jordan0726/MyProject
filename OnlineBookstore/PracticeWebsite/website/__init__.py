from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from os import path
from flask_wtf.csrf import CSRFProtect
from flask_wtf import FlaskForm
from sqlalchemy import or_
from flask_login import LoginManager

db = SQLAlchemy()
DB_NAME = "database.db"


def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'I love ITIS'
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{DB_NAME}'
    app.config["UPLOAD_FOLDER"] = "./static/images"
    app.config["UPLOAD_BOOK_PDF"] = "./static/books_pdf"
    app.config['ALLOWED_IMAGE_EXTENSIONS'] = {'png', 'jpg', 'jpeg'}
    app.config['ALLOWED_PDF_EXTENSIONS'] = {'pdf'}
    app.config['UPLOAD_FOLDER'] = '/Users/rishabh/Desktop/IT Infrastucture and Security/Assignment 3/ITIS-Assignment-3/PracticeWebsite/website/static/Images'
    app.config["UPLOAD_BOOK_PDF"] = "/Users/rishabh/Desktop/IT Infrastucture and Security/Assignment 3/ITIS-Assignment-3/PracticeWebsite/website/static/books_pdf"
    db.init_app(app) # Tell app that this db is the database we're gonna to use
    csrf = CSRFProtect(app)
    
    from .views import views
    from .auth import auth
    

    app.register_blueprint(views, url_prefix = '/')
    app.register_blueprint(auth, url_prefix = '/')

    from .models import User, Book

    login_manager = LoginManager()
    login_manager.login_view = 'auth.login' # Indicate Where we need to go if we're not logged in
    login_manager.init_app(app) #tell login_manager which application we are using
    
    @login_manager.user_loader #tell system use this function to load user
    def load_user(id):
        return User.query.get(int(id))

    create_database(app)

    return app

def create_database(application):
    """
    Check whether the DBs exist, if not, create one.
    """
    if not path.exists('website/' + DB_NAME):
        with application.app_context():
            db.create_all()
        print("Created Database!")
