package controllers;

import javafx.scene.control.Alert;

public abstract class BaseController {

    // Method to show alert messages
    protected void showAlert(Alert.AlertType alertType, String title, String message) {
        Alert alert = new Alert(alertType);
        alert.setTitle(title);
        alert.setContentText(message);
        alert.setHeaderText(null);
        alert.showAndWait();
    }
}