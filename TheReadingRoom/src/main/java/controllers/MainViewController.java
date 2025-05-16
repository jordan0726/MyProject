package controllers;

import UI.BookDisplayFactory;
import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.*;
import javafx.scene.image.ImageView;
import javafx.scene.layout.HBox;
import javafx.scene.layout.VBox;
import javafx.scene.text.Text;
import javafx.stage.Stage;
import models.*;
import java.io.IOException;

public class MainViewController extends BaseController{

    @FXML
    private Button logoutButton; // Logout button
    @FXML
    private Text welcomeMessage; // Welcome message
    @FXML
    private VBox booksContainer; // // The outermost VBox that contains all Spinners
    @FXML
    private HBox recommendationContainer; // The HBox that contains all recommended books
    @FXML
    private ImageView profileIcon; // Profile icon

    private BookManager bookManager;
    private ShoppingCart shoppingCart;
    private BookDisplayFactory bookDisplayFactory;
    private User currentuser;


    @FXML
    public void initialize() {

        // Initialize BookDisplayFactory once
        bookDisplayFactory = new BookDisplayFactory();

        // Check if the BookManager has been set, if not, wait until it's injected
        if (bookManager != null) {
            loadBooksFromDBS(); // Load books if BookManager is already set
        }
    }

    public void setData(ShoppingCart shoppingCart, BookManager bookManager, User user) {
        this.shoppingCart = shoppingCart;
        this.bookManager = bookManager;
        this.currentuser = user;
        // After setting the BookManager, load the books if the view is already initialized
        if (bookDisplayFactory != null) {
            loadBooksFromDBS();  // Load books after BookManager is set
        }

    }

    // Method to load books from the database and display them in the UI
    private void loadBooksFromDBS() {
        if (bookManager != null) {
            // Display the top 7 books by sales in the Recommendation section
            bookDisplayFactory.displayBooksInRecommendation(bookManager.getTopSellingBooks(7), recommendationContainer, this::handleAddToCartInRecommendation);

            // Display the books in the UI
            bookDisplayFactory.displayBooksInRows(bookManager.getAllBooks(), booksContainer, this::handleAddToCart);
        } else {
            System.err.println("BookManager not set, cannot load books.");
        }
    }


    // Method to handle the add to cart action
    @FXML
    public void handleAddToCartInRecommendation(ActionEvent event) {
        Button sourceButton = (Button) event.getSource(); // Get the source button that triggered the event
        String bookId = (String) sourceButton.getUserData(); // Get the book id from the button's user data
        Book associatedBook = bookManager.findBookById(bookId); // Find the book by its id


        if (associatedBook != null) {
            shoppingCart.addBookToShoppingCart(associatedBook, 1); // add to shoppingcart class
        }
        else {
            showAlert(Alert.AlertType.ERROR, "Add to Cart Error", "Failed to add the book to the cart.");
        }
    }

    @FXML
    public void handleAddToCart(ActionEvent event){
        Button sourceButton = (Button) event.getSource(); // Get the source button that triggered the event
        VBox parentVBox = (VBox) sourceButton.getParent(); // Get the parent VBox of the button

        // Find the Spinner in the parent VBox
        Spinner<Integer> quantitySpinner = null;
        for (javafx.scene.Node child : parentVBox.getChildren()) {
            if (child instanceof Spinner) {
                quantitySpinner = (Spinner<Integer>) child;
                break;  // stop when find the spinner
            }
        }

        //Validate the quantity in the spinner
        if (quantitySpinner != null) {
            int quantity = quantitySpinner.getValue();  // Get the quantity from the spinner
            String bookId = (String) sourceButton.getUserData(); // Get the book id from the button's user data
            Book associatedBook = bookManager.findBookById(bookId); // Find the book object by its id

            if (associatedBook != null) { // Check if the book is found
                // Check if the quantity is greater than 0
                if (quantity > 0) {
                    shoppingCart.addBookToShoppingCart(associatedBook, quantity);

                } else {
                    // If the quantity is less than or equal to 0, show an error alert
                    showAlert(Alert.AlertType.ERROR, "Add to Cart Error", "Please select a quantity greater than 0.");
                }
            } else {
                showAlert(Alert.AlertType.ERROR, "Add to Cart Error", "Failed to add the book to the cart.");
            }
        } else {
            showAlert(Alert.AlertType.ERROR, "Add to Cart Error", "No quantity selected.");
        }
    }



    // ☟☟☟------NAV BAR BUTTONS------☟☟☟ //
    // Method to handle the logout action
    @FXML
    public void setWelcomeMessage(String username){
        welcomeMessage.setText("Welcome~ " + username + "🎉");
    }

    @FXML
    private void handleOrder() {
        try {
            // Load the LoginView FXML file
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/fxml/OrderView.fxml"));
            Parent root = loader.load();

            // Get the controller associated with the loaded FXML
            OrderController orderController = loader.getController();

            // Pass the ShoppingCart object to the ShoppingCartViewController
            orderController.setData(shoppingCart, bookManager, currentuser);

            // Get the current stage (window) and set the new scene with LoginView
            Stage stage = (Stage) logoutButton.getScene().getWindow();
            stage.setScene(new Scene(root));
            stage.setTitle("The Reading Room - Order History");
            stage.show();
        } catch (IOException e) {
            e.printStackTrace();
            showAlert(Alert.AlertType.ERROR, "Logout Error", "Unable to load the order page.");
        }
    }

    @FXML
    private void handleShoppingCart(){
        try {
            // Load the LoginView FXML file
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/fxml/ShoppingCartView.fxml"));
            Parent root = loader.load();

            // Get the controller associated with the loaded FXML
            ShoppingCartController shoppingCartController = loader.getController();

            // Pass the ShoppingCart object to the ShoppingCartViewController
            shoppingCartController.setData(shoppingCart, bookManager, currentuser);

            // Get the current stage (window) and set the new scene with LoginView
            Stage stage = (Stage) logoutButton.getScene().getWindow();
            stage.setScene(new Scene(root));
            stage.setTitle("The Reading Room - ShoppingCart");
            stage.show();
        } catch (IOException e) {
            e.printStackTrace();
            showAlert(Alert.AlertType.ERROR, "Logout Error", "Unable to load the shopping cart page.");
        }
    }

    @FXML
    public void handleProfile(){
        try {
            // Load the LoginView FXML file
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/fxml/ProfileView.fxml"));
            Parent root = loader.load();

            // Get the controller associated with the loaded FXML
            ProfileController profileController = loader.getController();

            // Pass the ShoppingCart object to the ShoppingCartViewController
            profileController.setData(shoppingCart, bookManager, currentuser);

            // Get the current stage (window) and set the new scene with LoginView
            Stage stage = (Stage) profileIcon.getScene().getWindow();
            stage.setScene(new Scene(root));
            stage.setTitle("The Reading Room - ShoppingCart");
            stage.show();
        } catch (IOException e) {
            e.printStackTrace();
            showAlert(Alert.AlertType.ERROR, "Logout Error", "Unable to load the shopping cart page.");
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



