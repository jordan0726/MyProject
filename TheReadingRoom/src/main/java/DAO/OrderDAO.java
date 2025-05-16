package DAO;

import models.Order;
import models.OrderItem;

import java.sql.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

public class OrderDAO extends BaseDAO {

    // Method to retrieve all orders for a user from the database
    public List<Order> getOrdersForUser(String username) throws SQLException {
        String sql = "SELECT * FROM orders WHERE username = ? ORDER BY order_date DESC";
        List<Order> orders = new ArrayList<>();

        try (Connection connection = DriverManager.getConnection(dbsURL);
             PreparedStatement pstmt = connection.prepareStatement(sql)) {

            pstmt.setString(1, username);
            ResultSet rs = pstmt.executeQuery();

            // Retrieve all orders for the user
            while (rs.next()) {
                String orderNumber = String.valueOf(rs.getInt("order_id"));
                LocalDateTime dateTime = LocalDateTime.parse(rs.getString("order_date"),
                        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
                double totalPrice = rs.getDouble("total_price");

                Order order = new Order(orderNumber, username, dateTime, totalPrice);

                // Add associated order items to the order
                order.setItemsPurchased(getOrderItemsForOrder(orderNumber));

                orders.add(order);
            }
        } catch (SQLException e) {
            e.printStackTrace();
            throw new SQLException("Failed to retrieve orders for user.", e);
        }

        return orders;
    }

    // Method to retrieve all items for a given order
    private List<OrderItem> getOrderItemsForOrder(String orderNumber) throws SQLException {
        String sql = "SELECT * FROM orderitems WHERE order_id = ?";
        List<OrderItem> items = new ArrayList<>();
        BookDAO bookDAO = new BookDAO();

        try (Connection connection = DriverManager.getConnection(dbsURL);
             PreparedStatement pstmt = connection.prepareStatement(sql)) {

            pstmt.setInt(1, Integer.parseInt(orderNumber));
            ResultSet rs = pstmt.executeQuery();

            // Retrieve all items for the order
            while (rs.next()) {
                String bookId = String.valueOf(rs.getInt("book_id"));
                String bookTitle = bookDAO.getBookTitleById(bookId);
                int quantity = rs.getInt("quantity");
                double priceAtPurchase = rs.getDouble("price_at_purchase");

                OrderItem item = new OrderItem(bookId, bookTitle, quantity, priceAtPurchase);
                items.add(item);
            }
        } catch (SQLException e) {
            e.printStackTrace();
            throw new SQLException("Failed to retrieve order items for order.", e);
        }

        return items;
    }


    // Method to insert an order item into the database
    public void addOrderItem(String orderId, String bookId, int quantity, double priceAtPurchase) throws SQLException {
        String sql = "INSERT INTO orderitems (order_id, book_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?)";

        try (Connection connection = DriverManager.getConnection(dbsURL);
             PreparedStatement pstmt = connection.prepareStatement(sql)) {
            // Set the parameters for the SQL query
            pstmt.setInt(1, Integer.parseInt(orderId));
            pstmt.setInt(2, Integer.parseInt(bookId));
            pstmt.setInt(3, quantity);
            pstmt.setDouble(4, priceAtPurchase);

            // Execute the query to insert the order item
            pstmt.executeUpdate();
        } catch (SQLException e) {
            e.printStackTrace();
            throw new SQLException("Failed to add order item to the database.", e);
        }
    }

    // Method to insert an order into the Order database
    public void addOrder(Order order) throws SQLException {
        String sql = "INSERT INTO orders (order_id, username, order_date, total_price) VALUES (?, ?, ?, ?)";

        try (Connection connection = DriverManager.getConnection(dbsURL);
             PreparedStatement pstmt = connection.prepareStatement(sql)) {
            // Set the parameters for the SQL query
            pstmt.setInt(1, Integer.parseInt(order.getOrderNumber()));
            pstmt.setString(2, order.getUsername());
            pstmt.setString(3, order.getDateTime().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));  // Format date-time
            pstmt.setDouble(4, order.getTotalPrice());

            // Execute the query to insert the order
            pstmt.executeUpdate();

        } catch (SQLException e) {
            e.printStackTrace();
            throw new SQLException("Failed to add order to the database.", e);
        }
    }
}
