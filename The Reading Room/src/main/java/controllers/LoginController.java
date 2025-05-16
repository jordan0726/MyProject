package controllers;
import DAO.BookDAO;
import DAO.ShoppingCartDAO;
import DAO.UserDAO;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.Alert;
import javafx.scene.control.PasswordField;
import javafx.scene.control.TextField;
import javafx.stage.Stage;
import models.*;

import java.io.IOException;
import java.sql.*;


public class LoginController extends BaseController {
    @FXML
    private TextField usernameField;
    @FXML
    private PasswordField passwordField;
    private Stage stage;
    private ShoppingCartDAO shoppingCartDAO = new ShoppingCartDAO();
    private BookManager bookManager;

    @FXML
    public void initialize(){
        // Initialize the database
        bookManager = new BookManager(new BookDAO()); //When user lauch the app, the bookManager will be initialized
    }

    // method to handle the login button click event
    @FXML
    public void handleLogin(){
        String username = usernameField.getText(); // get the username from the username field
        String password = passwordField.getText(); // get the password from the password field

        if (username.isEmpty() || password.isEmpty()){
            showAlert(Alert.AlertType.ERROR, "Login Error!", "Username and Password cannot be empty.");
            return; // Exit the method if username or password is empty
        }

        try{
            // validate the login credentials
            if (validateLogin(username, password)) {
                showAlert(Alert.AlertType.INFORMATION, "Login Successful!", "Welcome " + username + "🎉");

                // create or get the corresponding shopping cart for the currentuser
                shoppingCartDAO.createShoppingCartForUser(username);

                // Retrieve the shopping cart items and instantiate the ShoppingCart class
                ShoppingCart shoppingCart = shoppingCartDAO.getShoppingCartForUser(username, bookManager);

                //Retrieve the currentuser information from the database
                UserDAO userDAO = new UserDAO();
                User currentuser = userDAO.getUserFromDB(username);

                // Load the MainView.fxml or AdminView.fxml based on the user role
                FXMLLoader loader;
                if (username.equals("admin")) {
                    // Load AdminView.fxml for admin user
                    loader = new FXMLLoader(getClass().getResource("/fxml/AdminView.fxml"));
                } else {
                    // Load MainView.fxml for normal user
                    loader = new FXMLLoader(getClass().getResource("/fxml/MainView.fxml"));
                }
                Parent root = loader.load();

                // Get the MainController or AdminController based on the FXML loaded
                if (username.equals("admin")) {
                    AdminController adminController = loader.getController();
                    adminController.setWelcomeMessage(username); // Set the dynamic welcome message
                    adminController.setData(bookManager);
                } else {
                    MainViewController mainViewController = loader.getController();
                    mainViewController.setWelcomeMessage(username); // Set the dynamic welcome message
                    mainViewController.setData(shoppingCart, bookManager, currentuser);
                }

                // Get the current stage (window) and set the new scene to MainView
                Stage stage = (Stage) usernameField.getScene().getWindow();
                Scene scene = new Scene(root);
                stage.setScene(scene);
                stage.setTitle("The Reading Room - " + (username.equalsIgnoreCase("admin") ? "Admin" : "Main"));

            }
            else{
                showAlert(Alert.AlertType.ERROR, "Login Error!", "Invalid Username or Password.");
            }
        }
        catch (SQLException | IOException e) {
            e.printStackTrace();
            showAlert(Alert.AlertType.ERROR, "Error", "An error occurred: " + e.getMessage());
        }

    }

    public void handleSignUp(){
        try{
            //Load the SignUpView.fxml
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/fxml/SignUpView.fxml"));
            Scene signUpScene = new Scene(loader.load(), 720, 400);

            // Get current stage and switch to Sign Up scene
            Stage currentStage = (Stage) usernameField.getScene().getWindow();
            currentStage.setScene(signUpScene);
            currentStage.setTitle("The Reading Room - Sign Up");
        }
        catch (IOException e){
            e.printStackTrace();
            showAlert(Alert.AlertType.ERROR, "Page Load Error", "Could not load Sign Up page.");
        }
    }

    private boolean validateLogin(String username, String password) throws SQLException{
        // Use SQL query to check if the username and password match any record in the database
        String sqlQuery = "SELECT * FROM users WHERE username = ? AND password = ?";

        // Use try-with-resources to automatically close resources
        try (Connection conn = DriverManager.getConnection("jdbc:sqlite:TheReadingRoom.db");
             PreparedStatement pstmt = conn.prepareStatement(sqlQuery)) {

            pstmt.setString(1, username); // Set the username in the SQL query
            pstmt.setString(2, password); // Set the password in the SQL query

            try (ResultSet rs = pstmt.executeQuery()) { // Execute query and get the result
                return rs.next(); // If result exists, login is successful
            }

        } catch (SQLException e) {
            e.printStackTrace(); // Print stack trace if an SQL exception occurs
            throw e; // Re-throw the exception for higher-level handling
        }
    }

}

