package UI;

import javafx.scene.control.*;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.layout.HBox;
import javafx.scene.layout.VBox;
import javafx.geometry.Pos;
import javafx.scene.text.Text;
import javafx.scene.text.TextAlignment;
import models.Book;
import javafx.event.ActionEvent;
import javafx.event.EventHandler;

import java.util.List;

public class BookDisplayFactory {

    // Method to display books in the Recommendation section
    public void displayBooksInRecommendation(List<Book> books, HBox recommendationContainer, EventHandler<ActionEvent> handleAddToCartInRecommendation){
        // Sort the books by sales in descending order
        books.sort((book1, book2) -> Integer.compare(book2.getSales(), book1.getSales()));
        //Get the top 7
        List<Book> topBooks = books.stream().limit(7).toList();
        //Clear the recommendationContainer before adding new books
        recommendationContainer.getChildren().clear();

        // For each of the top 7 books, create a VBox and add it to the recommendation container
        for (Book book: topBooks){
            VBox bookVBox = createBookVbox(book, handleAddToCartInRecommendation);
            recommendationContainer.getChildren().add(bookVBox); // Add the VBox to the HBox in the recommendation section
        }

    }

    // Method to display books in rows in the main page
    public void displayBooksInRows(List<Book> books, VBox BooksContainer, EventHandler<ActionEvent> handleAddToCart){
        HBox rowHBox = null;
        int booksPerRow = 2;  // Number of books to display per row
        int count = 0; // Counter to keep track of the number of books displayed in the current row

        for (Book book: books){
            if (count % booksPerRow == 0){
                //If the count is 2, create a new row
                rowHBox = new HBox();
                rowHBox.setSpacing(50);
                BooksContainer.getChildren().add(rowHBox);
            }

            HBox bookHBox = createBookHbox(book, handleAddToCart);
            rowHBox.getChildren().add(bookHBox);
            count++;
        }


    }

    // Method to display books in rows in the Admin page
    public void displayBooksInAdmin(List<Book> books, VBox BooksContainer, EventHandler<ActionEvent> handleUpdateStock){
        HBox rowHBox = null;
        int booksPerRow = 2;  // Number of books to display per row
        int count = 0; // Counter to keep track of the number of books displayed in the current row

        for (Book book: books){
            if (count % booksPerRow == 0){
                //If the count is 2, create a new row
                rowHBox = new HBox();
                rowHBox.setSpacing(50);
                BooksContainer.getChildren().add(rowHBox);
            }

            HBox bookHBox = createAdminBookHbox(book, handleUpdateStock);
            rowHBox.getChildren().add(bookHBox);
            count++;
        }


    }


    // Method to create HBox for each Book to display in the main page
    private HBox createBookHbox(Book book, EventHandler<ActionEvent> handleAddToCart){
        HBox bookbox = new HBox();
        bookbox.setSpacing(15);

        // Cover image
        ImageView bookCover = new ImageView(new Image(book.getImageUrl()));
        bookCover.setFitHeight(110);
        bookCover.setFitWidth(100);

        // Book details
        VBox bookInfo = new VBox();
        bookInfo.setSpacing(5);
        bookInfo.setPrefWidth(250);

        //Title
        Label title = new Label(book.getTitle());
        title.setStyle("-fx-font-size: 16; -fx-font-weight: bold;");
        title.setMaxWidth(250); // set the max width
        title.setEllipsisString("..."); // Automatically truncate long text
        // Author
        Text author = new Text("Author: " + book.getAuthor());
        author.setStyle("-fx-font-size: 14;");
        // Unit price
        Text price = new Text("Price: $" + book.getPrice());
        price.setStyle("-fx-font-size: 14;");
        // Stock
        Text stock = new Text("Stock: " + book.getStock());
        stock.setStyle("-fx-font-size: 14;");
        // Description
        Label description = new Label(book.getDescription());
        description.setStyle("-fx-font-size: 12;");
        description.setMaxWidth(250); // Set the maximum width
        description.setEllipsisString("..."); // Automatically truncate long text
        //Add the info into VBox
        bookInfo.getChildren().addAll(title, author, price, stock, description);

        // ShoppingCart-related VBox
        VBox shoppingCartBox = new VBox();
        shoppingCartBox.setSpacing(50);
        shoppingCartBox.setAlignment(Pos.TOP_RIGHT);

        //Spinner
        Spinner<Integer> quantitySpinner = new Spinner<>(0, book.getStock(), 0);
        quantitySpinner.setEditable(true); // Ensure the Spinner is editable
        quantitySpinner.setPrefWidth(80);

        //Add to cart button
        Button addToCartButton = new Button("Add to Cart");
        addToCartButton.setStyle("-fx-background-color: #f8a940; -fx-text-fill: #3e2723;");
        addToCartButton.setOnAction(handleAddToCart);
        // Store book ID in the button's user data
        addToCartButton.setUserData(book.getId());

        //Add the spinner and button to the shoppingCartBox
        shoppingCartBox.getChildren().addAll(quantitySpinner, addToCartButton);

        //Add the bookCover, bookInfo, and shoppingCartBox to the bookbox
        bookbox.getChildren().addAll(bookCover, bookInfo, shoppingCartBox);

        return bookbox;
    }

    // Method to create Book's VBox for Recommendation For You Area
    private VBox createBookVbox(Book book, EventHandler<ActionEvent> handleAddToCartInRecommendation){
        VBox bookVBox = new VBox();
        bookVBox.setSpacing(10);
        bookVBox.setAlignment(Pos.TOP_CENTER);
        bookVBox.setPrefWidth(120); // Set the preferred width of the VBox to avoid different length of title affects the layout

        //ImageView
        ImageView bookCover = new ImageView(new Image(book.getImageUrl()));
        bookCover.setFitHeight(110);
        bookCover.setFitWidth(100);

        //Title
        Label title = new Label(book.getTitle());
        title.setStyle("-fx-font-size: 16; -fx-font-weight: bold;");
        title.setTextAlignment(TextAlignment.CENTER);
        title.setMaxWidth(120); // set the max width
        title.setEllipsisString("..."); // Automatically truncate long text

        //Sales
        Text sales = new Text("Sales: " + book.getSales());
        sales.setStyle("-fx-font-size: 14;");

        //Add to cart button
        Button addToCartButton = new Button("Add to Cart");
        addToCartButton.setStyle("-fx-background-color: #f8a940; -fx-text-fill: #3e2723;");
        addToCartButton.setOnAction(handleAddToCartInRecommendation);
        // Store book Title in the button's user data
        addToCartButton.setUserData(book.getId());

        //Add the bookCover, title, sales, and addToCartButton to the bookVBox
        bookVBox.getChildren().addAll(bookCover, title, sales, addToCartButton);

        return bookVBox;
    }

    // Method to create HBox for each Book to display in the admin main page
    private HBox createAdminBookHbox(Book book, EventHandler<ActionEvent> handleUpdateStock) {
        HBox bookbox = new HBox();
        bookbox.setSpacing(15);

        // Cover image
        ImageView bookCover = new ImageView(new Image(book.getImageUrl()));
        bookCover.setFitHeight(110);
        bookCover.setFitWidth(100);

        // Book details
        VBox bookInfo = new VBox();
        bookInfo.setSpacing(5);
        bookInfo.setPrefWidth(250);

        // Title
        Label title = new Label(book.getTitle());
        title.setStyle("-fx-font-size: 16; -fx-font-weight: bold;");
        title.setMaxWidth(300);
        title.setEllipsisString("..."); // Automatically truncate long text

        // Author
        Text author = new Text("Author: " + book.getAuthor());
        author.setStyle("-fx-font-size: 14;");

        // Unit price
        Text price = new Text("Price: $" + book.getPrice());
        price.setStyle("-fx-font-size: 14;");

        // Number of sold copies
        Text soldCopies = new Text("Sold Copies: " + book.getSales());
        soldCopies.setStyle("-fx-font-size: 14;");


        // Add the info into VBox
        bookInfo.getChildren().addAll(title, author, price, soldCopies);

        // Stock management VBox
        VBox stockManagementBox = new VBox();
        stockManagementBox.setSpacing(10);
        stockManagementBox.setAlignment(Pos.TOP_RIGHT);

        // Stock
        Text stock = new Text("Stock");
        stock.setStyle("-fx-font-size: 14;");

        // Spinner for stock update
        Spinner<Integer> stockSpinner = new Spinner<>(0, Integer.MAX_VALUE, book.getStock()); // Set stock as the initial value
        stockSpinner.setEditable(true);
        stockSpinner.setPrefWidth(100);

        // Update Stock button
        Button updateStockButton = new Button("Update Stock");
        updateStockButton.setStyle("-fx-background-color: #f8a940; -fx-text-fill: #3e2723;");
        updateStockButton.setOnAction(handleUpdateStock);
        updateStockButton.setUserData(book); // Store book in the button's user data

        // Add the spinner and button to the stockManagementBox
        stockManagementBox.getChildren().addAll(stock, stockSpinner, updateStockButton);

        // Add the bookCover, bookInfo, and stockManagementBox to the bookbox
        bookbox.getChildren().addAll(bookCover, bookInfo, stockManagementBox);

        return bookbox;
    }

}
