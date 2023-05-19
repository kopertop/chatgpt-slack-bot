import { App, KnownBlock } from '@slack/bolt';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import {
	AIChatMessage,
	BaseChatMessage,
	HumanChatMessage,
	SystemChatMessage,
} from 'langchain/schema';
import fetch from 'node-fetch';
import { Config } from 'sst/node/config';

import { SlackEvent } from './slack-event';

const GPT_MODEL = process.env.GPT_MODEL || 'gpt-3.5-turbo';
const SYSTEM_PROMPT = `You are a helpful assistant, running GPT Model ${GPT_MODEL}.

Your responses are sent to Slack, always respond using Markdown formatting.

For example, use *bold*, _italics_, \`code\`, and [links](https://example.com).`;

export async function handler(payload: SlackEvent) {
	const slack_config = JSON.parse(Config.SLACK_CONFIG);
	const app = new App({
		token: slack_config.BOT_TOKEN,
		signingSecret: slack_config.SIGNING_SECRET,
	});
	const channel_id = payload.channel || payload.channel_id;
	const chat = new ChatOpenAI({
		openAIApiKey: Config.OPENAI_KEY,
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
	if (payload.thread_ts && channel_id) {
		const result = await app.client.conversations.replies({
			channel: channel_id,
			ts: payload.thread_ts,
		});
		for (const message of result.messages || []) {
			if (message.text) {
				if (message.bot_id) {
					messages.push(new AIChatMessage(message.text));
				} else {
					messages.push(new HumanChatMessage(message.text));
				}
			}
		}
	}
	if (payload.text) {
		messages.push(new HumanChatMessage(payload.text));
	}

	// See: https://api.slack.com/reference/block-kit/blocks
	const blocks: KnownBlock[] = [];
	let text = '';

	const completion = await chat.call(messages);

	if (completion?.text) {
		text += completion.text;
		blocks.push({
			type: 'section',
			text: {
				type: 'mrkdwn',
				text: completion.text,
			},
		});
	}
	/* TODO: Fix this
	const tokens_used = chat.getTokensUsed();
	if (completion?.usage?.total_tokens) {
		blocks.push({
			type: 'context',
			elements: [{
				type: 'mrkdwn',
				text: `*Tokens used:* ${completion.data.usage.total_tokens}`,
			}],
		});
	}
	*/

	if (payload.response_url) {
		await fetch(payload.response_url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				replace_original: true,
				blocks,
			}),
		});
	} else if (payload.channel && payload.ts) {
		try {
			await app.client.chat.postMessage({
				channel: payload.channel,
				thread_ts: payload.ts,
				text,
				blocks,
			});
		} catch (e) {
			console.error(e);
		}
	}

	return blocks;
}
