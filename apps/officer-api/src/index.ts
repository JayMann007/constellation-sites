import OpenAI from 'openai';

// Define the environment variables type
export interface Env {
	OPENAI_API_KEY: string;
}

// Mya's Assistant ID
const ASSISTANT_ID = 'asst_MYhmBWYEoe4uj8PSdj5aCUK9';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		
		// 1. CORS Headers: Allows your website to talk to this Worker
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*', 
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		};

		// Handle "Preflight" checks
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		// Only allow POST requests
		if (request.method !== 'POST') {
			return new Response('Method not allowed', { status: 405, headers: corsHeaders });
		}

		try {
			// 2. Connect to OpenAI
			const openai = new OpenAI({
				apiKey: env.OPENAI_API_KEY,
			});

			// 3. Read User Input
			const { message, threadId } = await request.json() as any;

			if (!message) {
				return new Response('Message required', { status: 400, headers: corsHeaders });
			}

			// 4. Manage Conversation Threads
			let thread;
			if (threadId) {
				thread = { id: threadId };
			} else {
				thread = await openai.beta.threads.create();
			}

			// 5. Add the User's Message to Mya
			await openai.beta.threads.messages.create(thread.id, {
				role: 'user',
				content: message,
			});

			// 6. Run Mya (Start Thinking)
			const run = await openai.beta.threads.runs.create(thread.id, {
				assistant_id: ASSISTANT_ID,
			});

			// 7. Polling: Check status every 1s until she is done
			let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
			
			while (runStatus.status !== 'completed') {
				if (runStatus.status === 'failed' || runStatus.status === 'cancelled') {
					throw new Error('Mya encountered an error.');
				}
				await new Promise((resolve) => setTimeout(resolve, 1000));
				runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
			}

			// 8. Get Mya's Answer
			const messages = await openai.beta.threads.messages.list(thread.id);
			const lastMessage = messages.data[0];

			let responseText = "";
			if (lastMessage.content[0].type === 'text') {
				responseText = lastMessage.content[0].text.value;
			}

			// 9. Send Answer Back to Website
			return new Response(JSON.stringify({ 
				response: responseText,
				threadId: thread.id 
			}), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});

		} catch (error) {
			return new Response(JSON.stringify({ error: (error as Error).message }), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
	},
};