const mockSend = jest.fn();

jest.mock("@aws-sdk/client-dynamodb", () => {
    const actual = jest.requireActual("@aws-sdk/client-dynamodb");
    return {
        ...actual,
        DynamoDBClient: jest.fn(() => ({ send: mockSend })),
        QueryCommand: jest.fn() as unknown as jest.Mock,
    };
});

import { handler } from "../src/lambda/dashboard";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";


describe("Lambda handler - OPTIONS", () => {
    const mockContext = {} as Context;
    const dummyCallback = (_error: any, _result?: any) => { };

    it("handles OPTIONS preflight", async () => {
        const mockEvent = { httpMethod: "OPTIONS" } as any;
        const res = (await handler(mockEvent, mockContext, dummyCallback)) as APIGatewayProxyResult;
        expect(res.statusCode).toBe(200);
        expect(res.headers!["Access-Control-Allow-Origin"]).toBe("*");
    });

    it("returns 400 when parameters are missing", async () => {
        const mockEvent = { httpMethod: "GET", pathParameters: {} } as any;
        const res = (await handler(mockEvent, mockContext, dummyCallback)) as APIGatewayProxyResult;
        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body).error).toBe("Missing parameters");
    });
});

describe("Dashboard Lambda", () => {
    const mockContext = {} as Context;
    const dummyCallback = (_err: any, _res?: any) => { };

    beforeEach(() => {
        jest.clearAllMocks();
        mockSend.mockReset();
    });

    it("groups items by category and sums totals", async () => {
        mockSend.mockResolvedValueOnce({
            Items: [
                {
                    receipt_id: { S: "r1" },
                    date: { S: "2025-09-01" },
                    vendor: { S: "Woolies" },
                    total: { N: "10.00" },
                    items: {
                        S: JSON.stringify([
                            { name: "Milk", category: "Dairy", price: 2.5, quantity: 2 },
                            { name: "Apple", price: 1 }, // goes to Other
                        ])
                    },
                },
            ],
        });

        const res = await handler({
            httpMethod: "GET",
            pathParameters: { userId: "u1" },
            queryStringParameters: { fromDate: "2025-09-01", toDate: "2025-09-30" },
        } as any, mockContext, dummyCallback);

        const body = JSON.parse(res!.body);
        expect(body).toEqual({
            categoryGroups: [
                { category: "Dairy", items: [{ name: "Milk", price: 2.5, quantity: 2 }], total: 5 },
                { category: "Other", items: [{ name: "Apple", price: 1, quantity: 1 }], total: 1 },
            ],
            receiptsCount: 1
        });
    });

    it("sanitises string prices and quantities in category grouping", async () => {
        mockSend.mockResolvedValueOnce({
            Items: [
                {
                    receipt_id: { S: "r4" },
                    date: { S: "2025-09-04" },
                    vendor: { S: "TestMart" },
                    total: { N: "5.00" },
                    items: {
                        S: JSON.stringify([{ name: "Egg", category: "Grocery", price: "AUD 2.5", quantity: "2" }])
                    },
                },
            ],
        });

        const res = await handler({
            httpMethod: "GET",
            pathParameters: { userId: "u4" },
            queryStringParameters: { fromDate: "2025-09-01", toDate: "2025-09-30" },
        } as any, mockContext, dummyCallback);

        const body = JSON.parse(res!.body);
        expect(body).toEqual({
            categoryGroups: [
                { category: "Grocery", items: [{ name: "Egg", price: 2.5, quantity: 2 }], total: 5.0 }
            ],
            receiptsCount: 1
        });
    });

    it("returns 500 when DynamoDB throws an error", async () => {

        // Arrange
        mockSend.mockRejectedValueOnce(new Error("DynamoDB query failed"));

        const event = {
            httpMethod: "GET",
            pathParameters: { userId: "u1" },
            queryStringParameters: {
                fromDate: "2025-01-01",
                toDate: "2025-01-31",
            },
            resource: "/users/{userId}/receipts",
        } as any;

        // Act
        const result = await handler(event, mockContext, dummyCallback);

        // Assert
        expect(result!.statusCode).toBe(500);
        expect(JSON.parse(result!.body)).toEqual({ error: "Internal Server Error" });
    });

    
});
