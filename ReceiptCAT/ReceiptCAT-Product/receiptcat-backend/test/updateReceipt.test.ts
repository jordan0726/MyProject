const mockSend = jest.fn();

jest.mock("@aws-sdk/client-dynamodb", () => {
    const actual = jest.requireActual("@aws-sdk/client-dynamodb");
    return {
        ...actual,
        DynamoDBClient: jest.fn(() => ({ send: mockSend })),
        GetItemCommand: jest.fn() as unknown as jest.Mock,
        UpdateItemCommand: jest.fn() as unknown as jest.Mock,
    };
});

import { handler } from "../src/lambda/update-receipt";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { UpdateItemCommand } from "@aws-sdk/client-dynamodb";

describe("Lambda handler - OPTIONS", () => {
    const mockContext = {} as Context;
    const dummyCallback = (_error: any, _result?: any) => { };

    it("handles OPTIONS preflight", async () => {
        const mockEvent = { httpMethod: "OPTIONS" } as any;
        const res = (await handler(mockEvent, mockContext, dummyCallback)) as APIGatewayProxyResult;
        expect(res.statusCode).toBe(200);
        expect(res.headers!["Access-Control-Allow-Origin"]).toBe("*");
    });

    it("returns 400 when userId is missing", async () => {
        const mockEvent = { httpMethod: "PUT", pathParameters: {} } as any;
        const res = (await handler(mockEvent, mockContext, dummyCallback)) as APIGatewayProxyResult;
        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body).error).toBe("Missing parameters or body");
    });
});


describe("Update Receipt Lambda", () => {
    const mockContext = {} as Context;
    const dummyCallback = (_err: any, _res?: any) => { };

    beforeEach(() => {
        jest.clearAllMocks();
        mockSend.mockReset();
    });

    it("updates vendor only", async () => {
        mockSend.mockResolvedValueOnce({ Item: { receipt_id: { S: "r1" }, user_id: { S: "u1" }, vendor: { S: "Old Vendor" }, total: { N: "9.56" }, items: { S: "[]" } } });
        mockSend.mockResolvedValueOnce({}); // Update

        const res = await handler({
            httpMethod: "PUT",
            pathParameters: { userId: "u1", receiptId: "r1" },
            body: JSON.stringify({ vendor: "New Vendor" }),
        } as unknown as APIGatewayProxyEvent, mockContext, dummyCallback);

        expect(res!.statusCode).toBe(200);
        const body = JSON.parse(res!.body);
        expect(body.vendor).toBe("New Vendor");
    });

    it("returns 400 if no valid fields are sent", async () => {
        const res = await handler({
            httpMethod: "PUT",
            pathParameters: { userId: "u1", receiptId: "r1" },
            body: JSON.stringify({ foo: "bar" }),
        } as unknown as APIGatewayProxyEvent, mockContext, dummyCallback);
        expect(res!.statusCode).toBe(400);
    });

    it("returns 404 if receipt not found", async () => {
        mockSend.mockResolvedValueOnce({}); // GetItem returns nothing
        const res = await handler({
            httpMethod: "PUT",
            pathParameters: { userId: "u1", receiptId: "r1" },
            body: JSON.stringify({ vendor: "New Vendor" }),
        } as unknown as APIGatewayProxyEvent, mockContext, dummyCallback);
        expect(res!.statusCode).toBe(404);
    });

    it("returns 500 if DynamoDB update fails", async () => {
        mockSend.mockResolvedValueOnce({ Item: { receipt_id: { S: "r1" }, user_id: { S: "u1" }, vendor: { S: "Old Vendor" }, total: { N: "9.56" }, items: { S: "[]" } } });
        mockSend.mockRejectedValueOnce(new Error("Boom"));

        const res = await handler({
            httpMethod: "PUT",
            pathParameters: { userId: "u1", receiptId: "r1" },
            body: JSON.stringify({ vendor: "New Vendor" }),
        } as unknown as APIGatewayProxyEvent, mockContext, dummyCallback);

        expect(res!.statusCode).toBe(500);
    });
});
