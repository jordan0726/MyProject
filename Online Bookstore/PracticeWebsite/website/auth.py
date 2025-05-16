from flask import Blueprint, render_template, request, flash, redirect, url_for, session
from .models import User
from werkzeug.security import generate_password_hash, check_password_hash
from . import db
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField
from wtforms.validators import DataRequired, Email
from sqlalchemy import or_
from flask_login import login_user, login_required, logout_user, current_user

auth = Blueprint('auth', __name__)

class LoginForm(FlaskForm):
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired()])
    submit = SubmitField('Login')

class RegistrationForm(FlaskForm):
    last_name = StringField('Last Name', validators=[DataRequired()])
    first_name = StringField('First Name', validators=[DataRequired()])
    studentID = StringField('Student ID', validators=[DataRequired()])
    password = PasswordField('Password',validators=[DataRequired()])
    password2 = PasswordField('Password 2',validators=[DataRequired()])
    email = StringField('Email', validators=[DataRequired(), Email()])

@auth.route('/login', methods = ['GET', 'POST'])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        input_email = form.email.data
        input_password = form.password.data
        user = User.query.filter_by(email = input_email).first()
        if user:
            if check_password_hash(user.password, input_password): #hash variable password to compare with the hash password store in the User DBs
                flash('Logged in successfully!', category='success')
                session['email'] = input_email # successfully log in, store the user's email to session
                login_user(user, remember=True)
                return redirect(url_for('views.home'))
            else:
                flash('Incorrect password, try again', category='invalid_input')
        else:
            flash("Email doesn't exist.", category='invalid_input')
    return render_template("login.html", user=current_user,form = form)

@auth.route('/logout')
@login_required
def logout():
    logout_user()
    session.pop('email', None)  # 從 session 中移除使用者名稱
    session.pop('_flashes', None)  # 清除閃現消息
    return redirect(url_for('auth.login'))

@auth.route('/sign-up', methods = ['GET', 'POST'])
def sign_up():
    form = RegistrationForm()
    if form.validate_on_submit():
        last_name = request.form.get('last_name')
        first_name = request.form.get('first_name')
        studentID = request.form.get("studentID")
        password = request.form.get('password')
        password2 = request.form.get('password2')
        email = request.form.get('email')

        user = User.query.filter_by(email = email).first()
        if user:
            flash('Email already exists.', category='invalid_input')
        elif password != password2:
            flash('Passwords don\'t match.', category = 'invalid_input')
        elif len(password) < 7:
            flash('Password must be greater than 7 character.', category = 'invalid_input')
        else: #add user to database
            new_user = User(last_name=last_name, first_name=first_name, studentID=studentID, password=generate_password_hash(password, method='pbkdf2:sha256'), email=email)
            db.session.add(new_user)
            db.session.commit()

            # 確保新用戶創建後能夠正確加載
            user = User.query.filter_by(email=email).first()
            if user is None:
                flash('An error occurred while creating your account. Please try again.', 'danger')
                return redirect(url_for('auth.sign_up'))

            flash('Account created!', category = 'success')
            return redirect(url_for('auth.login'))
          
    return render_template("sign_up.html", user=current_user,form = form)