import { sanitiseAmount, buildCategoryGroups, Receipt } from "../src/lib/receiptsUtils";

describe("receiptUtils", () => {
    describe("sanitiseAmount", () => {
        it("returns 0.0 for null, undefined, or empty values", () => {
            expect(sanitiseAmount(null)).toBe(0.0);
            expect(sanitiseAmount(undefined)).toBe(0.0);
            expect(sanitiseAmount("")).toBe(0.0);
        });

        it("parses valid numbers correctly", () => {
            expect(sanitiseAmount("123.45")).toBe(123.45);
            expect(sanitiseAmount(99.99)).toBe(99.99);
            expect(sanitiseAmount("100")).toBe(100.0);
        });

        it("strips currency symbols and commas", () => {
            expect(sanitiseAmount("$1,234.56")).toBe(1234.56);
            expect(sanitiseAmount("AUD 78.9")).toBe(78.9);
            expect(sanitiseAmount("1,000")).toBe(1000.0);
        });

        it("handles malformed strings gracefully", () => {
            expect(sanitiseAmount("abc")).toBe(0.0);
            expect(sanitiseAmount("12abc34")).toBe(1234);
        });

        it("handles negative numbers and rounding", () => {
            expect(sanitiseAmount("-45.678")).toBe(-45.68);
            expect(sanitiseAmount("-$1,234.5")).toBe(-1234.5);
        });
    });

    describe("buildCategoryGroups", () => {
        const receipts: Receipt[] = [
            {
                receiptId: "r1",
                date: "2025-09-01",
                vendor: "Coles",
                total: 15.0,
                items: [
                    { receiptId: "r1", name: "Milk", category: "Dairy", price: 2.5, quantity: 2 },
                    { receiptId: "r1", name: "Cheese", category: "Dairy", price: 5, quantity: 1 },
                    { receiptId: "r1", name: "Apple", price: 1.2, quantity: 3 }, // No category
                ],
            },
            {
                receiptId: "r2",
                date: "2025-09-02",
                vendor: "Woolworths",
                total: 10.0,
                items: [
                    { receiptId: "r2", name: "Bread", category: "Bakery", price: 3 },
                    { receiptId: "r2", name: "Eggs", category: "Dairy", price: 4, quantity: 1 },
                ],
            },
        ];


        it("returns empty array when receipts list is empty", () => {
            expect(buildCategoryGroups([])).toEqual([]);
        });

        it("handles items without quantity (defaults to 1)", () => {
            const receipts: Receipt[] = [
                {
                    receiptId: "r1",
                    date: "2025-09-03",
                    vendor: "Aldi",
                    total: 4,
                    items: [{ receiptId: "r1", name: "Banana", category: "Fruit", price: 2 }],
                },
            ];

            const result = buildCategoryGroups(receipts);
            expect(result[0].items[0].quantity).toBe(1);
            expect(result[0].total).toBe(2);
        });
    });

    it("handles strings with multiple symbols and spaces", () => {
        expect(sanitiseAmount("  USD 1,234.56  ")).toBe(1234.56);
        expect(sanitiseAmount("€-987.65")).toBe(-987.65);
    });

    it("handles inputs with multiple dots or commas gracefully", () => {
        expect(sanitiseAmount("1,234.5.6")).toBe(1234.5); // strips invalid chars
        expect(sanitiseAmount("1,2,3,4")).toBe(1234);
    });

    it("handles extremely large or small numbers", () => {
        expect(sanitiseAmount("1000000000")).toBe(1000000000);
        expect(sanitiseAmount("0.0001")).toBe(0.0); // rounds to 2 decimals
    });

    it("groups multiple receipts with overlapping categories correctly", () => {
        const receipts: Receipt[] = [
            {
                receiptId: "r1",
                date: "2025-09-01",
                vendor: "Store1",
                total: 10,
                items: [
                    { receiptId: "r1", name: "Milk", category: "Dairy", price: 2, quantity: 2 },
                ],
            },
            {
                receiptId: "r2",
                date: "2025-09-02",
                vendor: "Store2",
                total: 5,
                items: [
                    { receiptId: "r2", name: "Cheese", category: "Dairy", price: 3, quantity: 1 },
                    { receiptId: "r2", name: "Bread", category: "Bakery", price: 2, quantity: 1 },
                ],
            },
        ];

        const result = buildCategoryGroups(receipts);
        const dairyGroup = result.find(g => g.category === "Dairy");
        const bakeryGroup = result.find(g => g.category === "Bakery");

        expect(dairyGroup?.items.length).toBe(2);
        expect(dairyGroup?.total).toBe(7); // 2*2 + 3*1
        expect(bakeryGroup?.total).toBe(2);
    });

    it("handles items with undefined or empty category", () => {
        const receipts: Receipt[] = [
            {
                receiptId: "r3",
                date: "2025-09-03",
                vendor: "Store3",
                total: 5,
                items: [
                    { receiptId: "r3", name: "UnknownItem", category: undefined, price: 5 },
                ],
            },
        ];

        const result = buildCategoryGroups(receipts);
        expect(result[0].category).toBe("Other");
        expect(result[0].items[0].name).toBe("UnknownItem");
    });

    it("handles items with zero price correctly", () => {
        const receipts: Receipt[] = [
            {
                receiptId: "r4",
                date: "2025-09-04",
                vendor: "Store4",
                total: 0,
                items: [
                    { receiptId: "r4", name: "FreeSample", category: "Promotions", price: 0 },
                ],
            },
        ];

        const result = buildCategoryGroups(receipts);
        expect(result[0].total).toBe(0);
    });

    it("sums quantities correctly when quantity > 1", () => {
        const receipts: Receipt[] = [
            {
                receiptId: "r5",
                date: "2025-09-05",
                vendor: "Store5",
                total: 15,
                items: [
                    { receiptId: "r5", name: "Apple", category: "Fruit", price: 2, quantity: 3 },
                    { receiptId: "r5", name: "Orange", category: "Fruit", price: 3, quantity: 2 },
                ],
            },
        ];

        const result = buildCategoryGroups(receipts);
        const fruitGroup = result[0];
        expect(fruitGroup.total).toBe(12); // 2*3 + 3*2
    });
});
