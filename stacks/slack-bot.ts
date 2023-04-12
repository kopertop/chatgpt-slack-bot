import {
	Api,
	Bucket,
	Config,
	Function as SSTFunction,
	StackContext,
} from 'sst/constructs';

export function API({ stack }: StackContext) {
	const api = new Api(stack, 'api', {
		defaults: {
			function: {
				timeout: 5,
				architecture: 'arm_64',
				runtime: 'nodejs18.x',
			},
		},
		routes: {
			'$default': 'packages/functions/src/webhook.handler',
		},
	});

	// S3 Bucket for storing images
	const bucket = new Bucket(stack, 'images', {
		cors: true,
	});

	// Secrets
	const SLACK_CONFIG = new Config.Secret(stack, 'SLACK_CONFIG');
	const OPENAI_KEY = new Config.Secret(stack, 'OPENAI_KEY');

	const gptJob = new SSTFunction(stack, 'gptJob', {
		handler: 'packages/functions/src/gpt.handler',
		timeout: 30,
		architecture: 'arm_64',
		runtime: 'nodejs18.x',
	});
	gptJob.bind([SLACK_CONFIG, OPENAI_KEY, bucket]);

	api.bind([SLACK_CONFIG, OPENAI_KEY, gptJob]);

	stack.addOutputs({
		ApiEndpoint: api.url,
	});

	return {
		apiEndpoint: api.url,
	};
}
