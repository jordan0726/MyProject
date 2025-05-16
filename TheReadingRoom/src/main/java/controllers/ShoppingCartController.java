package controllers;

import UI.ShoppingCartDisplayFactory;
import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.Alert;
import javafx.scene.control.Button;
import javafx.scene.control.ButtonBar;
import javafx.scene.control.ButtonType;
import javafx.scene.image.ImageView;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;
import models.Book;
import models.BookManager;
import models.ShoppingCart;
import javafx.scene.text.Text;
import models.User;

import java.io.IOException;

public class ShoppingCartController extends BaseController{

    @FXML
    private ImageView backIcon;
    @FXML
    private Button logoutButton;
    @FXML
    private Button checkoutButton;
    @FXML
    private VBox booksContainer;
    @FXML
    private Text emptyMessage;

    private ShoppingCart shoppingCart;
    private BookManager bookManager;
    private User currentuser;


    // Set the ShoppingCart object
    public void setData(ShoppingCart shoppingCart, BookManager bookManager, User user) {
        this.shoppingCart = shoppingCart;
        this.bookManager = bookManager;
        this.currentuser = user;

        // Hide the message by default
        emptyMessage.setVisible(false);

        // Clear the container before adding new items
        booksContainer.getChildren().clear();

        // Check if the shopping cart is empty
        if (shoppingCart.getCartItems().isEmpty()) {
            // Show the empty cart message if the cart is empty
            emptyMessage.setVisible(true);
        }
        else {
            // Use ShoppingCartDisplayFactory to display cart items
            ShoppingCartDisplayFactory displayFactory = new ShoppingCartDisplayFactory(booksContainer);
            displayFactory.displayShoppingCartItems(shoppingCart, this::handleRemoveFromCart, this::handleCheckOut);
        }

    }

    // Method to handle removing items from the cart
    @FXML
    private void handleRemoveFromCart(ActionEvent event) {
        Button sourceButton = (Button) event.getSource(); // Get the source button that triggered the event
        Book book = (Book) sourceButton.getUserData(); // Get the book from the button's user data

        if (book != null) {
            shoppingCart.removeBookFromCart(book); // Remove the book from the shopping cart

            //Refresh the cart display
            ShoppingCartDisplayFactory displayFactory = new ShoppingCartDisplayFactory(booksContainer);
            displayFactory.displayShoppingCartItems(shoppingCart, this::handleRemoveFromCart, this::handleCheckOut);
        } else {
            showAlert(Alert.AlertType.ERROR, "Remove Error", "Failed to remove the book , from the cart.");
        }
    }

    @FXML
    // Method to handle check out action
    private void handleCheckOut(ActionEvent event) {
        double totalPrice = shoppingCart.calculateTotalPrice(); // Calculate total price
        if (totalPrice == 0) {
            showAlert(Alert.AlertType.ERROR, "Check Out Error", "Your shopping cart is empty.");
        } else {
            // Create a confirmation alert with options to proceed or cancel
            Alert confirmationAlert = new Alert(Alert.AlertType.CONFIRMATION);
            confirmationAlert.setTitle("Check Out Confirmation");
            confirmationAlert.setHeaderText("Total amount: $" + totalPrice);
            confirmationAlert.setContentText("Do you want to proceed to checkout or cancel?");

            // Add Proceed and Cancel buttons
            ButtonType proceedButton = new ButtonType("Proceed", ButtonBar.ButtonData.LEFT);
            ButtonType cancelButton = new ButtonType("Cancel", ButtonBar.ButtonData.CANCEL_CLOSE);

            confirmationAlert.getButtonTypes().setAll(proceedButton, cancelButton);

            // Wait for user's response
            confirmationAlert.showAndWait().ifPresent(response -> {
                if (response == proceedButton) {
                    // Proceed with the checkout process
                    handleProceedWithCheckout();
                }
                // if "Cancel" is selected, the alert will close automatically
            });
        }
    }

    // Method to proceed with the checkout logic
    private void handleProceedWithCheckout() {
        try {
            // Load the PaymentView FXML file
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/fxml/PaymentView.fxml"));
            Parent root = loader.load();

            // Get the controller for PaymentView and pass shoppingCart and bookManager
            PaymentController paymentController = loader.getController();
            paymentController.setData(shoppingCart, bookManager, currentuser); // Pass both shoppingCart and bookManager

            // Get the current stage (window) and set the new scene with PaymentView
            Stage stage = (Stage) booksContainer.getScene().getWindow();
            stage.setScene(new Scene(root));
            stage.setTitle("The Reading Room - Payment");
            stage.show();
        }
        catch (IOException e) {
            e.printStackTrace();
            showAlert(Alert.AlertType.ERROR, "Checkout Error", "Unable to load the payment page.");
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

}

