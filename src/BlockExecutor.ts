import { LivingCanvasPlugin } from '../main';

export interface ExecutionResult {
	success: boolean;
	output?: string;
	error?: string;
}

export class BlockExecutor {
	private plugin: LivingCanvasPlugin;

	constructor(plugin: LivingCanvasPlugin) {
		this.plugin = plugin;
	}

	async executeBlock(blockType: string, inputText: string, config: any): Promise<ExecutionResult> {
		this.plugin.debug(`Executing block: ${blockType}`);

		try {
			// Get the block definition
			const blockDefinition = this.plugin.blockManager.getBlock(blockType);
			if (!blockDefinition) {
				return {
					success: false,
					error: `Block type '${blockType}' not found`
				};
			}

			// Load and execute the block's executor
			const executor = await this.loadExecutor(blockDefinition.executorPath);
			if (!executor) {
				return {
					success: false,
					error: `Failed to load executor for block '${blockType}'`
				};
			}

			// Execute the block to get the prompt
			const prompt = await executor.execute(inputText, config);
			
			// Make the AI API call
			const aiResponse = await this.callAIAPI(prompt, this.plugin.settings.defaultModel);
			
			return {
				success: true,
				output: aiResponse
			};

		} catch (error) {
			this.plugin.debug(`Error executing block ${blockType}:`, error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	private async loadExecutor(executorPath: string): Promise<any> {
		try {
			// Read the executor file
			const content = await this.plugin.app.vault.adapter.read(executorPath);
			
			// Create a temporary module environment
			const module = { exports: {} };
			const require = (id: string) => {
				if (id === 'obsidian') {
					return this.plugin.app;
				}
				throw new Error(`Module '${id}' not found`);
			};

			// Execute the executor code
			const executorFunction = new Function('module', 'exports', 'require', content);
			executorFunction(module, module.exports, require);

			return module.exports;
		} catch (error) {
			this.plugin.debug(`Error loading executor from ${executorPath}:`, error);
			return null;
		}
	}

	// Execute a clarification request
	async executeClarification(selectedText: string, question: string): Promise<ExecutionResult> {
		this.plugin.debug('Executing clarification request');

		try {
			// Construct the prompt
			const prompt = `The user has selected the following text and asked a question about it.

Selected text:
"${selectedText}"

Question: ${question}

Please provide a helpful and accurate answer to their question.`;

			// Call the AI API
			const aiResponse = await this.callAIAPI(prompt, this.plugin.settings.defaultModel);

			return {
				success: true,
				output: aiResponse
			};

		} catch (error) {
			this.plugin.debug('Error executing clarification:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error occurred'
			};
		}
	}

	// Call AI API with real implementation
	private async callAIAPI(prompt: string, model: string = 'gpt-3.5-turbo'): Promise<string> {
		this.plugin.debug(`Calling AI API with model: ${model}`);

		// Determine which API to use based on model
		if (model.startsWith('gpt-') || model.startsWith('text-')) {
			return await this.callOpenAI(prompt, model);
		} else if (model.startsWith('claude-')) {
			return await this.callAnthropic(prompt, model);
		} else {
			// Default to OpenAI
			return await this.callOpenAI(prompt, model);
		}
	}

	private async callOpenAI(prompt: string, model: string): Promise<string> {
		const apiKey = this.plugin.settings.openaiApiKey;
		if (!apiKey) {
			throw new Error('OpenAI API key not configured. Please add it in the plugin settings.');
		}

		try {
			const response = await fetch('https://api.openai.com/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${apiKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: model,
					messages: [
						{
							role: 'user',
							content: prompt
						}
					],
					max_tokens: 2000,
					temperature: 0.7
				})
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(`OpenAI API error: ${response.status} ${errorData.error?.message || response.statusText}`);
			}

			const data = await response.json();
			return data.choices[0]?.message?.content || 'No response received';
		} catch (error) {
			this.plugin.debug('OpenAI API error:', error);
			throw error;
		}
	}

	private async callAnthropic(prompt: string, model: string): Promise<string> {
		const apiKey = this.plugin.settings.anthropicApiKey;
		if (!apiKey) {
			throw new Error('Anthropic API key not configured. Please add it in the plugin settings.');
		}

		try {
			const response = await fetch('https://api.anthropic.com/v1/messages', {
				method: 'POST',
				headers: {
					'x-api-key': apiKey,
					'Content-Type': 'application/json',
					'anthropic-version': '2023-06-01'
				},
				body: JSON.stringify({
					model: model,
					max_tokens: 2000,
					messages: [
						{
							role: 'user',
							content: prompt
						}
					]
				})
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(`Anthropic API error: ${response.status} ${errorData.error?.message || response.statusText}`);
			}

			const data = await response.json();
			return data.content[0]?.text || 'No response received';
		} catch (error) {
			this.plugin.debug('Anthropic API error:', error);
			throw error;
		}
	}
}