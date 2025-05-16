from flask import Blueprint, render_template, flash, redirect, url_for, session, send_from_directory,current_app
from flask_login import login_required, current_user
from .models import Book,User
from flask_wtf import FlaskForm
from wtforms import StringField, SubmitField,TextAreaField,FileField
from wtforms.validators import DataRequired
from werkzeug.utils import secure_filename
from sqlalchemy import or_
from website import db # = from website import db
import os
import boto3



views = Blueprint('views', __name__)

class SearchForm(FlaskForm):
    search = StringField("Searched",validators=[DataRequired()])
    submit = SubmitField("Submit")

class EditBook(FlaskForm):
    book_title = StringField("Book Title",validators=[DataRequired()])
    subtitle = StringField("Sub Title")
    author = StringField("Author")
    description = TextAreaField("Description")
    edition = StringField("Edtion")
    genre = StringField("Genre",validators=[DataRequired()])
    language =  StringField("Language")
    year = StringField("Year")
    pages = StringField("Pages")

class AddBooks(FlaskForm):
    book_title = StringField("Book Title",validators=[DataRequired()])
    subtitle = StringField("Sub Title",validators=[DataRequired()])
    author = StringField("Author",validators=[DataRequired()])
    description = TextAreaField("Description",validators=[DataRequired()])
    edition = StringField("Edtion",validators=[DataRequired()])
    genre = StringField("Genre",validators=[DataRequired()])
    language =  StringField("Language",validators=[DataRequired()])
    year = StringField("Year",validators=[DataRequired()])
    pages = StringField("Pages",validators=[DataRequired()])
    cover_image_url = FileField("Book Cover Image",validators=[DataRequired()])
    upload_image_name = FileField("Bood PDF",validators=[DataRequired()])


def allowed_file(filename, allowed_extensions):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions


@views.route("/download/<int:id>")
def download(id):
    my_book = Book.query.get_or_404(id)
    if my_book:
        my_book_name = my_book.upload_image_name
        print(my_book_name)
        return send_from_directory(current_app.config["UPLOAD_BOOK_PDF"],my_book_name,as_attachment = True)
    
@views.route('/users',methods=["POST","GET"])
def getUsers():
    form = SearchForm()
    if form.validate_on_submit():
        search = form.search.data
        users = User.query.filter(or_(User.first_name.like(f'%{search}%'),User.last_name.like(f'%{search}%'),User.studentID.like(f'%{search}%'))).all()
        return render_template('admin/users.html',users = users)
    users = User.query.all()
    return render_template('admin/users.html',users = users)

@views.route('/deleteUser/<int:id>',methods=["POST","GET"])
def delete_user(id):
    user = User.query.get_or_404(id)
    db.session.delete(user)
    db.session.commit()
    flash("User Deleted successfully!", category="invalid_input")
    return redirect(url_for('views.getUsers'))


@views.route('/addbooks',methods=["POST","GET"])
def addBooks():
    form = AddBooks()
    if form.validate_on_submit():
        new_book = Book(
            title=form.book_title.data,
            subtitle=form.subtitle.data,
            author=form.author.data,
            description=form.description.data,
            edition=form.edition.data,
            genre=form.genre.data,
            language=form.language.data,
            year=form.year.data,
            pages=form.pages.data
        )
        
        if form.cover_image_url.data:
            image_file = form.cover_image_url.data
            if allowed_file(image_file.filename, current_app.config['ALLOWED_IMAGE_EXTENSIONS']):
                filename = secure_filename(image_file.filename)
                image_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
                image_file.save(image_path)
                new_book.cover_image_url = filename
        
        if form.upload_image_name.data:
            pdf_file = form.upload_image_name.data
            if allowed_file(pdf_file.filename, current_app.config['ALLOWED_PDF_EXTENSIONS']):
                filename = secure_filename(pdf_file.filename)
                pdf_path = os.path.join(current_app.config['UPLOAD_BOOK_PDF'], filename)
                pdf_file.save(pdf_path)
                new_book.upload_image_name = filename

        db.session.add(new_book)
        db.session.commit()

        flash("Book added successfully!", category="success")
        return redirect(url_for('views.admin_home'))
    return render_template('admin/addBooks.html', form=form)


@views.route('/delete/<int:id>', methods=["POST","GET"])
def delete_book(id):
    book = Book.query.get_or_404(id)
    
    # Get the PDF and cover image file names and construct their paths
    pdf_filename = book.upload_image_name
    cover_image_filename = book.cover_image_url
    pdf_path = os.path.join(current_app.config['UPLOAD_BOOK_PDF'], pdf_filename)
    cover_image_path = os.path.join(current_app.config['UPLOAD_FOLDER'], cover_image_filename)
    
    # Delete the book from the database
    db.session.delete(book)
    db.session.commit()
    
    # Check if the PDF file exists and delete it
    if os.path.exists(pdf_path):
        os.remove(pdf_path)
    
    # Check if the cover image file exists and delete it
    if os.path.exists(cover_image_path):
        os.remove(cover_image_path)
    
    flash("Book Deleted successfully!", category="invalid_input")
    return redirect(url_for('views.getBook'))



@views.route('/edit/<int:id>',methods=["POST","GET"])
def editBooks(id):
    book = Book.query.get_or_404(id)
    form = EditBook()
    if form.validate_on_submit():
        book.title = form.book_title.data
        book.subtitle = form.subtitle.data
        book.author = form.author.data
        book.description = form.description.data
        book.edition = form.edition.data
        book.genre = form.genre.data
        book.language = form.language.data
        book.year = form.year.data
        book.pages = form.pages.data
        db.session.commit()  # Commit the changes to the database
        flash("Updated Succesfully",category="success")
        return redirect(url_for('views.admin_home'))
    return render_template('admin/editBook.html',book = book,form = form)
    

@views.route('/mybooks',methods=["POST","GET"])
def getBook():
    form = SearchForm()
    if form.validate_on_submit():
        search = form.search.data
        book_data = Book.query.filter(or_(Book.title.like(f'%{search}%'),Book.genre.like(f'%{search}%'),Book.author.like(f'%{search}%'))).all()
        return render_template('admin/mybooks.html',book_data = book_data)
    book_data = Book.query.all()
    return render_template('admin/mybooks.html',book_data = book_data)

@views.route('admin/',methods=["POST","GET"])
def admin_home():
    book_data = Book.query.all()
    users = User.query.all()
    return render_template('admin/home.html',book_data=book_data,users=users)

@views.route('/')
@login_required
def home():
    book_data = Book.query.all()
    if 'email' in session:
        return render_template('home.html', user=current_user,book_data = book_data)  # redirect to logged user's home page
    else:
        return redirect(url_for('auth.login'))  # redirect to login page
    
@views.route("/uploaded_file/<filename>")
def uploaded_file(filename):
    return send_from_directory(current_app.config["UPLOAD_FOLDER"],filename)

@views.route("/search",methods=["POST"])
def search():
    form = SearchForm()
    if form.validate_on_submit():
        search = form.search.data
        book_data = Book.query.filter(or_(Book.title.like(f'%{search}%'),Book.genre.like(f'%{search}%'))).all()
        if not book_data:
            flash("No Books Found",category="invalid_input")
            return redirect(url_for("views.home"))
        return render_template('home.html', user=current_user, form = form,book_data = book_data)  # redirect to logged user's home page
    return redirect(url_for("views.home"))