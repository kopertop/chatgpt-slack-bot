import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { HumanChatMessage } from 'langchain/schema';

import { gptHandler } from './gpt';

describe('gptHandler', () => {
	let lambda_mock: ReturnType<typeof mockClient>;
	beforeAll(() => {
		lambda_mock = mockClient(LambdaClient);
	});
	beforeEach(() => {
		lambda_mock.reset();
		lambda_mock.on(InvokeCommand).callsFake((input: any) => {
			console.log('InvokeCommand', Buffer.from(input.Payload, 'base64').toString());
			return Promise.resolve({
				StatusCode: 200,
				Payload: Buffer.from(JSON.stringify({ body: 'https://example.com/foo.png' })),
			});
		});
	});
	it('Should return a response for a simple "Hello"', async () => {
		const resp = await gptHandler({
			text: 'Hello',
			thread_ts: 'TEST-12345',
		});
		expect(resp).toBeTruthy();
		expect(resp.text?.length).toBeTruthy();
		expect(resp.text?.length).toBeGreaterThan(3);
		expect(resp.blocks?.length).toEqual(1);
	});
	it('Should remember history of previous messages', async () => {
		const resp = await gptHandler({
			text: 'What did I say my name was?',
			thread_ts: 'TEST-12346',
		}, [
			new HumanChatMessage('Hello, my name is Chris'),
		]);
		expect(resp).toBeTruthy();
		expect(resp.text).toContain('Chris');
	});
	it('Should generate an image by invoking a lambda function', async () => {
		const resp = await gptHandler({
			text: 'Create an image of a monkey holding a lightbulb.',
			thread_ts: 'TEST-12347',
		});
		console.log(JSON.stringify(resp, null, 2));
		console.log(JSON.stringify(lambda_mock, null, 2));
		expect(resp).toBeTruthy();
		expect(resp.text).toContain('https://example.com/foo.png');
	});
});
