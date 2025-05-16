package DAO;

import models.Book;
import models.BookManager;
import models.CartItem;
import models.ShoppingCart;

import java.sql.*;


public class ShoppingCartDAO extends BaseDAO{

    private String dbsURL;  // Store the database URL here

    // Default Constructor - Use the URL from BaseDAO
    public ShoppingCartDAO() {
        this.dbsURL = BaseDAO.dbsURL;  // Use the default URL from BaseDAO
    }

    // Overloaded Constructor - Accept a custom database URL (for testing)
    public ShoppingCartDAO(String testdbsURL) {
        this.dbsURL = testdbsURL;  // Use the test-specific URL
    }

    /**
     * Method to check and create a shopping cart for the user (if not exist) and insert it into the database
     *
     * @param username The username for which the shopping cart is to be created
     * @throws SQLException If an error occurs while creating the shopping cart
     */
    public void createShoppingCartForUser(String username) throws SQLException {
        // SQL query to check if the shopping cart already exists for the user
        String checkCartQuery = "SELECT COUNT(*) FROM shoppingcarts WHERE username = ?";
        // SQL query to insert the shopping cart into the database
        String insertCartQuery = "INSERT INTO shoppingcarts(username) VALUES(?)";

        try (Connection conn = DriverManager.getConnection(dbsURL);
             PreparedStatement checkStmt = conn.prepareStatement(checkCartQuery);
             PreparedStatement insertStmt = conn.prepareStatement(insertCartQuery)) {

            // Disable auto-commit mode (start transaction)
            conn.setAutoCommit(false);

            // Check if a shopping cart already exists for the username
            checkStmt.setString(1, username);
            ResultSet rs = checkStmt.executeQuery();

            if (rs.next()) {  // Ensure we got a result from the query
                int count = rs.getInt(1);  // Get the count of matching rows

                if (count > 0) {
                    // Shopping cart already exists, do nothing
                    System.out.println("Shopping cart already exists for user: " + username);
                }
                else {
                    // Shopping cart does not exist, create one
                    insertStmt.setString(1, username);
                    insertStmt.executeUpdate(); // Insert new shopping cart
                    System.out.println("Shopping cart created successfully for user: " + username);
                }
            }
            else {
                System.err.println("Unexpected result from checking shopping cart existence for user: " + username);
            }

            // Commit the transaction
            conn.commit();

        }
        catch (SQLException e) {
            System.err.println("Error creating shopping cart for user: " + username);
            throw e; // Re-throw the exception for higher-level handling
        }
    }

    /**
     * Method to retrieve the shopping cart (cart_id) and its items for a given username.
     *
     * @param username The username whose shopping cart is to be retrieved.
     * @return ResultSet containing cart items.
     * @throws SQLException If an error occurs during the query.
     */
    public ShoppingCart getShoppingCartForUser(String username, BookManager bookManager) throws SQLException {
        String getCartQuery = "SELECT c.shoppingcart_id, ci.book_id, ci.quantity FROM shoppingcarts c " +
                "LEFT JOIN cartitems ci ON c.shoppingcart_id = ci.shoppingcart_id WHERE c.username = ?";

        try (Connection conn = DriverManager.getConnection(dbsURL);
             PreparedStatement getCartStmt = conn.prepareStatement(getCartQuery)) {

            // Set the username in the query
            getCartStmt.setString(1, username);

            // Execute the query and get the result set
            ResultSet rs = getCartStmt.executeQuery();

            // Initialize ShoppingCart object
            ShoppingCart shoppingCart = null;
            String shoppingcartId = null;

            // Process the result set
            while (rs.next()) {
                // Get cart_id (only set once)
                if (shoppingcartId == null) {
                    shoppingcartId = rs.getString("shoppingcart_id");
                    shoppingCart = new ShoppingCart(shoppingcartId, username,this);  // Initialize ShoppingCart with the cart_id
                }

                // Check if the cart has any items (book_id will be null if no items)
                String bookId = rs.getString("book_id");
                if (bookId != null) {
                    int quantity = rs.getInt("quantity");

                    // Retrieve the book by its ID and add it to the shopping cart
                    Book book = bookManager.findBookById(bookId);
                    if (book != null) {
                        CartItem cartItem = new CartItem(book, quantity);
                        shoppingCart.addCartItem(cartItem);
                    }
                }
            }

            // Return the ShoppingCart object (it could be empty if no cart items were found)
            return shoppingCart;

        } catch (SQLException e) {
            System.err.println("Error retrieving shopping cart for user: " + username);
            throw e;  // Re-throw for higher-level handling
        }
    }

    // Insert a new cart item into the database
    public void insertCartItem(String shoppingcartId, CartItem cartItem) throws SQLException {
        String sql = "INSERT INTO cartItems (shoppingcart_id, book_id, quantity) VALUES (?, ?, ?)";
        try (Connection connection = DriverManager.getConnection(dbsURL);
             PreparedStatement pstmt = connection.prepareStatement(sql)) {
            pstmt.setInt(1, Integer.parseInt(shoppingcartId)); // String to Integer conversion
            pstmt.setInt(2, Integer.parseInt(cartItem.getBook().getId()));  // String to Integer conversion
            pstmt.setInt(3, cartItem.getQuantity());
            pstmt.executeUpdate();
        }
    }

    // Update an existing cart item in the database
    public void updateCartItem(String shoppingcartId, CartItem cartItem) throws SQLException {
        String sql = "UPDATE cartItems SET quantity = ? WHERE shoppingcart_id = ? AND book_id = ?";
        try (Connection connection = DriverManager.getConnection(dbsURL);
             PreparedStatement pstmt = connection.prepareStatement(sql)) {
            pstmt.setInt(1, cartItem.getQuantity());
            pstmt.setInt(2, Integer.parseInt(shoppingcartId));
            pstmt.setInt(3, Integer.parseInt(cartItem.getBook().getId()));  // String to Integer conversion
            pstmt.executeUpdate();
        }
    }

    // Remove a cart item from the database
    public void deleteCartItem(String shoppingcartId, Book book) throws SQLException {
        String sql = "DELETE FROM cartItems WHERE shoppingcart_id = ? AND book_id = ?";
        try (Connection connection = DriverManager.getConnection(dbsURL);
             PreparedStatement pstmt = connection.prepareStatement(sql)) {
            pstmt.setInt(1, Integer.parseInt(shoppingcartId));
            pstmt.setInt(2, Integer.parseInt(book.getId()));  // String to Integer conversion
            pstmt.executeUpdate();
        }
    }

    // Clear all cart items from the database
    public void clearCartItems(String shoppingcartId) throws SQLException {
        String sql = "DELETE FROM cartItems WHERE shoppingcart_id = ?";
        try (Connection connection = DriverManager.getConnection(dbsURL);
             PreparedStatement pstmt = connection.prepareStatement(sql)) {
            pstmt.setInt(1, Integer.parseInt(shoppingcartId));
            pstmt.executeUpdate();
        }
    }

}
