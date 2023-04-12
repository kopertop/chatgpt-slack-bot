import { Script, StackContext, use } from 'sst/constructs';

import { API } from './slack-bot';

export function AfterDeploy({ stack }: StackContext) {
	new Script(stack, 'AfterDeploy', {
		onCreate: 'packages/functions/src/manifest.create',
		params: use(API),
	});
}
