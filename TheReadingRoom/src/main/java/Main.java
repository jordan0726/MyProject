package main;

import javafx.application.Application;
import javafx.stage.Stage;
import javafx.scene.Scene;
import javafx.scene.Parent;
import javafx.fxml.FXMLLoader;


import java.util.Locale;

import static main.CreateTable.createDatabaseTables;

public class Main extends Application {

    @Override
    public void start(Stage primaryStage) {
        try{
            // Set teh default language to English avoid the default language being set to the system language
            Locale.setDefault(Locale.ENGLISH);

            //load the LoginView.fxml
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/fxml/LoginView.fxml"));

            //load the fxml into a parent root node
            Parent root = loader.load();


            // Set the title of the window
            primaryStage.setTitle("The Reading Room - Login");

            // Create a scene with the root node and set it on the stage
            Scene scene = new Scene(root, 720, 400);
            primaryStage.setScene(scene);
            primaryStage.show();
        }
        catch (Exception e){
            e.printStackTrace();
        }
    }

    public static void main(String[] args) {

        // Call the method to create the database tables before launching the application
        createDatabaseTables();
        // Launch the JavaFX application
        launch(args);
    }
}
