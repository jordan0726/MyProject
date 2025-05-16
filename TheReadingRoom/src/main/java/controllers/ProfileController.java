package controllers;

import DAO.UserDAO;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.*;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.stage.Stage;
import models.BookManager;
import models.ShoppingCart;
import models.User;

import java.io.IOException;
import java.sql.SQLException;

public class ProfileController extends BaseController{

    @FXML
    private ImageView backIcon;
    @FXML
    private Button logoutButton;
    @FXML
    private ImageView togglePasswordIcon;  // Replace Icon with ImageView
    @FXML
    private PasswordField passwordField;
    @FXML
    private TextField passwordTextField;  // Plain text field for showing password in visible form
    @FXML
    private Label usernameLabel;
    @FXML
    private TextField firstNameField; // Field for the first name
    @FXML
    private TextField lastNameField; // Field for the last name


    private boolean isPasswordVisible = false;
    private ShoppingCart shoppingCart;
    private BookManager bookManager;
    private User currentuser;


    // Set the ShoppingCart object
    public void setData(ShoppingCart shoppingCart, BookManager bookManager, User user) {
        this.shoppingCart = shoppingCart;
        this.bookManager = bookManager;
        this.currentuser = user;

        reloadProfile();
    }

    @FXML
    public void handleUpdateProfile() {
        String firstName = firstNameField.getText();
        String lastName = lastNameField.getText();
        String password = isPasswordVisible ? passwordTextField.getText() : passwordField.getText(); // Get the password from the visible field if it's visible

        if (firstName.isEmpty() || lastName.isEmpty() || password.isEmpty()) {
            showAlert(Alert.AlertType.ERROR, "Update Profile Error", "Please fill in all fields.");
        }
        else {
            currentuser.setFirstName(firstName);
            currentuser.setLastName(lastName);
            currentuser.setPassword(password);

            // Optionally, save changes to the database (if applicable)
            try {
                // Assuming there's a method in UserDAO to update the user's profile
                UserDAO userDAO = new UserDAO();
                userDAO.updateUserProfile(currentuser); // Save changes to DB
            }
            catch (SQLException e) {
                showAlert(Alert.AlertType.ERROR, "Update Profile Error", "Failed to update profile. Please try again.");
                e.printStackTrace();
            }

            showAlert(Alert.AlertType.INFORMATION, "Update Profile", "Profile updated successfully.");
            reloadProfile();
        }
    }


    @FXML
    public void handleBackToMain(){
        try {
            // Load the LoginView FXML file
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/fxml/MainView.fxml"));
            Parent root = loader.load();

            // Get the MainController and set the welcome message
            MainViewController mainViewController = loader.getController();
            mainViewController.setWelcomeMessage(shoppingCart.getUsername()); // Set the dynamic welcome message
            mainViewController.setData(shoppingCart, bookManager, currentuser);


            // Get the current stage (window) and set the new scene with MainView
            Stage stage = (Stage) backIcon.getScene().getWindow();
            stage.setScene(new Scene(root));
            stage.setTitle("The Reading Room - Main");
            stage.show();
        } catch (IOException e) {
            e.printStackTrace();
            showAlert(Alert.AlertType.ERROR, "Logout Error", "Unable to load the Main page.");
        }
    }

    @FXML
    public void handleLogout() {
        try {
            // Load the LoginView FXML file
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/fxml/LoginView.fxml"));
            Parent root = loader.load();

            // Get the current stage (window) and set the new scene with LoginView
            Stage stage = (Stage) logoutButton.getScene().getWindow();
            stage.setScene(new Scene(root));
            stage.setTitle("The Reading Room - Login");
            stage.show();
        }
        catch (IOException e) {
            e.printStackTrace();
            showAlert(Alert.AlertType.ERROR, "Logout Error", "Unable to logout and return to login page.");
        }
    }

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

    //
    public void reloadProfile(){
        usernameLabel.setText(currentuser.getUsername());
        firstNameField.setText(currentuser.getFirstName());
        lastNameField.setText(currentuser.getLastName());
        passwordField.setText(currentuser.getPassword());
        passwordTextField.setText(currentuser.getPassword());
    }

}
