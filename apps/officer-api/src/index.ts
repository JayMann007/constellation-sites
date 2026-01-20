import OpenAI from 'openai';

export interface Env {
	OPENAI_API_KEY: string;
}

// Mya | Unity of One
const ASSISTANT_ID = 'asst_MYhmBWYEoe4uJ8PSdj5aCUK9';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		// CORS Headers for security and access
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*', 
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
		};

		// Handle Preflight checks
		if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
		if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

		try {
			const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
			const { message, threadId } = await request.json() as any;

			if (!message) return new Response('Message required', { status: 400, headers: corsHeaders });

			// 1. Manage Conversation Thread
			let myThreadId = threadId;
			if (!myThreadId) {
				const thread = await openai.beta.threads.create();
				myThreadId = thread.id;
			}

			// 2. Add User Message
			await openai.beta.threads.messages.create(myThreadId, {
				role: 'user',
				content: message,
			});

			// 3. Start Mya
			const run = await openai.beta.threads.runs.create(myThreadId, {
				assistant_id: ASSISTANT_ID,
			});
            const myRunId = run.id;

			// 4. Poll for Completion (Manual Fetch for Stability)
            let status = 'queued';
            while (status !== 'completed') {
                const url = `https://api.openai.com/v1/threads/${myThreadId}/runs/${myRunId}`;
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
                        'OpenAI-Beta': 'assistants=v2',
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) throw new Error('Connection to Mya interrupted.');

                const runData = await response.json() as any;
                status = runData.status;

                if (status === 'failed' || status === 'cancelled') {
                    throw new Error('Mya encountered a processing error.');
                }

                if (status !== 'completed') {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }
            }

			// 5. Retrieve Answer
			const messages = await openai.beta.threads.messages.list(myThreadId);
			const lastMessage = messages.data[0];

			let responseText = "";
			if (lastMessage.content[0].type === 'text') {
				responseText = lastMessage.content[0].text.value;
			}

			return new Response(JSON.stringify({ 
                response: responseText, 
                threadId: myThreadId
            }), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});

		} catch (error: any) {
			console.error("Worker Error:", error.message);
			return new Response(JSON.stringify({ error: error.message }), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
	},
};