import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import { OpenAI } from 'langchain/llms/openai';
import { SerpAPI } from 'langchain/tools';
import { Calculator } from 'langchain/tools/calculator';

const GPT_MODEL = process.env.GPT_MODEL || 'gpt-3.5-turbo';

async function main(input: string) {
	const model = new OpenAI({
		openAIApiKey: process.env.OPENAI_KEY,
		modelName: GPT_MODEL,
		frequencyPenalty: 0.1,
		maxTokens: 512,
		presencePenalty: 0,
		temperature: 0.7,
		topP: 1,
	});
	const tools = [
		new SerpAPI(process.env.SERPAPI_API_KEY, {
			location: 'Columbus,Ohio,United States',
			hl: 'en',
			gl: 'us',
		}),
		new Calculator(),
	];

	const executor = await initializeAgentExecutorWithOptions(tools, model, {
		agentType: 'zero-shot-react-description',
	});
	console.log('Loaded agent.');

	console.log(`Executing with input "${input}"...`);

	const result = await executor.call({ input });
	console.log(JSON.stringify(result, null, 2));

	console.log(`Got output ${result.output}`);
	console.log(`Cost Tokens: ${result.tokensUsed}`);
}
main(process.argv[2]);
