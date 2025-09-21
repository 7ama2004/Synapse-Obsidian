import { Plugin, Notice } from 'obsidian';
import { BlockDefinition } from './BlockManager';

interface LivingCanvasPlugin extends Plugin {
	blockManager: any;
	canvasManager: any;
	uiManager: any;
	actionHandler: any;
	blockExecutor: any;
	settings: any;
}

export interface LLMResponse {
	content: string;
	usage?: {
		prompt_tokens: number;
		completion_tokens: number;
		total_tokens: number;
	};
}

export class BlockExecutor {
	private plugin: LivingCanvasPlugin;

	constructor(plugin: LivingCanvasPlugin) {
		this.plugin = plugin;
	}

	async executeBlock(blockDefinition: BlockDefinition, inputText: string, config: Record<string, any>): Promise<string> {
		try {
			// Load the executor function
			const executorFunction = await this.loadExecutorFunction(blockDefinition.executorPath);
			
			// Create API call wrapper
			const apiCall = this.createApiCallWrapper();
			
			// Execute the block
			const result = await executorFunction(inputText, config, apiCall);
			
			return result;
		} catch (error) {
			console.error('Living Canvas: Block execution error:', error);
			throw new Error(`Block execution failed: ${error.message}`);
		}
	}

	private async loadExecutorFunction(executorPath: string): Promise<Function> {
		try {
			// Read the executor file
			const executorFile = this.plugin.app.vault.getAbstractFileByPath(executorPath);
			if (!executorFile) {
				throw new Error(`Executor file not found: ${executorPath}`);
			}

			const executorCode = await this.plugin.app.vault.read(executorFile as any);
			
			// Create a function that includes the executor code
			// We'll use a simple eval approach for now, but in production you might want to use a more secure method
			const wrappedCode = `
				${executorCode}
				
				// Return the execute function
				if (typeof execute === 'function') {
					execute;
				} else if (typeof module !== 'undefined' && module.exports && module.exports.execute) {
					module.exports.execute;
				} else {
					throw new Error('No execute function found in executor file');
				}
			`;

			// For now, we'll use a mock implementation since we can't safely eval user code
			// In a real implementation, you'd want to use a sandboxed environment
			return this.createMockExecutor();
			
		} catch (error) {
			console.error('Living Canvas: Error loading executor function:', error);
			throw new Error(`Failed to load executor: ${error.message}`);
		}
	}

	private createMockExecutor(): Function {
		// Mock executor for development/testing
		return async (inputText: string, config: Record<string, any>, apiCall: Function): Promise<string> => {
			// Simulate processing time
			await new Promise(resolve => setTimeout(resolve, 1000));
			
			// Mock response based on block type
			const blockType = config.blockType || 'unknown';
			
			switch (blockType) {
				case 'core/summarizer':
					return this.mockSummarizer(inputText, config);
				case 'core/quizzer':
					return this.mockQuizzer(inputText, config);
				case 'core/grader':
					return this.mockGrader(inputText, config);
				default:
					return `Mock response for block type: ${blockType}\n\nInput: ${inputText.substring(0, 100)}...`;
			}
		};
	}

	private mockSummarizer(inputText: string, config: Record<string, any>): string {
		const tone = config.tone || 'concise and academic';
		const format = config.outputFormat || 'bullet points';
		
		const summary = `This is a mock summary in a ${tone} tone, formatted as ${format}:\n\n` +
			`• Key point 1: The text discusses important concepts\n` +
			`• Key point 2: Several themes emerge from the content\n` +
			`• Key point 3: The material provides valuable insights\n\n` +
			`(This is a mock response - configure your LLM API key in settings for real AI processing)`;
		
		return summary;
	}

	private mockQuizzer(inputText: string, config: Record<string, any>): string {
		const difficulty = config.difficulty || 'medium';
		const questionCount = config.questionCount || 3;
		
		let questions = `Mock quiz questions (${difficulty} difficulty):\n\n`;
		
		for (let i = 1; i <= questionCount; i++) {
			questions += `${i}. What is the main concept discussed in the text?\n`;
			questions += `   A) Option A\n   B) Option B\n   C) Option C\n   D) Option D\n\n`;
		}
		
		questions += `(This is a mock response - configure your LLM API key in settings for real AI processing)`;
		
		return questions;
	}

	private mockGrader(inputText: string, config: Record<string, any>): string {
		const criteria = config.criteria || 'clarity, accuracy, completeness';
		
		return `Mock grading feedback:\n\n` +
			`**Overall Score: 85/100**\n\n` +
			`**Strengths:**\n` +
			`• Clear and well-structured content\n` +
			`• Good use of examples\n` +
			`• Appropriate tone and style\n\n` +
			`**Areas for Improvement:**\n` +
			`• Could benefit from more specific details\n` +
			`• Consider expanding on key points\n\n` +
			`**Criteria Evaluated:** ${criteria}\n\n` +
			`(This is a mock response - configure your LLM API key in settings for real AI processing)`;
	}

	private createApiCallWrapper(): Function {
		return async (systemPrompt: string, userPrompt: string): Promise<string> => {
			// Check if we have API credentials configured
			if (!this.plugin.settings.llmApiKey && this.plugin.settings.llmProvider !== 'ollama') {
				throw new Error('LLM API key not configured. Please set your API key in the plugin settings.');
			}

			try {
				switch (this.plugin.settings.llmProvider) {
					case 'openai':
						return await this.callOpenAI(systemPrompt, userPrompt);
					case 'anthropic':
						return await this.callAnthropic(systemPrompt, userPrompt);
					case 'ollama':
						return await this.callOllama(systemPrompt, userPrompt);
					default:
						throw new Error(`Unsupported LLM provider: ${this.plugin.settings.llmProvider}`);
				}
			} catch (error) {
				console.error('Living Canvas: API call error:', error);
				throw new Error(`API call failed: ${error.message}`);
			}
		};
	}

	private async callOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
		const response = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${this.plugin.settings.llmApiKey}`
			},
			body: JSON.stringify({
				model: this.plugin.settings.llmModel,
				messages: [
					{ role: 'system', content: systemPrompt },
					{ role: 'user', content: userPrompt }
				],
				temperature: 0.7,
				max_tokens: 2000
			})
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(`OpenAI API error: ${response.status} ${errorData.error?.message || response.statusText}`);
		}

		const data = await response.json();
		return data.choices[0]?.message?.content || 'No response generated';
	}

	private async callAnthropic(systemPrompt: string, userPrompt: string): Promise<string> {
		const response = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': this.plugin.settings.llmApiKey,
				'anthropic-version': '2023-06-01'
			},
			body: JSON.stringify({
				model: this.plugin.settings.llmModel,
				system: systemPrompt,
				messages: [
					{ role: 'user', content: userPrompt }
				],
				temperature: 0.7,
				max_tokens: 2000
			})
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			throw new Error(`Anthropic API error: ${response.status} ${errorData.error?.message || response.statusText}`);
		}

		const data = await response.json();
		return data.content[0]?.text || 'No response generated';
	}

	private async callOllama(systemPrompt: string, userPrompt: string): Promise<string> {
		const response = await fetch(`${this.plugin.settings.ollamaUrl}/api/chat`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: this.plugin.settings.llmModel,
				messages: [
					{ role: 'system', content: systemPrompt },
					{ role: 'user', content: userPrompt }
				],
				stream: false
			})
		});

		if (!response.ok) {
			throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();
		return data.message?.content || 'No response generated';
	}

	// Utility method to test API connectivity
	async testApiConnection(): Promise<boolean> {
		try {
			const testPrompt = 'Say "API connection test successful"';
			await this.createApiCallWrapper()('You are a helpful assistant.', testPrompt);
			return true;
		} catch (error) {
			console.error('Living Canvas: API connection test failed:', error);
			return false;
		}
	}
}