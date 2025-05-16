package DAO;

import models.User;
import java.sql.*;

public class UserDAO extends BaseDAO{

    // Retrieve user information from the database
    public User getUserFromDB(String username) throws SQLException {
        String sql = "SELECT username, password, first_name, last_name FROM users WHERE username = ?";
        try (Connection connection = DriverManager.getConnection(dbsURL);
             PreparedStatement pstmt = connection.prepareStatement(sql)) {

            pstmt.setString(1, username);
            ResultSet rs = pstmt.executeQuery();

            if (rs.next()) {
                String password = rs.getString("password");
                String firstName = rs.getString("first_name");
                String lastName = rs.getString("last_name");
                return new User(username, password, firstName, lastName);
            }
        }
        return null; // Return null if user not found
    }

    // Update user information in the database
    public void updateUserProfile(User user) throws SQLException {
        String sql = "UPDATE users SET first_name = ?, last_name = ?, password = ? WHERE username = ?";
        try (Connection connection = DriverManager.getConnection(dbsURL);
             PreparedStatement pstmt = connection.prepareStatement(sql)) {

            pstmt.setString(1, user.getFirstName());
            pstmt.setString(2, user.getLastName());
            pstmt.setString(3, user.getPassword());
            pstmt.setString(4, user.getUsername());
            pstmt.executeUpdate();
        }
    }
}
