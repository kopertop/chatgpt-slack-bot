import { SlackEvent } from '@chatgpt-slack-bot/core/slack-event';
import { App, KnownBlock } from '@slack/bolt';
import { S3 } from 'aws-sdk';
import fetch from 'node-fetch';
import { Configuration, OpenAIApi } from 'openai';
import type { ChatCompletionRequestMessage } from 'openai/dist/api';
import { Bucket } from 'sst/node/bucket';
import { Config } from 'sst/node/config';

const GPT_MODEL = process.env.GPT_MODEL || 'gpt-3.5-turbo';
const SYSTEM_PROMPT = `You are a helpful assistant, running GPT Model ${GPT_MODEL}.`;
const FORMAT_RESPONSE = 'Your responses are sent to Slack, so always respond using Markdown formatting.';

// Regular expression to identify System Prompts as submitted as a chat message
const SYSTEM_PROMPT_REGEX = /^(<@[A-Z0-9]+> )?You are /i;

// Regular expression to identify an Image generation request
const IMAGE_PROMPT_REGEX = /^(<@[A-Z0-9]+> )?(generate|create|make) an? image (of )?(?<prompt>.+)/i;

const s3 = new S3();

export async function handler(payload: SlackEvent) {
	const slack_config = JSON.parse(Config.SLACK_CONFIG);
	const app = new App({
		token: slack_config.BOT_TOKEN,
		signingSecret: slack_config.SIGNING_SECRET,
	});
	const openai = new OpenAIApi(new Configuration({
		apiKey: Config.OPENAI_KEY,
	}));

	const messages: ChatCompletionRequestMessage[] = [{
		role: 'system',
		content: SYSTEM_PROMPT,
	}];
	const channel_id = payload.channel || payload.channel_id;
	let has_system_prompt = false;

	// Include previously sent messages
	if (payload.thread_ts && channel_id) {
		const result = await app.client.conversations.replies({
			channel: channel_id,
			ts: payload.thread_ts,
		});
		for (const message of result.messages || []) {
			if (message.text) {
				if (SYSTEM_PROMPT_REGEX.test(message.text.trim())) {
					has_system_prompt = true;
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
	const image_prompt = IMAGE_PROMPT_REGEX.exec(payload.text);
	if (image_prompt?.groups?.prompt) {
		const image = await openai.createImage({
			prompt: image_prompt.groups.prompt,
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
					const s3_key = s3.putObject({
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
					await s3_key.promise();
					const s3_url = await s3.getSignedUrlPromise('getObject', {
						Bucket: Bucket.images.bucketName,
						Key: key,
						Expires: 60 * 60 * 24 * 7,
					});
					blocks.push({
						type: 'image',
						image_url: s3_url,
						alt_text: image_prompt.groups.prompt,
					});
				}
				if (item?.url) {
					blocks.push({
						type: 'image',
						image_url: item.url,
						alt_text: image_prompt.groups.prompt,
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
			model: GPT_MODEL,
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
