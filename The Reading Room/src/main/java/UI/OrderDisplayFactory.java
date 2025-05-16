package UI;

import javafx.event.ActionEvent;
import javafx.event.EventHandler;
import javafx.geometry.Insets;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.TitledPane;
import javafx.scene.layout.VBox;
import models.Order;
import models.OrderItem;

import java.time.format.DateTimeFormatter;
import java.util.List;

public class OrderDisplayFactory {

    // Method to display orders in the OrderView
    public void displayOrders(List<Order> orders, VBox ordersContainer, EventHandler<ActionEvent> handleExportAllOrders) {
        ordersContainer.getChildren().clear(); // Clear existing children

        if (orders.isEmpty()) {
            return;  // No need to generate the UI since there are no orders
        }


        for (Order order : orders) {
            // Create a VBox for each order
            VBox orderSummaryVBox = new VBox();
            orderSummaryVBox.setSpacing(10);
            orderSummaryVBox.setStyle("-fx-border-color: black;");
            orderSummaryVBox.setPadding(new Insets(10)); // Add 10px padding to all sides


            // Add order summary details
            // Order Number
            Label orderNumberLabel = new Label("Order Number: #" + order.getOrderNumber());
            orderNumberLabel.setStyle("-fx-font-weight: bold; -fx-font-size: 24px;");
            orderSummaryVBox.getChildren().add(orderNumberLabel);

            // Create and format the date label
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            String formattedDate = order.getDateTime().format(formatter);
            Label dateLabel = new Label("Date: " + formattedDate);
            dateLabel.setStyle("-fx-font-weight: normal; -fx-font-size: 18px;");
            orderSummaryVBox.getChildren().add(dateLabel);

            // Total price
            Label totalLabel = new Label("Total: " + order.getTotalPrice() + " AUD");
            totalLabel.setStyle("-fx-font-weight: normal; -fx-font-size: 18px;");
            orderSummaryVBox.getChildren().add(totalLabel);

            // Create a TitledPane for the order items
            TitledPane orderDetailPane = new TitledPane();
            orderDetailPane.setText("Order Items");
            orderDetailPane.setExpanded(false);

            // Create a VBox for the items
            VBox orderDetailVBox = new VBox();
            orderDetailVBox.setSpacing(10);

            // Add each order item
            for (OrderItem item : order.getItemsPurchased()) {
                VBox itemDetailVBox = new VBox();
                itemDetailVBox.getChildren().add(new Label("Title: " + item.getTitle()));
                itemDetailVBox.getChildren().add(new Label("Quantity: " + item.getQuantity()));
                itemDetailVBox.getChildren().add(new Label("Price: $" + item.getPriceAtPurchase() + " / per"));
                orderDetailVBox.getChildren().add(itemDetailVBox);
            }

            // Set the content of the TitledPane to the items VBox
            orderDetailPane.setContent(orderDetailVBox);

            // Add the TitledPane to the order VBox
            orderSummaryVBox.getChildren().add(orderDetailPane);

            // Add the order VBox to the ordersContainer
            ordersContainer.getChildren().add(orderSummaryVBox);
        }

        // Create and add the "Export All Orders" button at the bottom of the ordersContainer
        Button exportButton = new Button("Export Orders");
        exportButton.setStyle("-fx-background-color: #f8a940; -fx-text-fill: #3e2723; -fx-font-size: 16px; -fx-padding: 10px; -fx-cursor: hand;");
        exportButton.setOnAction(handleExportAllOrders);

        ordersContainer.getChildren().add(exportButton);


    }

}
