package models;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class Order implements Comparable<Order> {
    private String orderNumber;
    private String username;
    private LocalDateTime dateTime;
    private double totalPrice;
    private List<OrderItem> itemsPurchased;  // List of books and quantities purchased

    // Constructor
    public Order(String orderNumber, String username, LocalDateTime dateTime, double totalPrice) {
        this.orderNumber = orderNumber;
        this.username = username;
        this.dateTime = dateTime;
        this.totalPrice = totalPrice;
        this.itemsPurchased = new ArrayList<>();  // Initialize as empty list
    }

    // Getters and Setters
    public String getOrderNumber() {
        return orderNumber;
    }

    public String getUsername() {
        return username;
    }

    public LocalDateTime getDateTime() {
        return dateTime;
    }

    public double getTotalPrice() {
        return totalPrice;
    }

    public List<OrderItem> getItemsPurchased() {
        return itemsPurchased;
    }

    public void setItemsPurchased(List<OrderItem> itemsPurchased) {
        this.itemsPurchased = itemsPurchased;
    }

    // Compare orders by date for reverse chronological sorting
    @Override
    public int compareTo(Order other) {
        return other.getDateTime().compareTo(this.getDateTime());  // Most recent first
    }

    public void addOrderItem(OrderItem item) {
        this.itemsPurchased.add(item);
    }
}

