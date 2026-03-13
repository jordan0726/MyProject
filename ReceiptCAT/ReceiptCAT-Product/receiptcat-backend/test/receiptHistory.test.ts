const mockSend = jest.fn();

jest.mock("@aws-sdk/client-dynamodb", () => {
    const actual = jest.requireActual("@aws-sdk/client-dynamodb");
    return {
        ...actual,
        DynamoDBClient: jest.fn(() => ({ send: mockSend })),
        QueryCommand: jest.fn() as unknown as jest.Mock,
    };
});

import { handler } from "../src/lambda/receipt-history";
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

describe("Receipts List Lambda", () => {
    const mockContext = {} as Context;
    const dummyCallback = (_error: any, _result?: any) => { };

    beforeEach(() => {
        jest.clearAllMocks();
        mockSend.mockReset();
    });

    it("returns receipts list successfully", async () => {
        mockSend.mockResolvedValueOnce({
            Items: [
                {
                    receipt_id: { S: "r1" },
                    date: { S: "2025-09-01" },
                    vendor: { S: "Coles" },
                    total: { N: "12.34" },
                    items: { S: "[]" },
                },
            ],
        });

        const res = await handler({
            httpMethod: "GET",
            pathParameters: { userId: "u1" },
            queryStringParameters: { fromDate: "2025-09-01", toDate: "2025-09-30" },
        } as any, mockContext, dummyCallback) as APIGatewayProxyResult;

        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body)).toEqual({
            receipts: [{ receiptId: "r1", date: "2025-09-01", vendor: "Coles", total: 12.34, itemsCount: 0 }],
            receiptsCount: 1
        });
    });

    // it("handles missing total and invalid items JSON gracefully", async () => {
    //     mockSend.mockResolvedValueOnce({
    //         Items: [
    //             {
    //                 receipt_id: { S: "r1" },
    //                 date: { S: "2025-09-01" },
    //                 vendor: { S: "BadShop" },
    //                 total: {}, // missing number
    //                 items: { S: "not-json" }, // invalid
    //             },
    //         ],
    //     });

    //     const res = await handler({
    //         httpMethod: "GET",
    //         pathParameters: { userId: "u1" },
    //         queryStringParameters: { fromDate: "2025-09-01", toDate: "2025-09-30" },
    //     } as any, mockContext, dummyCallback) as APIGatewayProxyResult;

    //     const body = JSON.parse(res.body);
    //     expect(body.receipts[0].total).toBe(0);
    // });

    it("handles missing total and invalid items JSON gracefully", async () => {
        mockSend.mockResolvedValueOnce({
            Items: [
                {
                    receipt_id: { S: "r1" },
                    date: { S: "2025-09-01" },
                    vendor: { S: "BadShop" },
                    total: {}, // missing number
                    items: { S: "not-json" }, // invalid
                },
            ],
        });

        const res = await handler({
            httpMethod: "GET",
            pathParameters: { userId: "u1" },
            queryStringParameters: {
                fromDate: "2025-09-01",
                toDate: "2025-09-30",
            },
            resource: "/users/{userId}/receipts",
        } as any, mockContext, dummyCallback);

        const body = JSON.parse(res!.body);
        console.log(body);
        expect(body.receipts[0].total).toBe(0); // defaulted
    });


    it("returns 500 if DynamoDB fails", async () => {
        mockSend.mockRejectedValueOnce(new Error("boom"));
        const res = await handler({
            httpMethod: "GET",
            pathParameters: { userId: "u1" },
            queryStringParameters: { fromDate: "2025-09-01", toDate: "2025-09-30" },
        } as any, mockContext, dummyCallback) as APIGatewayProxyResult;

        expect(res.statusCode).toBe(500);
        expect(JSON.parse(res.body).error).toBe("Internal Server Error");
    });
});
