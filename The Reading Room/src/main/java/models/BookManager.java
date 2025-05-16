package models;


import models.Book;
import DAO.BookDAO;
import java.util.List;
import java.util.ArrayList;
import java.util.stream.Collectors;

public class BookManager {

    private final BookDAO bookDAO;
    private List<Book> books; // Store all books in memory

    // Constructor that initializes the DAO
    public BookManager(BookDAO bookDAO) {
        this.bookDAO = bookDAO;
        loadBooksFromDatabase(); // Load books into the list upon initialization
    }

    // Load books from the database and store them in the 'books' attribute
    private void loadBooksFromDatabase() {
        this.books = bookDAO.getAllBooks(); // Load all books once
    }

    // Method to get all books
    public List<Book> getAllBooks() {
        return books;
    }

    // Method to find a book by its ID
    public Book findBookById(String bookId) {
        for (Book book : books) {
            if (book.getId().equals(bookId)) {
                return book; // Return the book if a match is found
            }
        }
        return null; // Return null if no matching book is found
    }

    // Method to find a book by its title
    public Book findBookByTitle(String title) {
        for (Book book : books) {
            if (book.getTitle().equalsIgnoreCase(title)) {
                return book; // Return the book if the title matches (case insensitive)
            }
        }
        return null; // Return null if no matching book is found
    }

    // Method to get top N best-selling books
    public List<Book> getTopSellingBooks(int limit) {
        List<Book> topBooks = new ArrayList<>();
        books.sort((b1, b2) -> Integer.compare(b2.getSales(), b1.getSales())); // Sort by sales descending

        int count = 0;
        for (Book book : books) {
            if (count >= limit) {
                break; // Stop when we've added the top 'limit' books
            }
            topBooks.add(book);
            count++;
        }

        return topBooks;
    }
}

