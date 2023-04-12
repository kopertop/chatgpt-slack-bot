export interface SlackEvent {
	text: string;
	// Slash commands
	token?: string;
	team_id?: string;
	team_domain?: string;
	channel_id?: string;
	channel_name?: string;
	user_id?: string;
	user_name?: string;
	command?: string;
	api_app_id?: string;
	is_enterprise_install?: string;
	response_url?: string;
	trigger_id?: string;

	// Event Trigger (like with an @ notification)
	type?: string;
	user?: string;
	ts?: string;
	team?: string;
	channel?: string;
	event_ts?: string;
	thread_ts?: string;
}
