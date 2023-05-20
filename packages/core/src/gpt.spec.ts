import { gptHandler } from './gpt';

describe('gptHandler', () => {
	it('Should return a response for a simple "Hello"', async () => {
		const resp = await gptHandler({
			text: 'Hello',
			thread_ts: 'TEST-1234',
		});
		console.log(resp);
		expect(resp).toBeTruthy();
		expect(resp.text?.length).toBeTruthy();
		expect(resp.text?.length).toBeGreaterThan(3);
	});
});
