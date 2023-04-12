# chatgpt-slack-bot
ChatGPT Slack Bot using SST

This is the backend component for creating a Slack application that connects to ChatGPT. To get
started you'll need to have access to the GPT API as well as a slack application.

## Sign up for a ChatGPT API

1. Go to https://platform.openai.com/ and create an account. Follow the instructions to create a new
   account, and request access to the ChatGPT API. (I also recommend signing up for the GPT-4
   waitlist)
2. Once you have an account, click your profile photo and choose "View API Keys", then "Create a new
   secret key". Copy this key to your clipboard
3. Run `npx sst secrets set OPENAI_KEY <your-api-key>` replacing `<your-api-key>` with the API key
   you created

## Create the Slack App

1. Run `pnpm sst deploy` to deploy the initial version of the stack
2. Once the stack has been deployed, you can run `pnpm run manifest` to generate a basic version of
   the `manifest.json`
3. Go to https://api.slack.com and create an app
4. Choose "From an app manifest" and upload the `manifest.json` file created from `pnpm run manifest`
5. Connect the slack app to your workspace

## Set the slack secrets

Upload the secrets for your slack app to AWS by using `npx sst secrets set SLACK_CONFIG
   <slack-config-json>` Where `<slack-config-json>` is of the format:

```json
{
	"APP_ID": "XXXXXX",
	"CLIENT_ID":"XXXXXXX.XXXXX",
	"CLIENT_SECRET":"XXXXXXXXX",
	"SIGNING_SECRET": "XXXXXXXXX",
	"BOT_TOKEN":"xoxb-XXXXX-XXXX-XXXXX"
}
```

All of these values should be available in the https://api.slack.com portal, most of them under
"Basic Information", however the BOT_TOKEN will be under "OAuth & Permissions". It specifically is
called "Bot User OAuth Token" and should start with `xoxb-`


## Changing the GPT MOdel

You can change the GPT model by setting the `GPT_MODEL` environment variable, for example

```bash
GPT_MODEL=gpt-4 pnpm sst deploy --stage prod
```

The default model uses `gpt-3.5-turbo`, which is currently on a waitlist. If you have access to
GPT-4, consider setting this environment variable.
