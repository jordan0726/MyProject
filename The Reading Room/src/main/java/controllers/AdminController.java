package controllers;

import DAO.BookDAO;
import UI.BookDisplayFactory;
import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.Alert;
import javafx.scene.control.Button;
import javafx.scene.control.Spinner;
import javafx.scene.layout.VBox;
import javafx.scene.text.Text;
import javafx.stage.Stage;
import models.Book;
import models.BookManager;
import models.ShoppingCart;
import models.User;

import java.io.IOException;
import java.sql.SQLException;

public class AdminController extends BaseController {
    @FXML
    private Text welcomeMessage; // Welcome message
    @FXML
    private Button logoutButton; // Logout button
    @FXML
    private Button updateStockButton; // Update stock button
    @FXML
    private VBox booksContainer; // The outermost VBox that contains all books

    private BookManager bookManager;

    public void setData(BookManager bookManager) {
        this.bookManager = bookManager;

        BookDisplayFactory bookDisplayFactory = new BookDisplayFactory();
        bookDisplayFactory.displayBooksInAdmin(bookManager.getAllBooks(), booksContainer, this::handleUpdateStock);
    }

    @FXML
    public void handleUpdateStock(ActionEvent event) {
        // Get the source button that triggered the event
        Button sourceButton = (Button) event.getSource();
        VBox parentVBox = (VBox) sourceButton.getParent(); // Get the parent VBox of the button

        // Find the Spinner in the parent VBox
        Spinner<Integer> stockSpinner = null;
        for (javafx.scene.Node child : parentVBox.getChildren()) {
            if (child instanceof Spinner) {
                stockSpinner = (Spinner<Integer>) child;
                break; // Stop when finding the spinner
            }
        }

        // Validate the stock value in the spinner
        if (stockSpinner != null) {
            int newStock = stockSpinner.getValue(); // Get the new stock value from the spinner
            Book associatedBook = (Book) sourceButton.getUserData(); // Get the book object from the button's user data

            if (associatedBook != null) { // Check if the book object is found
                // Update the book's stock with the new value
                associatedBook.setStock(newStock);

                try {
                    // Use BookDAO to update the stock in the database
                    BookDAO bookDAO = new BookDAO();
                    bookDAO.updateStock(associatedBook.getId(), newStock);

                    // Show a success message
                    showAlert(Alert.AlertType.INFORMATION, "Stock Update Successful", "Stock updated successfully for \"" + associatedBook.getTitle() + "\".");
                } catch (SQLException e) {
                    e.printStackTrace();
                    showAlert(Alert.AlertType.ERROR, "Stock Update Error", "Failed to update the stock due to a database error: " + e.getMessage());
                }
            } else {
                showAlert(Alert.AlertType.ERROR, "Stock Update Error", "Failed to update the stock. Book object is not found.");
            }
        } else {
            showAlert(Alert.AlertType.ERROR, "Stock Update Error", "No stock value selected.");
        }
    }



    // Method to handle the logout action
    @FXML
    public void setWelcomeMessage(String username){
        welcomeMessage.setText("Welcome~ " + username + "🎉");
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
