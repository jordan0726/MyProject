//Setting up mock Bedrock client and command
jest.mock("@aws-sdk/client-bedrock-runtime", () => {
  const mockSend = jest.fn();
  return {
    BedrockRuntimeClient: jest.fn(() => ({
      send: mockSend,
    })),
    InvokeModelCommand: jest.fn(),
    __mock: {
      mockSend,
    },
  };
});
const { __mock } = jest.requireMock("@aws-sdk/client-bedrock-runtime") as any;

import { CategorizeReceipt } from "../src/lambda/handler";
import {
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

describe("CategorizeReceipt Lambda", () => {
  it("returns mocked Bedrock response", async () => {
    __mock.mockSend.mockResolvedValue({
      body: Buffer.from(
        JSON.stringify({
          content: [{ text: "This is a mocked reply." }],
          anthropic_version: "2023-06-01",
        }),
        "utf-8"
      ),
    });

    const event = {
      body: JSON.stringify({
        receipt: "Item A\nItem B"
      }),
    };

    const result = await CategorizeReceipt(event, {});

    expect(result.statusCode).toBe(200);

    const parsedBody = JSON.parse(result.body);
    expect(parsedBody.answer).toBe("This is a mocked reply.");

    // Check that InvokeModelCommand was constructed
    expect(InvokeModelCommand).toHaveBeenCalledTimes(1);

    const callArg = (InvokeModelCommand as unknown as jest.Mock).mock.calls[0][0];
    expect(callArg.contentType).toBe("application/json");

    const payload = JSON.parse(callArg.body);
    expect(payload.messages[0].content[0].text).toContain("Item A");
    expect(payload.messages[0].content[0].text).toContain("Item B");
  });
});
