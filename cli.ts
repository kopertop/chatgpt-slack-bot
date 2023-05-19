import { ChatOpenAI } from 'langchain/chat_models/openai';
import { BaseChatMessage, HumanChatMessage, SystemChatMessage } from 'langchain/schema';

const GPT_MODEL = process.env.GPT_MODEL || 'gpt-3.5-turbo';
const SYSTEM_PROMPT = `You are a helpful assistant, running GPT Model ${GPT_MODEL}.

Your responses are sent to Slack, always respond using Markdown formatting.

For example, use *bold*, _italics_, \`code\`, and [links](https://example.com).`;

export async function main(message: string) {
	const chat = new ChatOpenAI({
		openAIApiKey: process.env.OPENAI_KEY,
		modelName: GPT_MODEL,
		frequencyPenalty: 0.1,
		maxTokens: 512,
		presencePenalty: 0,
		temperature: 0.7,
		topP: 1,
	});
	const messages: BaseChatMessage[] = [
		new SystemChatMessage(SYSTEM_PROMPT),
	];
	if (message) {
		messages.push(new HumanChatMessage(message));
	}

	const resp = await chat.call(messages);
	console.log(JSON.stringify(resp, null, 2));
}
main(process.argv[2]);
