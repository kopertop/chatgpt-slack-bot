import { HumanChatMessage } from 'langchain/schema';

import { gptHandler } from './gpt';

describe('gptHandler', () => {
	it('Should return a response for a simple "Hello"', async () => {
		const resp = await gptHandler({
			text: 'Hello',
			thread_ts: 'TEST-1234',
		});
		expect(resp).toBeTruthy();
		expect(resp.text?.length).toBeTruthy();
		expect(resp.text?.length).toBeGreaterThan(3);
		expect(resp.blocks?.length).toEqual(1);
	});
	it('Should remember history of previous messages', async () => {
		const resp = await gptHandler({
			text: 'What did I say my name was?',
			thread_ts: 'TEST-1234',
		}, [
			new HumanChatMessage('Hello, my name is Chris'),
		]);
		expect(resp).toBeTruthy();
		expect(resp.text).toContain('Chris');
	});
});
