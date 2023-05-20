import {
	Api,
	Config,
	Function as SSTFunction,
	StackContext,
	use,
} from 'sst/constructs';

import { GPTFunctions } from './gpt-functions';

export function API({ stack }: StackContext) {
	const { bucket, image_creator, OPENAI_KEY } = use(GPTFunctions);
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

	// Secrets
	const SLACK_CONFIG = new Config.Secret(stack, 'SLACK_CONFIG');

	const gpt_job = new SSTFunction(stack, 'gptJob', {
		handler: 'packages/functions/src/gpt.handler',
		timeout: 30,
		architecture: 'arm_64',
		runtime: 'nodejs18.x',
		environment: {
			// Allow overriding the GPT model
			GPT_MODEL: process.env.GPT_MODEL || 'gpt-3.5-turbo',
		},
	});
	gpt_job.bind([SLACK_CONFIG, OPENAI_KEY, bucket, image_creator]);

	api.bind([SLACK_CONFIG, OPENAI_KEY, gpt_job]);

	stack.addOutputs({
		ApiEndpoint: api.url,
	});

	return {
		apiEndpoint: api.url,
	};
}
