import { readFileSync, writeFileSync } from 'fs';

/**
 * Script run after the stack is deployed
 * @param params
 */
async function create() {
	let apiEndpoint;
	const outputs = JSON.parse(readFileSync('.sst/outputs.json', 'utf8').toString());
	for (const output of Object.values(outputs) as any[]) {
		if (output?.ApiEndpoint) {
			apiEndpoint = output.ApiEndpoint;
			break;
		}
	}
	writeFileSync('manifest.json', JSON.stringify({
		'display_information': {
			'name': 'ChatGPT',
			'description': 'gpt',
			'background_color': '#000000',
			'long_description': [
				'ChatGPT is a helpful AI assistant that uses the OpenAI GPT-3.5-tubo model to respond to your questions.',
				'Using the /gpt slash command will return a one-line response to your PERSONAL question (not shared), while tagging @chatgpt will allow it to respond PUBLICLY to your response.',
				'Follow-up messages may also be routed to ChatGPT',
			],
		},
		'features': {
			'bot_user': {
				'display_name': 'ChatGPT',
				'always_online': true,
			},
			'slash_commands': [
				{
					'command': '/gpt',
					'url': apiEndpoint,
					'description': 'Ask GPT a question',
					'usage_hint': 'create an intro email to a client, generate a subject line, correct grammer...',
					'should_escape': false,
				},
			],
		},
		'oauth_config': {
			'scopes': {
				'bot': [
					'app_mentions:read',
					'chat:write',
					'commands',
					'im:history',
					'im:read',
					'im:write',
					'incoming-webhook',
					'reactions:read',
					'users.profile:read',
					'channels:history',
				],
			},
		},
		'settings': {
			'event_subscriptions': {
				'request_url': apiEndpoint,
				'bot_events': [
					'app_mention',
					'message.im',
				],
			},
			'interactivity': {
				'is_enabled': true,
				'request_url': apiEndpoint,
			},
			'org_deploy_enabled': false,
			'socket_mode_enabled': false,
			'token_rotation_enabled': false,
		},
	}));
}
create();
