package UI;

import DAO.ShoppingCartDAO;
import javafx.event.ActionEvent;
import javafx.event.EventHandler;
import javafx.geometry.Pos;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.Spinner;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.layout.HBox;
import javafx.scene.layout.VBox;
import javafx.scene.text.Text;
import models.CartItem;
import models.ShoppingCart;

import java.sql.SQLException;

public class ShoppingCartDisplayFactory {

    private VBox booksContainer;

    // Constructor to accept VBox container
    public ShoppingCartDisplayFactory(VBox booksContainer) {
        this.booksContainer = booksContainer; // Initialize booksContainer with the passed VBox
    }

    // Method to display cart items dynamically
    public void displayShoppingCartItems(ShoppingCart shoppingCart, EventHandler<ActionEvent> handleRemoveFromCart, EventHandler<ActionEvent> handleCheckOut) {
        booksContainer.getChildren().clear(); // Clear existing items
        String shoppingCartID = shoppingCart.getCartId();

        for (CartItem cartItem : shoppingCart.getCartItems()) {
            HBox bookHBox = createCartItemHBox(shoppingCartID, cartItem, handleRemoveFromCart);
            booksContainer.getChildren().add(bookHBox); //add the HBox to the VBox
        }

        // Add the Check Out button at the end of the VBox
        Button checkOutButton = createCheckOutButton(handleCheckOut);
        booksContainer.getChildren().add(checkOutButton); // Add Check Out button at the bottom
    }

    // Method to create an HBox for each CartItem
    private HBox createCartItemHBox(String shoppingCartID,CartItem cartItem, EventHandler<ActionEvent> handleRemoveFromCart) {
        HBox bookHBox = new HBox();
        bookHBox.setSpacing(15);

        // Cover image
        ImageView bookCover = new ImageView(new Image(cartItem.getBook().getImageUrl()));
        bookCover.setFitHeight(110);
        bookCover.setFitWidth(100);

        // Book details
        VBox bookInfo = new VBox();
        bookInfo.setSpacing(5);
        bookInfo.setPrefWidth(250);

        //Title
        Label title = new Label(cartItem.getBook().getTitle());
        title.setStyle("-fx-font-size: 16; -fx-font-weight: bold;");
        title.setMaxWidth(250); // set the max width
        title.setEllipsisString("..."); // Automatically truncate long text

        // Author
        Text author = new Text("Author: " + cartItem.getBook().getAuthor());
        author.setStyle("-fx-font-size: 14;");

        // Price
        Text price = new Text("Price: $" + cartItem.getBook().getPrice());
        price.setStyle("-fx-font-size: 14;");
        // Stock
        Text stock = new Text("Stock: " + cartItem.getBook().getStock());
        stock.setStyle("-fx-font-size: 14;");
        //Add the info into VBox
        bookInfo.getChildren().addAll(title, author, price, stock);

        // Spinner and Remove button VBox
        VBox interactionBox = new VBox();
        interactionBox.setSpacing(50);
        interactionBox.setAlignment(Pos.TOP_RIGHT);

        // Quantity Spinner
        Spinner<Integer> quantitySpinner = new Spinner<>(1, cartItem.getBook().getStock(), cartItem.getQuantity());
        quantitySpinner.setEditable(true);
        quantitySpinner.setPrefWidth(80);

        // Add listener to handle quantity changes in spinner
        quantitySpinner.valueProperty().addListener((obs, oldValue, newValue) -> {
            if (newValue != null && !newValue.equals(oldValue)) {
                cartItem.setQuantity(newValue);  // Update the cartItem's quantity
                try {
                    ShoppingCartDAO shoppingCartDAO = new ShoppingCartDAO();
                    shoppingCartDAO.updateCartItem(shoppingCartID, cartItem);  // Update in the database
                } catch (SQLException e) {
                    e.printStackTrace(); // Handle exception as needed
                }
            }
        });

        // Remove Button
        Button removeButton = new Button("Remove");
        removeButton.setStyle("-fx-background-color: #f8a940; -fx-text-fill: #3e2723;");
        removeButton.setOnAction(handleRemoveFromCart); // Handle remove logic
        // Store book object in the button's user data
        removeButton.setUserData(cartItem.getBook());

        //Add the spinner and button to the interactionBox
        interactionBox.getChildren().addAll(quantitySpinner, removeButton);

        // Add elements to the HBox
        bookHBox.getChildren().addAll(bookCover, bookInfo, interactionBox );

        return bookHBox;
    }

    // Method to create the CheckOut button and bind it to the provided event handler
    private Button createCheckOutButton(EventHandler<ActionEvent> handleCheckOut) {
        Button checkOutButton = new Button("Check Out");
        checkOutButton.setStyle("-fx-background-color: #f8a940; -fx-text-fill: #3e2723; -fx-font-size: 16px; -fx-padding: 10px;");
        checkOutButton.setOnAction(handleCheckOut); // Bind the action to the passed event handler
        return checkOutButton;
    }

}

