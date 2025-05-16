package controllers;

import DAO.ShoppingCartDAO;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.Alert;
import javafx.scene.control.PasswordField;
import javafx.scene.control.TextField;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.stage.Stage;

import java.io.IOException;
import java.sql.*;

public class SignUpController extends BaseController{
    @FXML
    private TextField usernameField;
    @FXML
    private PasswordField passwordField;
    @FXML
    private TextField passwordTextField;  // Plain text field for showing password in visible form
    @FXML
    private TextField firstNameField;
    @FXML
    private TextField lastNameField;
    @FXML
    private javafx.scene.control.Button signUpButton;
    @FXML
    private ImageView backIcon;
    @FXML
    private ImageView togglePasswordIcon;  // Replace Icon with ImageView
    private boolean isPasswordVisible = false;
    private ShoppingCartDAO shoppingCartDAO = new ShoppingCartDAO();

    // Method to toggle the visibility of the password
    @FXML
    public void togglePasswordVisibility() {
        if (isPasswordVisible) {
            // Hide the password, show the passwordField (masked)
            passwordTextField.setVisible(false);
            passwordField.setText(passwordTextField.getText());
            passwordField.setVisible(true);
            // Change the icon to "eye open"
            togglePasswordIcon.setImage(new Image(getClass().getResourceAsStream("/visibility.png")));
            isPasswordVisible = false;
        } else {
            // Show the password in TextField (unmasked)
            passwordField.setVisible(false);
            passwordTextField.setText(passwordField.getText());
            passwordTextField.setVisible(true);
            // Change the icon to "eye closed"
            togglePasswordIcon.setImage(new Image(getClass().getResourceAsStream("/visibility-off.png")));
            isPasswordVisible = true;
        }
    }

    // Method to handle the sign-up action
    @FXML
    public void handleSignUp() {
        String username = usernameField.getText();
        String password = isPasswordVisible ? passwordTextField.getText() : passwordField.getText();
        String firstName = firstNameField.getText();
        String lastName = lastNameField.getText();

        // Check if any field is empty
        if (username.isEmpty() || password.isEmpty() || firstName.isEmpty() || lastName.isEmpty()) {
            showAlert(Alert.AlertType.ERROR, "Sign Up Error!", "All fields must be filled.");
            return;
        }

        // Try to add the user to the database
        try {
            if (addUserToDatabase(username, password, firstName, lastName)) {
                showAlert(Alert.AlertType.INFORMATION, "Sign Up Successful!", "User has been successfully created.");
                shoppingCartDAO.createShoppingCartForUser(username);
                // Load the login page after successful sign-up
                FXMLLoader loader = new FXMLLoader(getClass().getResource("/fxml/LoginView.fxml"));
                Parent root = loader.load();

                // Get the current stage (window) and set the new scene to login page
                Stage stage = (Stage) signUpButton.getScene().getWindow();
                Scene scene = new Scene(root);
                stage.setScene(scene);
                stage.setTitle("The Reading Room - Login");
            }
            else {
                showAlert(Alert.AlertType.ERROR, "Sign Up Error!", "Username already exists.");
            }
        } catch (SQLException e) {
            e.printStackTrace();
            showAlert(Alert.AlertType.ERROR, "Database Error!", "An error occurred while accessing the database.");
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    @FXML
    public void handleBackToLogin() {
        try {
            // Load the login page after successful sign-up
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/fxml/LoginView.fxml"));
            Parent root = loader.load();

            // Get the current stage (window) and set the new scene to login page
            Stage stage = (Stage) backIcon.getScene().getWindow();
            Scene scene = new Scene(root);
            stage.setScene(scene);
            stage.setTitle("The Reading Room - Login");

        } catch (IOException e) {
            e.printStackTrace();
            showAlert(Alert.AlertType.ERROR, "Page Load Error", "Could not load Login page.");
        }
    }

    // Method to add the user to the database
    public boolean addUserToDatabase(String username, String password, String firstName, String lastName) throws SQLException {

        // SQL query to insert the user into the database
        String sqlQuery = "INSERT INTO users(username, password, first_name, last_name) VALUES(?, ?, ?, ?)";

        // Try to connect to the database and insert the user
        try {
            Connection conn = DriverManager.getConnection("jdbc:sqlite:TheReadingRoom.db");
            PreparedStatement pstmt = conn.prepareStatement(sqlQuery);

            pstmt.setString(1, username);
            pstmt.setString(2, password);
            pstmt.setString(3, firstName);
            pstmt.setString(4, lastName);

            pstmt.executeUpdate();
            return true; // Insertion successful
        } catch (SQLException e) {
            if (e.getMessage().contains("UNIQUE constraint failed")) {
                return false; // Username already exists
            } else {
                throw e; // Other SQL exception error
            }
        }
    }

}
