const mockSend = jest.fn();
const mockGetSignedUrl = jest.fn();

jest.mock("@aws-sdk/client-dynamodb", () => {
    const actual = jest.requireActual("@aws-sdk/client-dynamodb");
    return {
        ...actual,
        DynamoDBClient: jest.fn(() => ({ send: mockSend })),
        GetItemCommand: jest.fn() as unknown as jest.Mock,
    };
});

jest.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: mockGetSignedUrl }));

import { handler } from "../src/lambda/receipt-details";
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

    it("returns 400 when userId or receiptId is missing", async () => {
        const mockEvent = { httpMethod: "GET", pathParameters: {} } as any;
        const res = (await handler(mockEvent, mockContext, dummyCallback)) as APIGatewayProxyResult;
        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body).error).toBe("Missing userId or receiptId");
    });
});

describe("Presigned URL Lambda", () => {
    const mockContext = {} as Context;
    const dummyCallback = (_err: any, _res?: any) => { };

    beforeEach(() => {
        jest.clearAllMocks();
        mockSend.mockReset();
        mockGetSignedUrl.mockReset();
    });

    it("returns a presigned URL for a receipt", async () => {
        mockSend.mockResolvedValueOnce({
            Item: {
                receipt_id: { S: "r1" },
                user_id: { S: "u1" },
                vendor: { S: "Test Grocery" },
                total: { S: "$9.56" },
                date: { S: "23/09/2025" },
                items: { S: JSON.stringify([{ name: "Apple", category: "fresh_produce", price: 2.5, quantity: 2 }]) },
                s3_path: { S: "s3://bucket/receipt1.jpg" },
            }
        });
        mockGetSignedUrl.mockResolvedValue("https://example.com/presigned-url");

        const res = await handler({
            httpMethod: "GET",
            pathParameters: { userId: "u1", receiptId: "r1" },
        } as unknown as APIGatewayProxyEvent, mockContext, dummyCallback);

        expect(res!.statusCode).toBe(200);
        const body = JSON.parse(res!.body);
        expect(body.image_url).toBe("https://example.com/presigned-url");
    });

    it("returns 404 if receipt not found", async () => {
        mockSend.mockResolvedValueOnce({});
        const res = await handler({
            httpMethod: "GET",
            pathParameters: { userId: "u1", receiptId: "r999" },
        } as unknown as APIGatewayProxyEvent, mockContext, dummyCallback);
        expect(res!.statusCode).toBe(404);
    });

    it("returns 400 if missing path params", async () => {
        const res = await handler({ httpMethod: "GET", pathParameters: {} } as any, mockContext, dummyCallback);
        expect(res!.statusCode).toBe(400);
    });

    it("returns 500 if DynamoDB fails", async () => {
        mockSend.mockRejectedValueOnce(new Error("Boom"));
        const res = await handler({
            httpMethod: "GET",
            pathParameters: { userId: "u1", receiptId: "r1" },
        } as unknown as APIGatewayProxyEvent, mockContext, dummyCallback);
        expect(res!.statusCode).toBe(500);
    });
});
