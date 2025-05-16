package DAO;

import models.Book;
import org.junit.jupiter.api.*;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class BookDAOTest {

    private static final String testDbsURL = "jdbc:sqlite:TestTheReadingRoom.db";  // Test database URL
    private BookDAO bookDAO;

    @BeforeEach
    public void setUp() throws SQLException {
        bookDAO = new BookDAO(testDbsURL);
        setupTestDatabase();
    }

    @AfterEach
    public void tearDown() throws SQLException {
        cleanTestDatabase();
    }

    // Method to set up the test database schema and insert sample data
    private void setupTestDatabase() throws SQLException {
        try (Connection conn = DriverManager.getConnection(testDbsURL);
             var stmt = conn.createStatement()) {

            // Create books table for testing
            String createBooksTable = "CREATE TABLE IF NOT EXISTS books (\n"
                    + " book_id TEXT PRIMARY KEY,\n"
                    + " title TEXT NOT NULL,\n"
                    + " author TEXT,\n"
                    + " genre TEXT,\n"
                    + " description TEXT,\n"
                    + " price REAL,\n"
                    + " stock INTEGER,\n"
                    + " image_url TEXT,\n"
                    + " sales INTEGER\n"
                    + ");";
            stmt.execute(createBooksTable);

            // Insert sample book data for testing
            String insertSampleBook = "INSERT INTO books(book_id, title, author, genre, description, price, stock, image_url, sales) VALUES "
                    + "('1', 'Test Book', 'Author Name', 'Fiction', 'A test book', 19.99, 50, 'test_image.jpg', 10);";
            stmt.execute(insertSampleBook);
        }
    }

    // Method to clean up the test database
    private void cleanTestDatabase() throws SQLException {
        try (Connection conn = DriverManager.getConnection(testDbsURL);
             var stmt = conn.createStatement()) {
            stmt.execute("DROP TABLE IF EXISTS books");
        }
    }

    // Test retrieving all books from the database
    @Test
    public void testGetAllBooks() {
        List<Book> books = bookDAO.getAllBooks();
        assertNotNull(books);
        assertEquals(1, books.size());  // Only one book in the test DB
        assertEquals("Test Book", books.get(0).getTitle());
    }

    // Test inserting a book into the database
    @Test
    public void testInsertBook() {
        Book book = new Book("2", "New Book", "New Author", "Non-Fiction", "Description", 25.99, 100, "new_image.jpg", 5);
        bookDAO.insertBook(book);

        List<Book> books = bookDAO.getAllBooks();
        assertEquals(2, books.size());  // Now two books in the DB
        assertEquals("New Book", books.get(1).getTitle());
    }

    // Test updating book stock
    @Test
    public void testUpdateStock() throws SQLException {
        bookDAO.updateStock("1", 45);  // Update stock for book_id 1
        List<Book> books = bookDAO.getAllBooks();
        assertEquals(45, books.get(0).getStock());  // Verify new stock
    }

    // Test updating book sales
    @Test
    public void testUpdateSales() throws SQLException {
        bookDAO.updateSales("1", 20);  // Update sales for book_id 1
        List<Book> books = bookDAO.getAllBooks();
        assertEquals(20, books.get(0).getSales());  // Verify new sales
    }

    // Test retrieving book title by bookId
    @Test
    public void testGetBookTitleById() {
        String title = bookDAO.getBookTitleById("1");
        assertEquals("Test Book", title);
    }

}
