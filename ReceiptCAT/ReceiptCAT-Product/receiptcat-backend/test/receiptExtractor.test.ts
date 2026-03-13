// Mock all AWS clients
jest.mock("@aws-sdk/client-s3");
jest.mock("@aws-sdk/client-textract");
jest.mock("@aws-sdk/client-dynamodb");
jest.mock("@aws-sdk/client-sns");

import { handler, sanitiseAmount, sanitiseDate } from "../src/lambda/receipt-extractor";
import { S3Event } from "aws-lambda";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { TextractClient } from "@aws-sdk/client-textract";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import * as dynamoDB from "@aws-sdk/client-dynamodb";
import { SNSClient } from "@aws-sdk/client-sns";

const bucketName = "test-bucket";
const validKey = "tmp/users/89def468-3091-7077-aeab-99834c56fd30/receipts/1756902256823_46c1b379-b463-40d9-a87e-d115ca1c8bb3_IMG-20250831-WA0011.jpg";

const fakeS3Event: S3Event = {
    Records: [
        {
            eventVersion: "2.1",
            eventSource: "aws:s3",
            awsRegion: "ap-southeast-2",
            eventTime: new Date().toISOString(),
            eventName: "ObjectCreated:Put",
            userIdentity: { principalId: "EXAMPLE" },
            requestParameters: { sourceIPAddress: "127.0.0.1" },
            responseElements: { "x-amz-request-id": "EXAMPLE", "x-amz-id-2": "EXAMPLE" },
            s3: {
                s3SchemaVersion: "1.0",
                configurationId: "testConfig",
                bucket: {
                    name: bucketName,
                    ownerIdentity: { principalId: "EXAMPLE" },
                    arn: `arn:aws:s3:::${bucketName}`,
                },
                object: {
                    key: validKey,
                    size: 12345,
                    eTag: "etag-example",
                    sequencer: "12345",
                },
            },
        },
    ],
};

describe("ReceiptProcessor Lambda", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (S3Client.prototype.send as jest.Mock).mockResolvedValue({});
        (TextractClient.prototype.send as jest.Mock).mockResolvedValue({ ExpenseDocuments: [] });
        (DynamoDBClient.prototype.send as jest.Mock).mockResolvedValue({});
        (SNSClient.prototype.send as jest.Mock).mockResolvedValue({});
    });

    it("should process a valid S3 event", async () => {
        await expect(handler(fakeS3Event)).resolves.toBeUndefined();

        // Check S3 HeadObject was called
        expect(S3Client.prototype.send).toHaveBeenCalledWith(expect.any(HeadObjectCommand));
    });

    it("should throw error for invalid S3 key", async () => {
        const badEvent = JSON.parse(JSON.stringify(fakeS3Event));
        badEvent.Records[0].s3.object.key = "invalid-key.jpg";

        await expect(handler(badEvent)).rejects.toThrow(
            "S3 key does not follow expected structure"
        );
    });

    it("should throw if S3 object does not exist", async () => {
        (S3Client.prototype.send as jest.Mock).mockRejectedValueOnce(new Error("Not found"));

        await expect(handler(fakeS3Event)).rejects.toThrow(/S3 object not found/);
    });

    it("should handle Textract failure gracefully", async () => {
        (TextractClient.prototype.send as jest.Mock).mockRejectedValueOnce(new Error("Textract failed"));

        await expect(handler(fakeS3Event)).rejects.toThrow("Textract failed");
    });

    const today = new Date().toISOString().split("T")[0];

    it("normalises common date formats to YYYY-MM-DD", () => {
        expect(sanitiseDate("2025-09-13")).toBe("2025-09-13"); // ISO
        expect(sanitiseDate("09/13/2025")).toBe("2025-09-13"); // US format
        expect(sanitiseDate("13/09/2025")).toBe("2025-09-13"); // EU format
        expect(sanitiseDate("Sep 13, 2025")).toBe("2025-09-13"); // text month
    });

    it("returns today for empty or unparseable input", () => {
        expect(sanitiseDate("")).toBe(today);
        expect(sanitiseDate("not-a-date")).toBe(today);
    });

    it("normalises valid amounts to numbers with 2 decimals", () => {
        expect(sanitiseAmount("12")).toBe(12.00);         // integer
        expect(sanitiseAmount("12.5")).toBe(12.50);       // 1 decimal
        expect(sanitiseAmount("12.345")).toBe(12.35);     // rounds up
        expect(sanitiseAmount("12,50")).toBe(12.50);      // EU format
    });

    it("handles currency symbols and invalid values gracefully", () => {
        expect(sanitiseAmount("$12.40")).toBe(12.40);
        expect(sanitiseAmount("AUD 12")).toBe(12.00);
        expect(sanitiseAmount("")).toBe(0.00);
        expect(sanitiseAmount("abc")).toBe(0.00);
    });

    describe("DynamoDB persistence", () => {
        let lastPutItemArgs: any = null;

        beforeAll(() => {
            jest.spyOn(dynamoDB, "PutItemCommand").mockImplementation((args: any) => {
                lastPutItemArgs = args;
                return { input: args } as any;
            });
        });

        beforeEach(() => {
            lastPutItemArgs = null;
        });

        it("should receipt total as stringified number in DynamoDB", async () => {
            (TextractClient.prototype.send as jest.Mock).mockResolvedValueOnce({
                ExpenseDocuments: [
                    {
                        SummaryFields: [
                            { Type: { Text: "TOTAL" }, ValueDetection: { Text: "35.92" } },
                            { Type: { Text: "INVOICE_RECEIPT_DATE" }, ValueDetection: { Text: "2025-04-16" } },
                            { Type: { Text: "VENDOR_NAME" }, ValueDetection: { Text: "TestVendor" } },
                        ],
                    },
                ],
            });

            await handler(fakeS3Event);

            expect(lastPutItemArgs.Item).toEqual(
                expect.objectContaining({
                    total: { N: "35.92" },
                    date: { S: "2025-04-16" },
                    vendor: { S: "TestVendor" },
                })
            );
        });

        it("should normalise odd receipt total formats", async () => {
            (TextractClient.prototype.send as jest.Mock).mockResolvedValueOnce({
                ExpenseDocuments: [
                    {
                        SummaryFields: [
                            { Type: { Text: "TOTAL" }, ValueDetection: { Text: "$ 5.5" } },
                            { Type: { Text: "INVOICE_RECEIPT_DATE" }, ValueDetection: { Text: "2025-04-16" } },
                            { Type: { Text: "VENDOR_NAME" }, ValueDetection: { Text: "TestVendor" } },
                        ],
                    },
                ],
            });

            await handler(fakeS3Event);

            expect(lastPutItemArgs.Item).toEqual(
                expect.objectContaining({
                    total: { N: "5.50" },
                    date: { S: "2025-04-16" },
                    vendor: { S: "TestVendor" },
                })
            );
        });

        it("should default malformed receipt totals to 0.00", async () => {
            (TextractClient.prototype.send as jest.Mock).mockResolvedValueOnce({
                ExpenseDocuments: [
                    {
                        SummaryFields: [
                            { Type: { Text: "TOTAL" }, ValueDetection: { Text: "abc" } },
                            { Type: { Text: "INVOICE_RECEIPT_DATE" }, ValueDetection: { Text: "16 Apr 2025" } },
                            { Type: { Text: "VENDOR_NAME" }, ValueDetection: { Text: " Store 123 " } },
                        ],
                    },
                ],
            });

            await handler(fakeS3Event);

            expect(lastPutItemArgs.Item).toEqual(
                expect.objectContaining({
                    total: { N: "0.00" },
                    date: { S: "2025-04-16" },
                    vendor: { S: "Store 123" },
                })
            );
        });

        //2025-01-16 Added by Jordan Chiou
        it("should sum line item prices when total missing but have items", async () => {
            (TextractClient.prototype.send as jest.Mock).mockResolvedValueOnce({
                ExpenseDocuments: [
                    {
                        SummaryFields: [
                            { Type: { Text: "INVOICE_RECEIPT_DATE" }, ValueDetection: { Text: "2025-01-15" } },
                            { Type: { Text: "VENDOR_NAME" }, ValueDetection: { Text: "Fallback Vendor" } },
                        ],
                        LineItemGroups: [
                            {
                                LineItems: [
                                    {
                                        LineItemExpenseFields: [
                                            { Type: { Text: "ITEM" }, ValueDetection: { Text: "Coffee" } },
                                            { Type: { Text: "PRICE" }, ValueDetection: { Text: "3.25" } },
                                        ],
                                    },
                                    {
                                        LineItemExpenseFields: [
                                            { Type: { Text: "ITEM" }, ValueDetection: { Text: "Bagel" } },
                                            { Type: { Text: "PRICE" }, ValueDetection: { Text: "4.75" } },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });

            await handler(fakeS3Event);

            expect(lastPutItemArgs.Item).toEqual(
                expect.objectContaining({
                    total: { N: "8.00" },
                    date: { S: "2025-01-15" },
                    vendor: { S: "Fallback Vendor" },
                })
            );
        });

        it("should normalise odd receipt date formats", async () => {
            (TextractClient.prototype.send as jest.Mock).mockResolvedValueOnce({
                ExpenseDocuments: [
                    {
                        SummaryFields: [
                            { Type: { Text: "TOTAL" }, ValueDetection: { Text: "$10.25" } },
                            { Type: { Text: "INVOICE_RECEIPT_DATE" }, ValueDetection: { Text: "01 Aug. 2025" } },
                            { Type: { Text: "VENDOR_NAME" }, ValueDetection: { Text: "Metro" } },
                        ],
                    },
                ],
            });

            await handler(fakeS3Event);

            expect(lastPutItemArgs.Item.date).toEqual({ S: "2025-08-01" });
        });

        it("should trim vendor names properly", async () => {
            (TextractClient.prototype.send as jest.Mock).mockResolvedValueOnce({
                ExpenseDocuments: [
                    {
                        SummaryFields: [
                            { Type: { Text: "TOTAL" }, ValueDetection: { Text: "$3.50" } },
                            { Type: { Text: "INVOICE_RECEIPT_DATE" }, ValueDetection: { Text: "22/08/25" } },
                            { Type: { Text: "VENDOR_NAME" }, ValueDetection: { Text: "  MAD MEX \n " } },
                        ],
                    },
                ],
            });

            await handler(fakeS3Event);

            expect(lastPutItemArgs.Item.vendor).toEqual({ S: "MAD MEX" });
        });

        it("should store receipt items with sanitised price and quantity", async () => {
            (TextractClient.prototype.send as jest.Mock).mockResolvedValueOnce({
                ExpenseDocuments: [
                    {
                        SummaryFields: [
                            { Type: { Text: "TOTAL" }, ValueDetection: { Text: "$37.50" } },
                            { Type: { Text: "INVOICE_RECEIPT_DATE" }, ValueDetection: { Text: "2025-09-01" } },
                            { Type: { Text: "VENDOR_NAME" }, ValueDetection: { Text: "TestVendor" } },
                        ],
                        LineItemGroups: [
                            {
                                LineItems: [
                                    {
                                        LineItemExpenseFields: [
                                            { Type: { Text: "ITEM" }, ValueDetection: { Text: "Burrito" } },
                                            { Type: { Text: "PRICE" }, ValueDetection: { Text: "$12.5" } },
                                            { Type: { Text: "QUANTITY" }, ValueDetection: { Text: "2" } },
                                        ],
                                    },
                                    {
                                        LineItemExpenseFields: [
                                            { Type: { Text: "ITEM" }, ValueDetection: { Text: "Soda" } },
                                            { Type: { Text: "PRICE" }, ValueDetection: { Text: "3" } },
                                        ],
                                    },
                                    {
                                        LineItemExpenseFields: [
                                            { Type: { Text: "ITEM" }, ValueDetection: { Text: "Chips" } },
                                            { Type: { Text: "PRICE" }, ValueDetection: { Text: "AUD $ 5.5" } },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });

            await handler(fakeS3Event);

            const items = JSON.parse(lastPutItemArgs.Item.items.S);
            expect(items).toEqual([
                { name: "Burrito", price: 12.50, quantity: 2 },
                { name: "Soda", price: 3.00, quantity: 1 },
                { name: "Chips", price: 5.50, quantity: 1 },
            ]);
        });
    });
});
