package DAO;

import models.Book;
import java.sql.*;
import java.util.List;
import java.util.ArrayList;


/**
 * Data Access Object (DAO) class for the Book model, every operation related to the Book model and database should be done through this class.
 */
public class BookDAO extends BaseDAO {

    private String dbsURL;  // Store the database URL here

    // Default Constructor - Use the URL from BaseDAO
    public BookDAO() {
        this.dbsURL = BaseDAO.dbsURL;  // Use the default URL from BaseDAO
    }

    // Overloaded Constructor - Accept a custom database URL (for testing)
    public BookDAO(String testdbsURL) {
        this.dbsURL = testdbsURL;  // Use the test-specific URL
    }

    // Read all books data from the database and return a list of Book objects
    public List<Book> getAllBooks(){
        String sql = "SELECT * FROM books";
        List<Book> books = new ArrayList<>();
        // Try-with-resources to automatically close resources
        try (Connection conn = DriverManager.getConnection(dbsURL);
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {

            // Loop through the result set, turn every row into Book objects
            while (rs.next()) {
                Book book = new Book(rs.getString("book_id"),
                        rs.getString("title"),
                        rs.getString("author"),
                        rs.getString("genre"),
                        rs.getString("description"),
                        rs.getDouble("price"),
                        rs.getInt("stock"),
                        rs.getString("image_url"),
                        rs.getInt("sales"));
                books.add(book);
            }
        } catch (SQLException e) {
            System.err.println("Error retrieving books from the database: " + e.getMessage());
            // Optionally rethrow the exception for higher-level handling
            throw new RuntimeException(e);
        }

        return books;
    }

    // Method to update the stock of a book after checkout
    public void updateStock(String bookId, int newStock) throws SQLException {
        String sql = "UPDATE books SET stock = ? WHERE book_id = ?";
        try (Connection connection = DriverManager.getConnection(dbsURL);
             PreparedStatement pstmt = connection.prepareStatement(sql)) {
            pstmt.setInt(1, newStock);  // Set the new stock quantity
            pstmt.setInt(2, Integer.parseInt(bookId));  // Assuming book_id is stored as a string
            pstmt.executeUpdate();  // Execute the update
        }
    }

    // Method to update the sales of a book after checkout
    public void updateSales(String bookId, int newSales) throws SQLException {
        String sql = "UPDATE books SET sales = ? WHERE book_id = ?";
        try (Connection connection = DriverManager.getConnection(dbsURL);
             PreparedStatement pstmt = connection.prepareStatement(sql)) {
            pstmt.setInt(1, newSales);  // Set the new stock quantity
            pstmt.setInt(2, Integer.parseInt(bookId));  // Assuming book_id is stored as a string
            pstmt.executeUpdate();  // Execute the update
        }
    }

    // Method to get the book title by bookId
    public String getBookTitleById(String bookId) {
        String sql = "SELECT title FROM books WHERE book_id = ?";
        String bookTitle = null;

        try (Connection conn = DriverManager.getConnection(dbsURL);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            // Set the bookId parameter in the query
            pstmt.setString(1, bookId);

            // Execute the query and get the result
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) {
                    bookTitle = rs.getString("title");  // Get the title from the result set
                }
            }

        } catch (SQLException e) {
            System.err.println("Error retrieving book title by bookId: " + e.getMessage());
            // Optionally rethrow the exception for higher-level handling
            throw new RuntimeException(e);
        }

        return bookTitle;
    }

    // Insert a single book into the database
    public void insertBook(Book book) {
        String sql = "INSERT INTO books(title, author, genre, description, price, stock, image_url, sales) VALUES(?,?,?,?,?,?,?,?)";

        // Try-with-resources to automatically close resources
        try (Connection conn = DriverManager.getConnection(dbsURL);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {

            pstmt.setString(1, book.getTitle());
            pstmt.setString(2, book.getAuthor());
            pstmt.setString(3, book.getGenre());
            pstmt.setString(4, book.getDescription());
            pstmt.setDouble(5, book.getPrice());
            pstmt.setInt(6, book.getStock());
            pstmt.setString(7, book.getImageUrl());
            pstmt.setInt(8, book.getSales());

            pstmt.executeUpdate();
        } catch (SQLException e) {
            System.err.println("Error inserting book into the database: " + e.getMessage());
            // Optionally rethrow the exception for higher-level handling
            throw new RuntimeException(e);
        }
    }



}
