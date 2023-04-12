/**
 * Script run after the stack is deployed
 * @param params
 */
export async function create(params: { apiEndpoint: string }) {
	console.log('Create Manifest', params);
	return {
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
					'url': params.apiEndpoint,
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
				'request_url': params.apiEndpoint,
				'bot_events': [
					'app_mention',
					'message.im',
				],
			},
			'interactivity': {
				'is_enabled': true,
				'request_url': params.apiEndpoint,
			},
			'org_deploy_enabled': false,
			'socket_mode_enabled': false,
			'token_rotation_enabled': false,
		},
	};
}
