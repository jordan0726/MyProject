package controllers;

import DAO.BookDAO;
import DAO.OrderDAO;
import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.Alert;
import javafx.scene.control.Button;
import javafx.scene.control.TextField;
import javafx.scene.image.ImageView;
import javafx.stage.Stage;
import models.*;
import java.util.Random;

import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.YearMonth;

import java.io.IOException;

public class PaymentController extends BaseController{

    @FXML
    private ImageView backIcon;
    @FXML
    private Button logoutButton;

    @FXML
    private TextField cardNumberField;  // 16-digit card number
    @FXML
    private TextField monthField;       // Expiry month
    @FXML
    private TextField yearField;        // Expiry year
    @FXML
    private TextField cvvField;         // 3-digit CVV
    @FXML
    private Button payButton;           // Pay button
    @FXML
    private Button cancelButton;        // Cancel button

    private ShoppingCart shoppingCart;
    private BookManager bookManager;
    private User currentuser;

    // Set the ShoppingCart object
    public void setData(ShoppingCart shoppingCart, BookManager bookManager, User user) {
        this.shoppingCart = shoppingCart;
        this.bookManager = bookManager;
        this.currentuser = user;
    }


    // Handle Pay button action
    @FXML
    private void handlePay(ActionEvent event){
        String cardNumber = cardNumberField.getText();
        String expiryMonth = monthField.getText();
        String expiryYear = yearField.getText();
        String cvv = cvvField.getText();

        // Validate card number (should be exactly 16 digits)
        if (!isValidCardNumber(cardNumber)) {
            showAlert(Alert.AlertType.ERROR, "Invalid Card Number", "Please enter a valid 16-digit card number.");
            return;
        }

        // Validate expiry date (MM/YYYY)
        if (!isValidExpiryDate(expiryMonth, expiryYear)) {
            showAlert(Alert.AlertType.ERROR, "Invalid Expiry Date", "Please enter a valid expiry date (MM/YYYY).");
            return;
        }

        // Validate CVV (should be exactly 3 digits)
        if (!isValidCVV(cvv)) {
            showAlert(Alert.AlertType.ERROR, "Invalid CVV", "Please enter a valid 3-digit CVV.");
            return;
        }

        // Create an Order object from the shopping cart
        Order newOrder = createOrderFromShoppingCart();

        // If all inputs are valid, proceed to payment processing
        showAlert(Alert.AlertType.INFORMATION, "Payment Success", "Your payment was successful.\nOrder number: " + newOrder.getOrderNumber());

        // Update the stock of each book in the shopping cart
        if (!updateBookStocksAndSales()) {
            return; // If stock update failed, exit the method
        }

        shoppingCart.clearCart(); // Clear the shopping cart after payment

        // Redirect to the MainView
        backToMain();
    }

    @FXML
    private void handleCancel(ActionEvent event){
        try {
            // Load the LoginView FXML file
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/fxml/MainView.fxml"));
            Parent root = loader.load();

            // Get the MainController and set the welcome message
            MainViewController mainViewController = loader.getController();
            mainViewController.setWelcomeMessage(shoppingCart.getUsername()); // Set the dynamic welcome message
            mainViewController.setData(shoppingCart, bookManager, currentuser);


            // Get the current stage (window) and set the new scene with MainView
            Stage stage = (Stage) cancelButton.getScene().getWindow();
            stage.setScene(new Scene(root));
            stage.setTitle("The Reading Room - Main");
            stage.show();
        } catch (IOException e) {
            e.printStackTrace();
            showAlert(Alert.AlertType.ERROR, "Logout Error", "Unable to load the shopping cart page.");
        }
    }

    @FXML
    public void handleBackToShoppingCartView(){

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


    //-------- BELOW IS HELPER METHOD AREA -------//
    // Helper method to validate card number (16 digits)
    private boolean isValidCardNumber(String cardNumber) {
        return cardNumber.matches("\\d{16}");
    }

    private boolean isValidExpiryDate(String month, String year) {
        // Check if the month is between 01 and 12, and if the year is a 4-digit number
        if (!month.matches("(0[1-9]|1[0-2])") || !year.matches("\\d{4}")) {
            return false;
        }

        // Convert the input month and year into a YearMonth object
        int inputMonth = Integer.parseInt(month);
        int inputYear = Integer.parseInt(year);
        YearMonth inputDate = YearMonth.of(inputYear, inputMonth);

        // Get the current YearMonth (the current month and year)
        YearMonth currentDate = YearMonth.now();

        // Check if the input date is in the future or equal to the current month
        return inputDate.isAfter(currentDate) || inputDate.equals(currentDate);
    }

    // Helper method to validate CVV (3 digits)
    private boolean isValidCVV(String cvv) {
        return cvv.matches("\\d{3}");
    }

    // Method to create an Order and OrderItems from the ShoppingCart
    private Order createOrderFromShoppingCart() {
        OrderDAO orderDAO = new OrderDAO();

        // Generate a unique order ID (for example, you could use a UUID or a simple incrementing ID)
        String orderNumber = generateOrderNumber();

        // Get the total price of the cart
        double totalPrice = shoppingCart.calculateTotalPrice();

        // Get the current date and time
        LocalDateTime dateTime = LocalDateTime.now();

        // Create the Order object (initialize with no items yet)
        Order newOrder = new Order(orderNumber, shoppingCart.getUsername(), dateTime, totalPrice);

        // Create OrderItems for each CartItem in the shopping cart
        for (CartItem cartItem : shoppingCart.getCartItems()) {
            // Create an OrderItem for each CartItem
            OrderItem orderItem = new OrderItem(
                    cartItem.getBook().getId(), // Book ID
                    cartItem.getBook().getTitle(), // Book title
                    cartItem.getQuantity(), // Quantity
                    cartItem.getBook().getPrice() // Price at the time of purchase
            );

            // Add the OrderItem to the Order
            newOrder.addOrderItem(orderItem);
            // Insert the OrderItem into the database
            try {
                orderDAO.addOrderItem(orderNumber, cartItem.getBook().getId(), cartItem.getQuantity(), cartItem.getBook().getPrice());
            } catch (SQLException e) {
                e.printStackTrace();
                showAlert(Alert.AlertType.ERROR, "Database Error", "Failed to generate order.");
                return null; // Exit the method if an error occurs
            }
        }

        // Insert the Order into the database
        try {
            orderDAO.addOrder(newOrder);
        } catch (SQLException e) {
            e.printStackTrace();
            showAlert(Alert.AlertType.ERROR, "Database Error", "Failed to generate order.");
            return null; // Exit the method if an error occurs
        }

        // Return the complete Order object
        return newOrder;
    }

    // Method to generate a unique order number
    public static String generateOrderNumber() {
        // Get the last 4 digits of the current timestamp
        String timePart = String.valueOf(System.currentTimeMillis() % 10000);

        // Generate a 3-digit random number
        Random random = new Random();
        String randomPart = String.format("%03d", random.nextInt(1000));

        // Combine the time part and random part to create the order number
        return timePart + randomPart;
    }

    // Helper method to update the stock of each book in the shopping cart
    private boolean updateBookStocksAndSales() {
        BookDAO bookDAO = new BookDAO();

        try {
            for (CartItem item : shoppingCart.getCartItems()) {
                Book book = item.getBook();
                int quantityPurchased = item.getQuantity();
                int newStock = book.getStock() - quantityPurchased; // Calculate the new stock
                int newSales = book.getSales() + quantityPurchased; // Calculate the new sales

                // Double check again: If the new stock is less than 0, return false and show an error
                if (newStock < 0) {
                    showAlert(Alert.AlertType.ERROR, "Stock Error", "Not enough stock for " + book.getTitle());
                    return false;
                }

                // Update the stock in the database
                bookDAO.updateStock(book.getId(), newStock);
                bookDAO.updateSales(book.getId(), newSales);

                // Update the book object in the shopping cart for displaying purposes
                book.setStock(newStock);
                book.setSales(newSales);
            }
        } catch (SQLException e) {
            e.printStackTrace();
            showAlert(Alert.AlertType.ERROR, "Database Error", "Failed to update book stock.");
            return false;
        }

        // If everything is successful, return true
        return true;
    }

    private void backToMain(){
        try {
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/fxml/MainView.fxml"));
            Parent root = loader.load();

            // Get the MainController and set the welcome message
            MainViewController mainViewController = loader.getController();
            mainViewController.setWelcomeMessage(shoppingCart.getUsername()); // Set the dynamic welcome message
            mainViewController.setData(shoppingCart, bookManager, currentuser);

            // Get the current stage (window) and set the new scene with MainView
            Stage stage = (Stage) cancelButton.getScene().getWindow();
            stage.setScene(new Scene(root));
            stage.setTitle("The Reading Room - Main");
            stage.show();
        } catch (IOException e) {
            e.printStackTrace();
            showAlert(Alert.AlertType.ERROR, "Navigation Error", "Unable to load the main page.");
        }
    }


}
