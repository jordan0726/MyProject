package controllers;

import DAO.OrderDAO;
import UI.OrderDisplayFactory;
import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.*;
import javafx.scene.image.ImageView;
import javafx.scene.layout.VBox;
import javafx.scene.text.Text;
import javafx.stage.Stage;
import models.*;
import javafx.stage.FileChooser;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.sql.SQLException;


public class OrderController extends BaseController{
    @FXML
    private ImageView backIcon;
    @FXML
    private Button logoutButton;
    @FXML
    private VBox ordersContainer;
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

        // Load and display orders for the current user
        loadOrders();
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


    // Method to load orders from the database and display them
    private void loadOrders() {
        OrderDAO orderDAO = new OrderDAO();
        try {
            // Retrieve orders from the database
            List<Order> orders = orderDAO.getOrdersForUser(currentuser.getUsername());

            if (orders.isEmpty()) {
                // If the order history is empty, display a message to the user
                emptyMessage.setVisible(true);
            } else {
                // Display the orders using OrderDisplayFactory
                OrderDisplayFactory displayFactory = new OrderDisplayFactory();
                displayFactory.displayOrders(orders, ordersContainer, this::handleExportOrders);
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    // Method to handle exporting all orders
    private void handleExportOrders(ActionEvent event) {
        OrderDAO orderDAO = new OrderDAO();
        try {
            // Retrieve orders from the database
            List<Order> orders = orderDAO.getOrdersForUser(currentuser.getUsername());

            // Display a dialog to select orders to export
            List<Order> selectedOrders = showOrderSelectionDialog(orders);

            if (selectedOrders.isEmpty()) {
                showAlert(Alert.AlertType.INFORMATION, "No Selection", "No orders were selected for export.");
                return;
            }

            // Show a FileChooser to let the user select the file name and location
            FileChooser fileChooser = new FileChooser();
            fileChooser.setTitle("Save Orders as CSV");
            fileChooser.getExtensionFilters().add(new FileChooser.ExtensionFilter("CSV Files", "*.csv"));

            // Open the save dialog
            File file = fileChooser.showSaveDialog(ordersContainer.getScene().getWindow());

            if (file != null) {
                // Proceed to write orders to the selected CSV file
                writeOrdersToCSV(file, selectedOrders);
                showAlert(Alert.AlertType.INFORMATION, "Export Successful", "Orders have been successfully exported.");
            }

        } catch (SQLException e) {
            e.printStackTrace();
            showAlert(Alert.AlertType.ERROR, "Export Error", "Failed to export orders.");
        } catch (IOException e) {
            e.printStackTrace();
            showAlert(Alert.AlertType.ERROR, "File Error", "Error occurred while writing to file.");
        }
    }

    // Method to show a dialog with checkboxes to select orders for export
    private List<Order> showOrderSelectionDialog(List<Order> orders) {
        Dialog<List<Order>> dialog = new Dialog<>();
        dialog.setTitle("Select Orders to Export");

        // Set a larger preferred size for the dialog pane
        dialog.getDialogPane().setPrefWidth(400);

        // Create a VBox to hold the checkboxes
        VBox content = new VBox();
        content.setSpacing(10);

        // List to hold the selected orders
        List<CheckBox> checkBoxes = new ArrayList<>();

        // Create a checkbox for each order
        for (Order order : orders) {
            CheckBox checkBox = new CheckBox("Order Number: #" + order.getOrderNumber());
            checkBoxes.add(checkBox);
            content.getChildren().add(checkBox);
        }

        // Set the dialog content
        dialog.getDialogPane().setContent(content);

        // Add OK and Cancel buttons
        ButtonType okButtonType = new ButtonType("OK", ButtonBar.ButtonData.OK_DONE);
        dialog.getDialogPane().getButtonTypes().addAll(ButtonType.CANCEL, okButtonType);

        dialog.setResultConverter(dialogButton -> {
            if (dialogButton == okButtonType) {
                // Collect selected orders
                List<Order> selectedOrders = new ArrayList<>();
                for (int i = 0; i < checkBoxes.size(); i++) {
                    if (checkBoxes.get(i).isSelected()) {
                        selectedOrders.add(orders.get(i));
                    }
                }
                return selectedOrders;
            }
            return null;
        });

        // Show the dialog and wait for the result
        return dialog.showAndWait().orElse(new ArrayList<>());
    }

    // Method to write the list of orders to a CSV file
    private void writeOrdersToCSV(File file, List<Order> orders) throws IOException {
        try (FileWriter writer = new FileWriter(file)) {
            // Write the CSV header
            writer.write("Order Number,Date,Total Price,Book Title,Quantity,Price per Unit\n");

            // Write each order to the CSV file
            for (Order order : orders) {
                String orderNumber = order.getOrderNumber();
                String date = order.getDateTime().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
                double totalPrice = order.getTotalPrice();

                // Write each book (OrderItem) in the order
                for (OrderItem item : order.getItemsPurchased()) {
                    String bookTitle = item.getTitle();
                    int quantity = item.getQuantity();
                    double pricePerUnit = item.getPriceAtPurchase();

                    // Write a row for each order item
                    writer.write(orderNumber + "," + date + "," + totalPrice + "," + bookTitle + "," + quantity + "," + pricePerUnit + "\n");
                }
            }
        }
    }


}
