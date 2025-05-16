package main;
import java.io.File;
import java.sql.*;

public class CreateTable {
    public static void createDatabaseTables() {
        String dbsUrl = "jdbc:sqlite:TheReadingRoom.db";

        // Check if the database file already exists
        File dbFile = new File("TheReadingRoom.db");
        if (dbFile.exists()) {
            System.out.println("Database already exists.");
        }
        else {
            System.out.println("Database does not exist. Creating new database and tables.");
        }
        try {
            // Create a connection to the database (this will also create the database file if it doesn't exist)
            Connection conn = DriverManager.getConnection(dbsUrl);
            // create a statement object
            Statement stmt = conn.createStatement();

            //SQL statement for user table
            String userSql = "CREATE TABLE IF NOT EXISTS users (\n"
                    + " id INTEGER PRIMARY KEY AUTOINCREMENT,\n"
                    + " username TEXT NOT NULL UNIQUE,\n"
                    + " password TEXT NOT NULL,\n"
                    + " first_name TEXT NOT NULL,\n"
                    + " last_name TEXT NOT NULL\n"
                    + ");";

            String bookSql = "CREATE TABLE IF NOT EXISTS books (\n"
                    + " book_id INTEGER PRIMARY KEY AUTOINCREMENT,\n"
                    + " title TEXT NOT NULL,\n"
                    + " author TEXT NOT NULL,\n"
                    + " genre TEXT,\n"
                    + " description TEXT,\n"
                    + " price REAL,\n"
                    + " stock INTEGER,\n"
                    + " image_url TEXT,\n"
                    + " sales INTEGER\n"
                    + ");";

            // SQL statement for shoppingcart table (associated with usernames)
            String shoppingCartSql = "CREATE TABLE IF NOT EXISTS shoppingcarts (\n"
                    + " shoppingcart_id INTEGER PRIMARY KEY AUTOINCREMENT,\n"
                    + " username TEXT NOT NULL,\n"
                    + " FOREIGN KEY (username) REFERENCES users(username)\n"
                    + ");";

            // SQL statement for cartitem table (associated with shoppingcart and books)
            String cartItemSql = "CREATE TABLE IF NOT EXISTS cartitems (\n"
                    + " cartitem_id INTEGER PRIMARY KEY AUTOINCREMENT,\n"
                    + " shoppingcart_id INTEGER NOT NULL,\n"
                    + " book_id INTEGER NOT NULL,\n"
                    + " quantity INTEGER NOT NULL,\n"
                    + " FOREIGN KEY (shoppingcart_id) REFERENCES shoppingcart(shoppingcart_id),\n"
                    + " FOREIGN KEY (book_id) REFERENCES books(book_id)\n"
                    + ");";

            // SQL statement for order table (historical orders)
            String orderSql = "CREATE TABLE IF NOT EXISTS orders (\n"
                    + " order_id INTEGER PRIMARY KEY AUTOINCREMENT,\n"
                    + " username TEXT NOT NULL,\n"
                    + " order_date DATETIME DEFAULT CURRENT_TIMESTAMP,\n"
                    + " total_price REAL NOT NULL,\n"
                    + " FOREIGN KEY (username) REFERENCES users(username)\n"
                    + ");";

            // SQL statement for orderitem table (associated with orders and books)
            String orderItemSql = "CREATE TABLE IF NOT EXISTS orderitems (\n"
                    + " orderitem_id INTEGER PRIMARY KEY AUTOINCREMENT,\n"
                    + " order_id INTEGER NOT NULL,\n"
                    + " book_id INTEGER NOT NULL,\n"
                    + " quantity INTEGER NOT NULL,\n"
                    + " price_at_purchase REAL NOT NULL,\n"
                    + " FOREIGN KEY (order_id) REFERENCES orders(order_id),\n"
                    + " FOREIGN KEY (book_id) REFERENCES books(book_id)\n"
                    + ");";

            //execute the sql statement
            stmt.execute(userSql);
            stmt.execute(bookSql);
            stmt.execute(shoppingCartSql);
            stmt.execute(cartItemSql);
            stmt.execute(orderSql);
            stmt.execute(orderItemSql);
            System.out.println("Table created successfully");

            // Insert default admin user if not exists
            String insertAdminSql = "INSERT OR IGNORE INTO users (id, username, password, first_name, last_name) "
                    + "VALUES (0, 'admin', 'reading_admin', 'Admin', 'Admin');";
            stmt.execute(insertAdminSql);

            // Insert default books if not exists
            String[] bookInserts = {
                    "INSERT OR IGNORE INTO books (book_id, title, author, genre, description, price, stock, image_url, sales) " +
                            "VALUES (1, 'Absolute Java', 'Savitch', 'Programming', 'An advanced guide...', 50.0, 10, 'book1.png', 142);",
                    "INSERT OR IGNORE INTO books (book_id, title, author, genre, description, price, stock, image_url, sales) " +
                            "VALUES (2, 'JAVA: How to Program', 'Deitel and Deitel', 'Programming', 'Essentials of Data Science...', 70.0, 100, 'book2.png', 475);",
                    "INSERT OR IGNORE INTO books (book_id, title, author, genre, description, price, stock, image_url, sales) " +
                            "VALUES (3, 'Computing Concepts with JAVA 8 Essentials', 'Horstman', 'Programming', 'Introduction to database systems...', 89.0, 500, 'book3.png', 60);",
                    "INSERT OR IGNORE INTO books (book_id, title, author, genre, description, price, stock, image_url, sales) " +
                            "VALUES (4, 'Java Software Solutions', 'Lewis and Loftus', 'Programming', 'Learn Python from scratch...', 99.0, 500, 'book4.png', 12);",
                    "INSERT OR IGNORE INTO books (book_id, title, author, genre, description, price, stock, image_url, sales) " +
                            "VALUES (5, 'Java Program Design', 'Cohoon and Davidson', 'Programming', 'Build web applications...', 29.0, 2, 'book5.png', 86);",
                    "INSERT OR IGNORE INTO books (book_id, title, author, genre, description, price, stock, image_url, sales) " +
                            "VALUES (6, 'Clean Code', 'Robert Martin', 'Programming', 'Master C++ with practical examples...', 45.0, 100, 'book6.png', 300);",
                    "INSERT OR IGNORE INTO books (book_id, title, author, genre, description, price, stock, image_url, sales) " +
                            "VALUES (7, 'Gray Hat C#', 'Brandon Perry', 'Programming', 'A complete guide to Python...', 68.0, 300, 'book7.png', 178);",
                    "INSERT OR IGNORE INTO books (book_id, title, author, genre, description, price, stock, image_url, sales) " +
                            "VALUES (8, 'Python Basics', 'David Amos', 'Programming', 'A complete guide to Python...', 49.0, 1000, 'book8.png', 79);",
                    "INSERT OR IGNORE INTO books (book_id, title, author, genre, description, price, stock, image_url, sales) " +
                            "VALUES (9, 'Bayesian Statistics The Fun Way', 'Will Kurt', 'Programming', 'A complete guide to Python...', 42.0, 600, 'book9.png', 155);"
            };

            for (String bookInsert : bookInserts) {
                stmt.execute(bookInsert);
            }

        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }
    }
}
