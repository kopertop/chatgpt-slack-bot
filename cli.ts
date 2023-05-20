import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { SerpAPI } from 'langchain/tools';
import { AWSLambda } from 'langchain/tools/aws_lambda';
import { Calculator } from 'langchain/tools/calculator';

const GPT_MODEL = process.env.GPT_MODEL || 'gpt-3.5-turbo';
const SYSTEM_PROMPT = `You are a helpful assistant, running GPT Model ${GPT_MODEL}.

Your responses are sent to Slack, always respond using Markdown formatting.

For example, use *bold*, _italics_, \`code\`, and [links](https://example.com).`;

async function main(input: string) {
	const model = new ChatOpenAI({
		openAIApiKey: process.env.OPENAI_KEY,
		modelName: GPT_MODEL,
		frequencyPenalty: 0.1,
		maxTokens: 512,
		presencePenalty: 0,
		temperature: 0.7,
		topP: 1,
	});
	const tools = [
		new SerpAPI(process.env.SERPAPI_API_KEY, {
			location: 'Columbus,Ohio,United States',
			hl: 'en',
			gl: 'us',
		}),
		new Calculator(),
		new AWSLambda({
			name: 'image-creator',
			description: 'Creates a new image for the specified prompt. Returns a URL to the image.',
			functionName: 'chatbot-image-creator-prod',
		}),
	];

	const executor = await initializeAgentExecutorWithOptions(tools, model);
	console.log('Loaded agent.');

	console.log(`Executing with input "${input}"...`);

	const result = await executor.call({ input });
	console.log(JSON.stringify(result, null, 2));

	console.log(`Got output ${result.output}`);
	console.log(`Cost Tokens: ${result.tokensUsed}`);
}
main(process.argv[2]);
