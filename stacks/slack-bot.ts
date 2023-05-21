import {
	Api,
	Config,
	Function as SSTFunction,
	StackContext,
	use,
} from 'sst/constructs';

import { GPTFunctions } from './gpt-functions';

export function API({ stack }: StackContext) {
	const { image_creator, OPENAI_KEY } = use(GPTFunctions);
	const api = new Api(stack, 'api', {
		defaults: {
			function: {
				timeout: 5,
				architecture: 'arm_64',
				runtime: 'nodejs18.x',
			},
		},
		routes: {
			$default: 'packages/functions/src/webhook.handler',
		},
	});

	const SLACK_CONFIG = new Config.Secret(stack, 'SLACK_CONFIG');
	const SERPAPI_API_KEY = new Config.Secret(stack, 'SERPAPI_API_KEY');

	const gpt_job = new SSTFunction(stack, 'gptJob', {
		handler: 'packages/functions/src/gpt.handler',
		memorySize: 2048,
		timeout: 120,
		architecture: 'arm_64',
		runtime: 'nodejs18.x',
		environment: {
			// Allow overriding the GPT model
			GPT_MODEL: process.env.GPT_MODEL || 'gpt-3.5-turbo',
		},
	});
	gpt_job.bind([
		OPENAI_KEY,
		SERPAPI_API_KEY,
		SLACK_CONFIG,
		image_creator,
	]);

	api.bind([SLACK_CONFIG, gpt_job]);

	return { api };
}
