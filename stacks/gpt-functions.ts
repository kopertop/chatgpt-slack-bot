import {
	Bucket,
	Config,
	Function as SSTFunction,
	StackContext,
} from 'sst/constructs';

export function GPTFunctions({ stack }: StackContext) {
	// S3 Bucket for storing images
	const bucket = new Bucket(stack, 'images', {
		cors: true,
		cdk: {
			bucket: {
				// Allow public objects
				blockPublicAccess: {
					blockPublicAcls: false,
					blockPublicPolicy: false,
					ignorePublicAcls: false,
					restrictPublicBuckets: false,
				},
			},
		},
	});

	// Secrets
	const OPENAI_KEY = new Config.Secret(stack, 'OPENAI_KEY');

	const image_creator = new SSTFunction(stack, 'imageCreator', {
		functionName: `chatbot-image-creator-${stack.stage}`,
		handler: 'packages/functions/src/create-image.handler',
		memorySize: 1024,
		timeout: 90,
		architecture: 'arm_64',
		runtime: 'nodejs18.x',
		environment: {
			// Allow overriding the GPT model
			GPT_MODEL: process.env.GPT_MODEL || 'gpt-3.5-turbo',
		},
	});
	image_creator.bind([OPENAI_KEY, bucket]);

	return { bucket, image_creator, OPENAI_KEY };
}
