package DAO;

import models.Book;
import models.BookManager;
import models.CartItem;
import models.ShoppingCart;
import org.junit.jupiter.api.*;

import java.sql.*;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class ShoppingCartDAOTest {

    private static final String testDbsURL = "jdbc:sqlite:TestTheReadingRoom.db";

    private ShoppingCartDAO shoppingCartDAO;
    private BookManager bookManager;
    private Book testBook;

    @BeforeEach
    public void setup() throws SQLException {
        // Set up the DAO and test data
        setupTestDatabase(); // Ensure tables are created first

        BookDAO bookDAO = new BookDAO(testDbsURL);
        bookManager = new BookManager(bookDAO); // Initialize BookManager after creating the tables
        shoppingCartDAO = new ShoppingCartDAO(testDbsURL);

        // Create a sample book for testing (already loaded in setupTestDatabase)
        testBook = bookManager.findBookById("1");
    }

    @AfterEach
    public void tearDown() throws SQLException {
        // Clear the database after each test
        clearTestDatabase();
    }

    // Set up a test database
    private void setupTestDatabase() throws SQLException {
        try (Connection conn = DriverManager.getConnection(testDbsURL);
             Statement stmt = conn.createStatement()) {

            // Create the necessary tables for testing
            stmt.executeUpdate("CREATE TABLE IF NOT EXISTS shoppingcarts (shoppingcart_id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL);");
            stmt.executeUpdate("CREATE TABLE IF NOT EXISTS cartItems (cartitem_id INTEGER PRIMARY KEY AUTOINCREMENT, shoppingcart_id INTEGER NOT NULL, book_id TEXT NOT NULL, quantity INTEGER NOT NULL);");
            stmt.executeUpdate("CREATE TABLE IF NOT EXISTS books (book_id TEXT PRIMARY KEY, title TEXT, author TEXT, genre TEXT, description TEXT, price REAL, stock INTEGER, image_url TEXT, sales INTEGER);");

            // Insert the test book
            stmt.executeUpdate("INSERT INTO books (book_id, title, author, genre, description, price, stock, image_url, sales) VALUES ('1', 'Test Book', 'Test Author', 'Test Genre', 'Test Description', 25.0, 10, 'test_image_url', 5);");
        }

        // Load the books into BookManager from the test database
        bookManager = new BookManager(new BookDAO(testDbsURL));
    }

    // Clear the test database
    private void clearTestDatabase() throws SQLException {
        try (Connection conn = DriverManager.getConnection(testDbsURL);
             Statement stmt = conn.createStatement()) {

            stmt.executeUpdate("DROP TABLE IF EXISTS cartItems;");
            stmt.executeUpdate("DROP TABLE IF EXISTS shoppingcarts;");
            stmt.executeUpdate("DROP TABLE IF EXISTS books;");
        }
    }


    @Test
    public void testCreateShoppingCartForUser() throws SQLException {
        // Create a new shopping cart for a user
        shoppingCartDAO.createShoppingCartForUser("testuser");

        // Retrieve the shopping cart from the database
        ShoppingCart cart = shoppingCartDAO.getShoppingCartForUser("testuser", bookManager);

        // Assert that the cart was created successfully
        assertNotNull(cart);
        assertEquals("testuser", cart.getUsername());
    }

    @Test
    public void testInsertCartItem() throws SQLException {
        // Create a shopping cart for the test user
        shoppingCartDAO.createShoppingCartForUser("testuser");

        // Retrieve the shopping cart
        ShoppingCart cart = shoppingCartDAO.getShoppingCartForUser("testuser", bookManager);

        // Insert a cart item
        CartItem cartItem = new CartItem(testBook, 2);
        shoppingCartDAO.insertCartItem(cart.getCartId(), cartItem);

        // Retrieve the cart items
        cart = shoppingCartDAO.getShoppingCartForUser("testuser", bookManager);
        List<CartItem> items = cart.getCartItems();

        // Assert that the item was added
        assertEquals(1, items.size());
        assertEquals("Test Book", items.get(0).getBook().getTitle());
        assertEquals(2, items.get(0).getQuantity());
    }

    @Test
    public void testClearCartItems() throws SQLException {
        // Create a shopping cart for the test user
        shoppingCartDAO.createShoppingCartForUser("testuser");

        // Retrieve the shopping cart
        ShoppingCart cart = shoppingCartDAO.getShoppingCartForUser("testuser", bookManager);

        // Insert a cart item
        CartItem cartItem = new CartItem(testBook, 2);
        shoppingCartDAO.insertCartItem(cart.getCartId(), cartItem);

        // Clear the cart items
        shoppingCartDAO.clearCartItems(cart.getCartId());

        // Retrieve the cart items again and assert that it is empty
        cart = shoppingCartDAO.getShoppingCartForUser("testuser", bookManager);
        assertEquals(0, cart.getCartItems().size());
    }

    @Test
    public void testUpdateCartItem() throws SQLException {
        // Create a shopping cart for the test user
        shoppingCartDAO.createShoppingCartForUser("testuser");

        // Retrieve the shopping cart
        ShoppingCart cart = shoppingCartDAO.getShoppingCartForUser("testuser", bookManager);

        // Insert a cart item
        CartItem cartItem = new CartItem(testBook, 2);
        shoppingCartDAO.insertCartItem(cart.getCartId(), cartItem);

        // Update the cart item quantity
        cartItem.setQuantity(5);
        shoppingCartDAO.updateCartItem(cart.getCartId(), cartItem);

        // Retrieve the cart items and verify the updated quantity
        cart = shoppingCartDAO.getShoppingCartForUser("testuser", bookManager);
        List<CartItem> items = cart.getCartItems();
        assertEquals(5, items.get(0).getQuantity());
    }
}
