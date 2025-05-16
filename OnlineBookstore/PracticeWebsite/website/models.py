from website import db # = from website import db
from flask_login import UserMixin
from sqlalchemy.sql import func


class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key = True)
    last_name = db.Column(db.String(150))
    first_name = db.Column(db.String(150))
    studentID = db.Column(db.String(150),unique = True)
    password = db.Column(db.String(150))
    email = db.Column(db.String(150), unique = True) #Every user's email should be unique
    
    

class Book(db.Model):
    __tablename__ = 'books'
    bookid = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    author = db.Column(db.String(255))
    description = db.Column(db.Text)
    subtitle = db.Column(db.String(255))
    edition = db.Column(db.String(50))
    genre = db.Column(db.String(200), nullable=False)
    language = db.Column(db.String(50))
    year = db.Column(db.Integer)
    pages = db.Column(db.Integer, nullable=True)
    cover_image_url = db.Column(db.String(300), nullable=True)
    upload_image_name = db.Column(db.String(300), nullable=True)