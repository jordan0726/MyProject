package models;

import DAO.ShoppingCartDAO;
import javafx.scene.control.Alert;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;


public class ShoppingCart {
    private final String cartId;
    private final String username;
    private List<CartItem> cartItems;
    private ShoppingCartDAO shoppingCartDAO;  // DAO for database interactions


    public ShoppingCart(String cartId, String username, ShoppingCartDAO shoppingCartDAO) {
        this.cartItems = new ArrayList<>();
        this.cartId = cartId;
        this.username = username;
        this.shoppingCartDAO = new ShoppingCartDAO();
    }

    /**
     * Add a book to the shoppingcart as a cartItem
     *
     * @param book     The book to be added
     * @param quantity The quantity of the book to be added
     */
    public void addBookToShoppingCart(Book book, int quantity) {
        // Check if the book is already in the cart
        for (CartItem item : cartItems) {
            if (item.getBook().getId().equals(book.getId())) {
                int newQuantity = item.getQuantity() + quantity; // IF the book is already in the cart, need to increase the quantity

                // Check if the total quantity exceeds the stock
                if (newQuantity > book.getStock()) {
                    showAlert(Alert.AlertType.ERROR, "Stock Limit Exceeded", "Please reduce your amount.\n(After added, the amount will exceed available stock.)");
                    return; // Exit without adding to the cart
                }

                // If the new quantity is valid, update the quantity
                item.setQuantity(newQuantity);
                showAlert(Alert.AlertType.INFORMATION, "Add to Cart Success", "Added " + quantity + " of \"" + book.getTitle() + "\" to the cart.");


                // Update the database with the new quantity
                try {
                    shoppingCartDAO.updateCartItem(cartId, item);
                }
                catch (SQLException e) {
                    e.printStackTrace(); // You can handle the error as needed
                }

                return;
            }
        }

        // Check if there is enough stock for the new book being added
        if (quantity > book.getStock()) {
            showAlert(Alert.AlertType.ERROR, "Stock Limit Exceeded", "Please reduce your amount.\n(After added, the amount will exceed available stock.)");
            return; // Exit without adding to the cart
        }

        // If the book is not already in the cart, add it and insert into the database
        CartItem newItem = new CartItem(book, quantity);
        cartItems.add(newItem);
        try {
            shoppingCartDAO.insertCartItem(cartId, newItem);
            showAlert(Alert.AlertType.INFORMATION, "Add to Cart Success", "Added " + quantity + " of \"" + book.getTitle() + "\" to the cart.");
        }
        catch (SQLException e) {
            e.printStackTrace(); // Handle exception as needed
        }
    }

    public String getCartId() {
        return cartId;
    }

    public String getUsername() {
        return username;
    }

    public List<CartItem> getCartItems() {
        return cartItems;
    }

    public void addCartItem(CartItem item) {
        this.cartItems.add(item);
    }

    public void removeBookFromCart(Book book) {
        CartItem itemToRemove = null;
        for (CartItem item : cartItems) {
            if (item.getBook().equals(book)) {
                itemToRemove = item;
                break;
            }
        }

        if (itemToRemove != null) {
            cartItems.remove(itemToRemove);
            try {
                shoppingCartDAO.deleteCartItem(cartId, book);
            } catch (SQLException e) {
                e.printStackTrace(); // Handle exception as needed
            }
        }
    }

    public double calculateTotalPrice() {
        double totalPrice = 0.0;
        for (CartItem item : cartItems) {
            totalPrice += item.getBook().getPrice() * item.getQuantity();
        }
        return totalPrice;
    }

    public void clearCart() {
        cartItems.clear();
        try {
            shoppingCartDAO.clearCartItems(cartId);
        } catch (SQLException e) {
            e.printStackTrace(); // Handle exception as needed
        }
    }

    // Helper method to show alert messages
    private void showAlert(Alert.AlertType alertType, String title, String message) {
        Alert alert = new Alert(alertType);
        alert.setTitle(title);
        alert.setContentText(message);
        alert.setHeaderText(null);
        alert.showAndWait();
    }
}

