import type { KnownBlock } from '@slack/bolt';
import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { BufferMemory } from 'langchain/memory';
import { DynamoDBChatMessageHistory } from 'langchain/stores/message/dynamodb';
import { SerpAPI, Tool } from 'langchain/tools';
import { AWSLambda } from 'langchain/tools/aws_lambda';
import { Calculator } from 'langchain/tools/calculator';
import { Config } from 'sst/node/config';
import { Function as SSTFunction } from 'sst/node/function';

import type { SlackEvent } from './slack-event';

const GPT_MODEL = process.env.GPT_MODEL || 'gpt-3.5-turbo';

export async function gptHandler(payload: SlackEvent) {
	const model = new ChatOpenAI({
		openAIApiKey: Config.OPENAI_KEY,
		modelName: GPT_MODEL,
		frequencyPenalty: 0.1,
		maxTokens: 512,
		presencePenalty: 0,
		temperature: 0.7,
		topP: 1,
	});
	const memory = new BufferMemory({
		chatHistory: new DynamoDBChatMessageHistory({
			tableName: 'langchain',
			partitionKey: 'id',
			sessionId: payload.thread_ts,
		}),
	});
	const tools: Tool[] = [
		new SerpAPI(process.env.SERPAPI_API_KEY, {
			location: 'Columbus,Ohio,United States',
			hl: 'en',
			gl: 'us',
		}),
		new Calculator(),
	];
	if (SSTFunction.imageCreator) {
		tools.push(new AWSLambda({
			name: 'image-creator',
			description: 'Creates a new image for the specified prompt. Returns a URL to the image.',
			functionName: SSTFunction.imageCreator.functionName,
		}));
	}
	const executor = await initializeAgentExecutorWithOptions(tools, model, {
		agentType: 'chat-conversational-react-description',
		memory,
	});
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
