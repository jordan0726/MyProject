package models;

public class OrderItem {
    private String bookId;
    private String title;
    private int quantity;
    private double priceAtPurchase;

    public OrderItem(String bookId, String title, int quantity, double priceAtPurchase) {
        this.bookId = bookId;
        this.title = title;
        this.quantity = quantity;
        this.priceAtPurchase = priceAtPurchase;
    }

    public String getBookId() {
        return bookId;
    }

    public String getTitle() {
        return title;
    }

    public int getQuantity() {
        return quantity;
    }

    public double getPriceAtPurchase() {
        return priceAtPurchase;
    }
}
