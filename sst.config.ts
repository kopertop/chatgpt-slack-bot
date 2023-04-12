import { SSTConfig } from 'sst';

import { API } from './stacks/slack-bot';

export default {
	config(_input) {
		return {
			name: 'chatgpt-slack-bot',
			region: 'us-east-1',
		};
	},
	stacks(app) {
		app.stack(API);
	},
} satisfies SSTConfig;
