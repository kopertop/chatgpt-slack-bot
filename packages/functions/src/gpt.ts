import { SlackEvent } from '@chatgpt-slack-bot/core/slack-event';
import { App, KnownBlock } from '@slack/bolt';
import { S3 } from 'aws-sdk';
import fetch from 'node-fetch';
import { Configuration, OpenAIApi } from 'openai';
import type { ChatCompletionRequestMessage } from 'openai/dist/api';
import { Bucket } from 'sst/node/bucket';
import { Config } from 'sst/node/config';

const SYSTEM_PROMPT = 'You are a helpful assistant.';
const FORMAT_RESPONSE = 'Your responses are sent to Slack, so always respond using Markdown formatting.';

// Regular expression to identify System Prompts as submitted as a chat message
const SYSTEM_PROMPT_REGEX = /^(<@[A-Z0-9]+> )?You are /i;

// Regular expression to identify an Image generation request
const IMAGE_PROMPT_REGEX = /^(<@[A-Z0-9]+> )?(generate|create|make) an? image (of )?(?<prompt>.+)/i;

const s3 = new S3();

export async function handler(payload: SlackEvent) {
	const slackConfig = JSON.parse(Config.SLACK_CONFIG);
	const app = new App({
		token: slackConfig.BOT_TOKEN,
		signingSecret: slackConfig.SIGNING_SECRET,
	});
	const openai = new OpenAIApi(new Configuration({
		apiKey: Config.OPENAI_KEY,
	}));

	const messages: ChatCompletionRequestMessage[] = [{
		role: 'system',
		content: SYSTEM_PROMPT,
	}];
	const channelID = payload.channel || payload.channel_id;
	let hasSystemPrompt = false;

	// Include previously sent messages
	if (payload.thread_ts && channelID) {
		const result = await app.client.conversations.replies({
			channel: channelID,
			ts: payload.thread_ts,
		});
		for (const message of result.messages || []) {
			if (message.text) {
				if (SYSTEM_PROMPT_REGEX.test(message.text.trim())) {
					hasSystemPrompt = true;
					messages.push({
						role: 'system',
						content: message.text,
					});
				} else {
					messages.push({
						role: message.bot_id ? 'assistant' : 'user',
						content: message.text,
					});
				}
			}
		}
	}
	// Always tell the assistant how they should respond
	messages.push({
		role: 'system',
		content: FORMAT_RESPONSE,
	});

	// See: https://api.slack.com/reference/block-kit/blocks
	const blocks: KnownBlock[] = [];
	let text = '';

	// Allow producing an Image instead of text
	const imagePrompt = IMAGE_PROMPT_REGEX.exec(payload.text);
	if (imagePrompt?.groups?.prompt) {
		const image = await openai.createImage({
			prompt: imagePrompt.groups.prompt,
			n: 1,
			size: '512x512',
			response_format: 'b64_json',
		}).catch((e) => {
			console.error(e);
			return e;
		});
		console.log('Generated Image', image.data);
		if (image.data?.data) {
			for (const item of image.data.data) {
				if (item?.b64_json) {
					// Upload to S3
					const key = `${payload.ts || payload.thread_ts}.png`;
					const s3Key = s3.putObject({
						Bucket: Bucket.images.bucketName,
						Key: key,
						Body: Buffer.from(item.b64_json, 'base64'),
						ContentType: 'image/png',
						/* TODO: Make this work after normalizing the prompt
						Metadata: {
							'X-OpenAI-Prompt': imagePrompt.groups.prompt,
						},
						*/
					});
					await s3Key.promise();
					const s3URL = await s3.getSignedUrlPromise('getObject', {
						Bucket: Bucket.images.bucketName,
						Key: key,
						Expires: 60 * 60 * 24 * 7,
					});
					blocks.push({
						type: 'image',
						image_url: s3URL,
						alt_text: imagePrompt.groups.prompt,
					});
				}
				if (item?.url) {
					blocks.push({
						type: 'image',
						image_url: item.url,
						alt_text: imagePrompt.groups.prompt,
					});
				}
			}
		}
	} else if (SYSTEM_PROMPT_REGEX.test(payload.text.trim())) {
		text = 'Got it';
		blocks.push({
			type: 'section',
			text: {
				type: 'mrkdwn',
				text: 'Got it.',
			},
		});
	} else {
		messages.push({
			role: 'user',
			content: payload.text,
		});

		const completion = await openai.createChatCompletion({
			model: 'gpt-3.5-turbo',
			messages,
			frequency_penalty: 0.1,
			max_tokens: 512,
			presence_penalty: 0,
			temperature: 0.7,
			top_p: 1,
		}).catch((e) => {
			console.error(e);
			return e;
		});
		for (const choice of completion.data?.choices || []) {
			if (choice.message?.content) {
				text += choice.message.content;
				blocks.push({
					type: 'section',
					text: {
						type: 'mrkdwn',
						text: choice.message.content,
					},
				});
			}
		}
		if (completion.data?.usage?.total_tokens) {
			blocks.push({
				type: 'context',
				elements: [{
					type: 'mrkdwn',
					text: `*Tokens used:* ${completion.data.usage.total_tokens}`,
				}],
			});
		}
	}

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
