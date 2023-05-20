import type { SlackEvent } from '@chatgpt-slack-bot/core/slack-event';
import { S3 } from 'aws-sdk';
import { Configuration, OpenAIApi } from 'openai';
import { Bucket } from 'sst/node/bucket';
import { Config } from 'sst/node/config';

const s3 = new S3();

export async function handler(payload: SlackEvent) {
	const openai = new OpenAIApi(new Configuration({
		apiKey: Config.OPENAI_KEY,
	}));

	const image = await openai.createImage({
		prompt: payload.text,
		n: 1,
		size: '512x512',
		response_format: 'b64_json',
	}).catch((e) => {
		console.error(e);
		return e;
	});
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
				return s3_url;
			}
			if (item?.url) {
				return item.url;
			}
		}
	}
}
