import { KnownBlock, verifySlackRequest } from '@slack/bolt';
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { Lambda } from 'aws-sdk';
import { Config } from 'sst/node/config';
import { Function as SSTFunction } from 'sst/node/function';


const lambda = new Lambda();

export async function handler(
	event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2<{ blocks: KnownBlock[] }>> {
	let body = event.body;
	if (body && event.isBase64Encoded) {
		body = Buffer.from(body, 'base64').toString('utf8');
	}
	if (!body) {
		return {
			statusCode: 400,
			body: 'Missing body',
		};
	}
	const slackConfig = JSON.parse(Config.SLACK_CONFIG);

	// Verify the payload
	try {
		verifySlackRequest({
			signingSecret: slackConfig.SIGNING_SECRET,
			body,
			headers: event.headers as any,
		});
	} catch (error) {
		console.log('Verify Error', error);
		return {
			statusCode: 400,
			body: String(error),
		};
	}
	let payload: any = body;
	if (event.headers?.['content-type'] === 'application/json') {
		payload = JSON.parse(body);
	} else {
		payload = Object.fromEntries(new URLSearchParams(body));
	}
	console.log('Request Type', payload.type);
	// URL Verification just means "return the challenge"
	if (payload.type === 'url_verification') {
		return {
			statusCode: 200,
			body: payload.challenge,
		};
	} else if (payload.type === 'event_callback' && payload.event?.text) {
		// Ignore bot-generated messages
		if (payload.event.bot_id || payload.bot_id) {
			console.log('Ignore bot generated message', payload.event);
			return { statusCode: 200 };
		}
		await lambda.invoke({
			FunctionName: SSTFunction.gptJob.functionName,
			Payload: JSON.stringify({
				...payload.event,
				token: payload.token,
			}),
			InvocationType: 'Event', // Run in the background, do not wait for response
		}).promise();

		return { statusCode: 200 };
	}
	await lambda.invoke({
		FunctionName: SSTFunction.gptJob.functionName,
		Payload: JSON.stringify(payload),
		InvocationType: 'Event', // Run in the background, do not wait for response
	}).promise();

	// See: https://api.slack.com/reference/block-kit/blocks
	const blocks: KnownBlock[] = [{
		type: 'section',
		text: {
			type: 'mrkdwn',
			text: `> ${payload.text}`,
		},
	}];

	return {
		statusCode: 200,
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ blocks }),
	};
}
