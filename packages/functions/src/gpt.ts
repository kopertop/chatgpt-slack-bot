import { gptHandler } from '@chatgpt-slack-bot/core/gpt';
import { SlackEvent } from '@chatgpt-slack-bot/core/slack-event';
import { App } from '@slack/bolt';
import { AIChatMessage, BaseChatMessage, HumanChatMessage } from 'langchain/schema';
import fetch from 'node-fetch';
import { Config } from 'sst/node/config';

export async function handler(payload: SlackEvent) {
	const slack_config = JSON.parse(Config.SLACK_CONFIG);
	const app = new App({
		token: slack_config.BOT_TOKEN,
		signingSecret: slack_config.SIGNING_SECRET,
	});
	const channel_id = payload.channel || payload.channel_id;
	const history: BaseChatMessage[] = [];
	if (payload.thread_ts && channel_id) {
		const result = await app.client.conversations.replies({
			channel: channel_id,
			ts: payload.thread_ts,
		});
		for (const message of result.messages || []) {
			if (message.text) {
				if (message.bot_id) {
					history.push(new AIChatMessage(message.text));
				} else {
					history.push(new HumanChatMessage(message.text));
				}
			}
		}
	}

	const { blocks, text } = await gptHandler(payload, history);

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
