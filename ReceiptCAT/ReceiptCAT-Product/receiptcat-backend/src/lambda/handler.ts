import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { SYSTEM_PROMPT_FEW_SHOT } from "./prompt";

const client = new BedrockRuntimeClient({ region: "ap-southeast-2" });

export async function CategorizeReceipt(event: any, context: any) {
  const instructions = "Classify each line item based on the predefined categories.";
  const { receipt } = JSON.parse(event.body);

  const userPrompt = `<receipt>${receipt}</receipt><instructions>${instructions}</instructions>`;

  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 2048,
    system: SYSTEM_PROMPT_FEW_SHOT,
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: userPrompt }],
      },
    ],
  };

  const command = new InvokeModelCommand({
    modelId: "apac.anthropic.claude-3-7-sonnet-20250219-v1:0",
    body: JSON.stringify(payload),
    contentType: "application/json",
  });

  const bedrockResponse = await client.send(command);
  const responseStr = new TextDecoder("utf-8").decode(bedrockResponse.body);

  const answer = JSON.parse(responseStr).content[0].text;

  return {
    statusCode: 200,
    body: JSON.stringify({ answer }),
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "OPTIONS,GET,POST",
    },
  };
}
