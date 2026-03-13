import { handler } from "../src/lambda/presign-upload";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

jest.mock("@aws-sdk/s3-request-presigner", () => ({
    getSignedUrl: jest.fn().mockResolvedValue("https://signed-url.com/upload"),
}));

const baseEvent: Partial<APIGatewayProxyEvent> = {
    httpMethod: "POST",
    requestContext: { authorizer: { claims: { sub: "user123" } } } as any,
    body: JSON.stringify({
        fileName: "receipt.png",
        contentType: "image/png",
    }),
};

// Helper to call the Lambda handler in tests with dummy context/callback
async function invoke(
    event: Partial<APIGatewayProxyEvent>
): Promise<APIGatewayProxyResult> {
    return (await handler(event as any, {} as any, null as any)) as APIGatewayProxyResult;
}

describe("presign-upload Lambda", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.RECEIPTS_BUCKET_NAME = "test-bucket";
    });

    // Test 1: 
    // Happy path (Valid url and key returns signed URL)
    it("should return signed URL for valid request", async () => {
        const res = await invoke(baseEvent);

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.uploadUrl).toBe("https://signed-url.com/upload");
        expect(body.key).toContain("tmp/users/user123/receipts/");
        expect(getSignedUrl).toHaveBeenCalledTimes(1);
    });

    // Test 2: 
    // 401 ERROR (missing credential) in case of missing user sub ID
    it("should return 401 if no user sub in claims", async () => {
        const event = {
            ...baseEvent,
            requestContext: { authorizer: { claims: {} } } as any,
        };

        const res = await invoke(event);

        expect(res.statusCode).toBe(401);
        expect(res.body).toContain("Unauthorized");
    });

    // Test 3: 
    // 400 ERROR (bad request), no URL or key sent
    it("should return 400 if body is missing", async () => {
        const event = { ...baseEvent, body: undefined };

        const res = await invoke(event);

        expect(res.statusCode).toBe(400);
        expect(res.body).toContain("Empty body");
    });

    // Test 4: 
    // 400 ERROR (bad request), the body is sent in the wrong format (not JSON)
    it("should handle invalid JSON body", async () => {
        const event = { ...baseEvent, body: "not-json" };

        const res = await invoke(event);

        expect(res.statusCode).toBe(400);
        expect(res.body).toContain("Invalid JSON body");
    });

    // Test 5: 
    // Checks if a preflight request is accepted
    it("should handle OPTIONS preflight request", async () => {
        const event = { ...baseEvent, httpMethod: "OPTIONS" };

        const res = await invoke(event);

        expect(res.statusCode).toBe(200);
        expect(res.body).toBe("");
    });

    // Test 6: 
    // 400 ERROR (bad request), no file name or content type sent
    it("should return 400 if filename or content type is missing", async () => {
        // Cloning the base event but removing file name and content type
        const event = {
            ...baseEvent,
            body: JSON.stringify({}) // empty body (missing file name and content type)
        };

        const res = await invoke(event);

        expect(res.statusCode).toBe(400);
        expect(res.body).toContain("fileName and contentType are required");
    });

    // Test 7: 
    // 500 ERROR (internal server error) when S3 presign fails
    it("should return 500 if an unexpected error occurs", async () => {
        // Mocking getSignedUrl to throw an error
        (getSignedUrl as jest.Mock).mockRejectedValueOnce(new Error("S3 failure"));

        const res = await invoke(baseEvent);

        expect(res.statusCode).toBe(500);
        const body = JSON.parse(res.body);
        expect(body.message).toBe("Internal Server Error");
    });
});
