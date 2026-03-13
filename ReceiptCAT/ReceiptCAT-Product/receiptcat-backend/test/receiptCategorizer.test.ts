const bedrockSendMock = jest.fn();
const dynamoSendMock = jest.fn();
const sesSendMock = jest.fn();


//Setting up mock Bedrock client and command
jest.mock("@aws-sdk/client-bedrock-runtime", () => {
  const actual = jest.requireActual("@aws-sdk/client-bedrock-runtime");
  return {
    ...actual,
    BedrockRuntimeClient: jest.fn(() => ({ send: bedrockSendMock })),
  };
});

//Setting up mock DynamoDB client and command
jest.mock("@aws-sdk/client-dynamodb", () => {
  const actual = jest.requireActual("@aws-sdk/client-dynamodb");
  return {
    ...actual,
    DynamoDBClient: jest.fn(() => ({ send: dynamoSendMock })),
  };
});

// Setting mock environment variables
process.env.RECEIPTS_TABLE = "test-table";

import { handler } from "../src/lambda/receipt-categorizer";
import {
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { UpdateItemCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";

describe("ReceiptCategorizer Lambda", () => {

  beforeEach(() => {

    bedrockSendMock.mockReset();
    dynamoSendMock.mockReset();
    sesSendMock.mockReset();


  });

  const fakeEvent = {
    Records: [
      {
        Sns: {
          Message: JSON.stringify({
            user_id: "user123",
            receipt_id: "123",
            vendor: "Test Store",
            date: "2025-01-01",
            total: "50.00",
            items: [
              { name: "Apple", price: "1.00", quantity: "2" },
              { name: "Milk", price: "2.00", quantity: "1" }
            ],
            s3_path: "s3://bucket/incoming/receipt.jpg"
          })
        }
      }
    ]
  };


  // Test 1: 
  // Happy path (Valid event sent to Bedrock, updates dynamoDB table with categories)
  it("should call Bedrock with correct model + parse categories", async () => {
    // Mock Bedrock response
    const bedrockResponse = {
      body: new TextEncoder().encode(
        JSON.stringify({
          content: [{ type: "text", text: `["Fresh Produce","Dairy & Eggs"]` }],
        })
      ),
    };
    bedrockSendMock.mockResolvedValueOnce(bedrockResponse);

    // Mock DynamoDB GetItem and UpdateItem
    dynamoSendMock
      .mockResolvedValueOnce({
        Item: { items: { S: JSON.stringify([{ name: "Apple" }, { name: "Milk" }]) } },
      }) // GetItem
      .mockResolvedValueOnce({}); // UpdateItem

    // Invoke Lambda
    await handler(fakeEvent, {});

    // Bedrock called correctly
    expect(bedrockSendMock).toHaveBeenCalledWith(expect.any(InvokeModelCommand));

    // DynamoDB GetItem + UpdateItem called
    expect(dynamoSendMock).toHaveBeenCalledTimes(2);
    expect(dynamoSendMock.mock.calls[0][0]).toBeInstanceOf(GetItemCommand);
    expect(dynamoSendMock.mock.calls[0][0].input.Key).toEqual({ user_id: { S: "user123" }, receipt_id: { S: "123" } });
    expect(dynamoSendMock.mock.calls[1][0]).toBeInstanceOf(UpdateItemCommand);
  });

  // Test 2:
  // SNS with wrong event format
  it("should throw error if SNS message is invalid JSON", async () => {
    const badEvent = { Records: [{ Sns: { Message: "not-json" } }] };
    await expect(handler(badEvent, {})).rejects.toThrow("Could not extract receipt");
  });

  // Test 3: 
  // If bedrock assigns an unknown category (not in the list) or 
  // is unable to assign a category it should be defaulted to other
  it("should default unknown category to 'other'", async () => {
    // Mock item saved to dynamoDB
    dynamoSendMock.mockResolvedValueOnce({
      Item: { items: { S: JSON.stringify([{ name: "Test Item" }]) } },
    });

    bedrockSendMock.mockResolvedValueOnce({
      body: new TextEncoder().encode(
        JSON.stringify({
          content: [{ type: "text", text: `["WeirdCategory"]` }],
        })
      ),
    });
    dynamoSendMock.mockResolvedValueOnce({ Item: { items: { S: "[]" } } });
    dynamoSendMock.mockResolvedValueOnce({});
    sesSendMock.mockResolvedValueOnce({});

    await handler(fakeEvent, {});
    const updateCall = dynamoSendMock.mock.calls[1][0];
    expect(updateCall.input.ExpressionAttributeValues[":items"].S).toContain("other");
  });

  // Test 4: 
  // If no item is saved in dynamoDB items
  it("should handle DynamoDB returning no items", async () => {
    bedrockSendMock.mockResolvedValueOnce({
      body: new TextEncoder().encode(
        JSON.stringify({
          content: [{ type: "text", text: `["Fresh Produce"]` }],
        })
      ),
    });
    dynamoSendMock.mockResolvedValueOnce({}); // no Item
    dynamoSendMock.mockResolvedValueOnce({});
    sesSendMock.mockResolvedValueOnce({});

    await handler(fakeEvent, {});
    expect(dynamoSendMock).toHaveBeenCalledWith(expect.any(UpdateItemCommand));
  });

  // Test 5: 
  // If plain text is sent instead of JSON
  it("should fallback to splitting plain string when JSON parsing fails", async () => {
    // Plain text with mapped category
    bedrockSendMock.mockResolvedValueOnce({
      body: new TextEncoder().encode(
        "Some output... Categories: [Fruits & Vegetables, Dairy & Eggs & Fridge]"
      ),
    });

    dynamoSendMock.mockResolvedValueOnce({
      Item: { items: { S: JSON.stringify([{ name: "Apple" }, { name: "Milk" }]) } },
    });
    dynamoSendMock.mockResolvedValueOnce({});
    sesSendMock.mockResolvedValueOnce({});

    await handler(fakeEvent, {});

    const updateCall = dynamoSendMock.mock.calls.find(
      call => call[0] instanceof UpdateItemCommand
    );

    // Should map to values
    expect(updateCall[0].input.ExpressionAttributeValues[":items"].S).toContain("fruits_vegetables");
    expect(updateCall[0].input.ExpressionAttributeValues[":items"].S).toContain("dairy_eggs_fridge");
  });

  // Test 6: 
  // If plain test has no categories and instead consists of an unrealted response
  it("should return empty category if no data can be extracted", async () => {
    bedrockSendMock.mockResolvedValueOnce({
      body: new TextEncoder().encode("Completely unrelated text"),
    });

    dynamoSendMock.mockResolvedValueOnce({
      Item: { items: { S: JSON.stringify([{ name: "Apple" }]) } },
    });
    dynamoSendMock.mockResolvedValueOnce({});
    sesSendMock.mockResolvedValueOnce({});

    await handler(fakeEvent, {});

    const updateCall = dynamoSendMock.mock.calls.find(
      call => call[0] instanceof UpdateItemCommand
    );

    // category fallback is empty string
    expect(updateCall[0].input.ExpressionAttributeValues[":items"].S).toContain(`"category":"Other"`);
  });

  //Test 7: 
  // Defaults to splitting plain text if a malformed JSON is sent
  it("should fallback to splitting plain string when JSON parsing fails", () => {
    const { extractCategoriesFromModelResponse } = require(
      "../src/lambda/receipt-categorizer/index"
    );

    // Simulate malformed JSON in Bedrock response text
    const responseStr = JSON.stringify({
      content: [{ type: "text", text: `["Fresh Produce", "Dairy & Eggs"` }] // missing closing bracket
    });

    const categories = extractCategoriesFromModelResponse(responseStr);

    // Expect it to correctly extract and trim categories
    expect(categories).toEqual(["Fresh Produce", "Dairy & Eggs"]);
  });

  // Test 8: 
  // Check errors are thrown if any environment variable is not set
  it("should throw if environment variables are not set", async () => {
    // Remove env vars for this test
    delete process.env.RECEIPTS_TABLE;

    // Clear module cache to re-import with new env
    jest.resetModules();

    const { updateReceiptWithCategories, sendCategorizationEmail } = require(
      "../src/lambda/receipt-categorizer/index"
    );

    // DynamoDB table env missing
    await expect(updateReceiptWithCategories("123", ["fresh_produce"]))
      .rejects.toThrow("DynamoDB table name is not set");
  });

  // Test 9:
  // Covers fallback stringification when no items array is present
  it("should stringify receipt correctly when no items are present", () => {
    const { stringifyReceiptForPrompt } = require("../src/lambda/receipt-categorizer/index");

    const receiptWithoutItems = {
      vendor: "Fallback Store",
      date: "2025-10-02",
      total: "$42.75"
    };

    const result = stringifyReceiptForPrompt(receiptWithoutItems);

    expect(result).toContain('Vendor: Fallback Store');
    expect(result).toContain('Date: 2025-10-02');
    expect(result).toContain('Total Amount: $42.75');
    expect(result).toContain('[ITEM #1]: "Fallback Store" - $42.75 x 1');
  });

  // Test 10:
  // Covers fallback when items is empty
  it("should fallback to vendor+total when items is not an array", () => {
    const { stringifyReceiptForPrompt } = require("../src/lambda/receipt-categorizer/index");

    const receiptWithInvalidItems = {
      vendor: "Bad Receipt",
      total: "35.20",
      items: []
    };

    const result = stringifyReceiptForPrompt(receiptWithInvalidItems);

    expect(result).toContain('Vendor: Bad Receipt');
    expect(result).toContain('[ITEM #1]: "Bad Receipt" - $35.20 x 1');
  });

  // Test 11:
  // Covers fallback when items is non-array type (e.g., a string)
  it("should fallback to vendor+total when items is not an array", () => {
    const { stringifyReceiptForPrompt } = require("../src/lambda/receipt-categorizer/index");

    const receiptWithInvalidItems = {
      vendor: "Bad Receipt",
      total: "35.20",
      items: "not-an-array"
    };

    const result = stringifyReceiptForPrompt(receiptWithInvalidItems);

    expect(result).toContain('Vendor: Bad Receipt');
    expect(result).toContain('[ITEM #1]: "Bad Receipt" - $35.20 x 1');
  });
  
});

describe("stringifyReceiptForPrompt edge cases", () => {
  const { stringifyReceiptForPrompt } = require("../src/lambda/receipt-categorizer/index");

  it("should default total to 0.00 if receipt.total is not a number", () => {
    const receipt = { vendor: "Test Store", date: "2025-10-10", total: "invalid" };
    const result = stringifyReceiptForPrompt(receipt);
    expect(result).toContain("Total Amount: $0.00");
  });

  it("should handle items with missing name and default to 'Unnamed Item'", () => {
    const receipt = {
      vendor: "Test Store",
      date: "2025-10-10",
      total: "10.00",
      items: [{ price: "5.00", quantity: 1 }]
    };
    const result = stringifyReceiptForPrompt(receipt);
    expect(result).toContain('[ITEM #1]: "Unnamed Item" - $5.00 x 1');
  });

  it("should clean item names with newlines and extra spaces", () => {
    const receipt = {
      vendor: "Test Store",
      date: "2025-10-10",
      total: "10.00",
      items: [{ name: "  Apple \n Juice \r\n", price: "2.50", quantity: 2 }]
    };
    const result = stringifyReceiptForPrompt(receipt);
    expect(result).toContain('[ITEM #1]: "Apple Juice" - $2.50 x 2');
  });

  it("should default price to 0.00 if item.price is invalid", () => {
    const receipt = {
      vendor: "Test Store",
      date: "2025-10-10",
      total: "10.00",
      items: [{ name: "Apple", price: "abc", quantity: 2 }]
    };
    const result = stringifyReceiptForPrompt(receipt);
    expect(result).toContain('[ITEM #1]: "Apple" - $0.00 x 2');
  });

  it("should default quantity to 1 if item.quantity is missing", () => {
    const receipt = {
      vendor: "Test Store",
      date: "2025-10-10",
      total: "10.00",
      items: [{ name: "Apple", price: "2.50" }]
    };
    const result = stringifyReceiptForPrompt(receipt);
    expect(result).toContain('[ITEM #1]: "Apple" - $2.50 x 1');
  });
});