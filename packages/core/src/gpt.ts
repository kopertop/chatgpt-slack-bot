import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import type { KnownBlock } from '@slack/bolt';
import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { BufferMemory, ChatMessageHistory } from 'langchain/memory';
import { BaseChatMessage } from 'langchain/schema';
import { DynamicTool, SerpAPI, Tool } from 'langchain/tools';
import { Calculator } from 'langchain/tools/calculator';
import { Config } from 'sst/node/config';
import { Function as SSTFunction } from 'sst/node/function';

import type { SlackEvent } from './slack-event';

const GPT_MODEL = process.env.GPT_MODEL || 'gpt-3.5-turbo';
const SYSTEM_PROMPT = `You are a helpful Slack ChatBot.

Your responses must be in Markdown format.`;

export async function gptHandler(payload: SlackEvent, history?: BaseChatMessage[]) {
	const model = new ChatOpenAI({
		openAIApiKey: Config.OPENAI_KEY,
		modelName: GPT_MODEL,
		frequencyPenalty: 0,
		maxTokens: 512,
		presencePenalty: 0,
		temperature: 0,
		topP: 1,
	});

	const tools: Tool[] = [
		new Calculator(),
	];
	if (Config.SERPAPI_API_KEY) {
		tools.push(new SerpAPI(Config.SERPAPI_API_KEY, {
			location: 'Columbus,Ohio,United States',
			hl: 'en',
			gl: 'us',
		}));
	}
	if (SSTFunction.imageCreator) {
		tools.push(new DynamicTool({
			name: 'image-creator',
			description: [
				'Creates a new image.',
				'Input should be a string describing the image to create.',
				'Output is a URL for the image.',
			].join(' '),
			func: async (input: string) => {
				const lambda_resp = await new LambdaClient({}).send(new InvokeCommand({
					FunctionName: SSTFunction.imageCreator.functionName,
					Payload: Buffer.from(JSON.stringify({
						...payload,
						text: input,
					})),
				}));
				const body = lambda_resp.Payload?.toString();
				console.log('Lambda Response', body);
				return body;
			},
		}));

		/*
		tools.push(new AWSLambda({
			name: 'image-creator',
			description: [
				'Creates a new image.',
				'Input should be a string describing the image to create.',
				'Output is a URL for the image.',
			].join(' '),
			functionName: SSTFunction.imageCreator.functionName,
		}));
		*/
	}

	const executor = await initializeAgentExecutorWithOptions(tools, model, {
		agentType: 'chat-conversational-react-description',
	});
	const chat_history: BaseChatMessage[] = [
		// new SystemChatMessage(SYSTEM_PROMPT),
		...(history || []),
	];
	const memory = new BufferMemory({
		chatHistory: new ChatMessageHistory(chat_history),
		memoryKey: 'chat_history',
		returnMessages: true,
	});
	executor.memory = memory;

	// See: https://api.slack.com/reference/block-kit/blocks
	const blocks: KnownBlock[] = [];
	let text = '';

	const result = await executor.call({
		input: payload.text,
	});

	if (result?.output) {
		text = result.output;
		blocks.push({
			type: 'section',
			text: {
				type: 'mrkdwn',
				text: result.output,
			},
		});
	}
	if (result?.tokensUsed) {
		blocks.push({
			type: 'context',
			elements: [{
				type: 'mrkdwn',
				text: `*Tokens used:* ${result.tokensUsed}`,
			}],
		});
	}

	return { blocks, text };
}
