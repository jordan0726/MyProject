# The Reading Room (Java GUI Project)

This project was developed as part of a Java course to practice object-oriented programming (OOP) principles and programming design patterns. It uses:
- **JavaFX 23.0.0** for the graphical interface
- **JDBC 3.46.1.3** for database connectivity
- **JUnit 5.11.2** for testing

## Project Features
Below is a brief overview of the main features of the project.
### Login Page
- Users can log in using a registered **username** (unique) and **password**, verified against database records.
- If the fields are empty or the credentials are incorrect, an error message prompts the user to re-enter valid information.
- A **Sign Up** option allows new users to create an account. Upon successful registration, a new shopping cart is automatically created for the user in the database.
  

### Main Page
- Upon successful login, users are directed to the **main page**, which displays a personalized welcome message based on their username.
- The main page retrieves and displays the user’s **shopping cart** and **order history**.
- It also showcases the **top 7 best-selling books**. Users can select books and specify quantities to add to their cart.
- The quantity added to the cart cannot exceed the available **stock** for each book.
