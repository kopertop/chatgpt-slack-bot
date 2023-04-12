import { Configuration, OpenAIApi } from 'openai';
const openai = new OpenAIApi(new Configuration({
	apiKey: process.env.OPENAI_API_KEY,
}));
const image = await openai.createImage({
	prompt: 'A lush, green landscape with a mountain covered in snow in the background.',
	n: 1,
	size: '512x512',
	response_format: 'b64_json',
}).catch((e) => {
	console.error(e);
	return e;
});
console.log(`data:image/png;base64,${image.data.data[0].b64_json}`);
