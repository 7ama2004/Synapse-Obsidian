import { Plugin } from 'obsidian';
import { LivingCanvasPlugin } from '../main';

export interface BlockSetting {
	name: string;
	description: string;
	type: 'text' | 'textarea' | 'dropdown' | 'number' | 'boolean';
	required?: boolean;
	default?: any;
	options?: { [key: string]: string }; // For dropdown type
}

export interface BlockDefinition {
	id: string;
	name: string;
	description: string;
	author: string;
	version: string;
	category: 'core' | 'community';
	settings: BlockSetting[];
	executorPath: string;
}

export class BlockManager {
	private plugin: LivingCanvasPlugin;
	private blocks: Map<string, BlockDefinition> = new Map();
	private blocksDirectory: string;

	constructor(plugin: LivingCanvasPlugin) {
		this.plugin = plugin;
		// Use a relative path within the plugin directory
		this.blocksDirectory = this.plugin.manifest.id + '/blocks';
	}

	async initialize(): Promise<void> {
		this.plugin.debug('Initializing BlockManager');
		await this.scanBlocksDirectory();
		this.plugin.debug(`Loaded ${this.blocks.size} blocks`);
	}

	private async scanBlocksDirectory(): Promise<void> {
		try {
			// Check if blocks directory exists
			const blocksPath = this.blocksDirectory;
			const exists = await this.plugin.app.vault.adapter.exists(blocksPath);
			
			if (!exists) {
				this.plugin.debug('Blocks directory does not exist, creating with sample blocks');
				await this.createSampleBlocks();
				return;
			}

			// Scan for block directories
			const entries = await this.plugin.app.vault.adapter.list(blocksPath);
			
			for (const entry of entries.folders) {
				await this.loadBlock(entry);
			}
		} catch (error) {
			console.error('Error scanning blocks directory:', error);
		}
	}

	private async loadBlock(blockPath: string): Promise<void> {
		try {
			const blockJsonPath = blockPath + '/block.json';
			const executorPath = blockPath + '/executor.js';

			// Check if both required files exist
			const blockJsonExists = await this.plugin.app.vault.adapter.exists(blockJsonPath);
			const executorExists = await this.plugin.app.vault.adapter.exists(executorPath);

			if (!blockJsonExists || !executorExists) {
				this.plugin.debug(`Skipping block at ${blockPath}: missing required files`);
				return;
			}

			// Read block.json
			const blockJsonContent = await this.plugin.app.vault.adapter.read(blockJsonPath);
			const blockConfig = JSON.parse(blockJsonContent);

			// Validate block configuration
			if (!this.validateBlockConfig(blockConfig)) {
				this.plugin.debug(`Invalid block configuration at ${blockPath}`);
				return;
			}

			// Create block definition
			const blockDefinition: BlockDefinition = {
				id: blockConfig.id,
				name: blockConfig.name,
				description: blockConfig.description,
				author: blockConfig.author,
				version: blockConfig.version,
				category: blockConfig.category || 'community',
				settings: blockConfig.settings || [],
				executorPath: executorPath
			};

			this.blocks.set(blockDefinition.id, blockDefinition);
			this.plugin.debug(`Loaded block: ${blockDefinition.id}`);
		} catch (error) {
			console.error(`Error loading block at ${blockPath}:`, error);
		}
	}

	private validateBlockConfig(config: any): boolean {
		const requiredFields = ['id', 'name', 'description', 'author', 'version'];
		return requiredFields.every(field => config[field] !== undefined);
	}

	private async createSampleBlocks(): Promise<void> {
		// Create blocks directory
		await this.plugin.app.vault.adapter.mkdir(this.blocksDirectory);

		// Create sample blocks
		await this.createSummarizerBlock();
		await this.createQuizzerBlock();
		await this.createAIGraderBlock();
		await this.createTranslatorBlock();
	}

	private async createSummarizerBlock(): Promise<void> {
		const blockDir = this.blocksDirectory + '/core/summarizer';
		await this.plugin.app.vault.adapter.mkdir(blockDir);

		// Create block.json
		const blockConfig = {
			id: 'core/summarizer',
			name: 'Text Summarizer',
			description: 'Summarizes long text into concise bullet points or paragraphs',
			author: 'Living Canvas Team',
			version: '1.0.0',
			category: 'core',
			settings: [
				{
					name: 'systemPrompt',
					description: 'System prompt for the AI',
					type: 'textarea',
					required: true,
					default: 'You are a helpful academic assistant. Summarize the following text.'
				},
				{
					name: 'tone',
					description: 'Tone of the summary',
					type: 'dropdown',
					required: true,
					default: 'concise',
					options: {
						'concise': 'Concise',
						'academic': 'Academic',
						'casual': 'Casual',
						'technical': 'Technical'
					}
				},
				{
					name: 'outputFormat',
					description: 'Format of the output',
					type: 'dropdown',
					required: true,
					default: 'bullet',
					options: {
						'bullet': 'Bullet Points',
						'paragraph': 'Paragraph',
						'numbered': 'Numbered List'
					}
				},
				{
					name: 'maxLength',
					description: 'Maximum length of summary (words)',
					type: 'number',
					required: false,
					default: 200
				},
				{
					name: 'citeReferences',
					description: 'Include references and citations',
					type: 'boolean',
					required: false,
					default: false
				}
			]
		};

		await this.plugin.app.vault.adapter.write(blockDir + '/block.json', JSON.stringify(blockConfig, null, 2));

		// Create executor.js
		const executorCode = `
async function execute(inputText, config) {
	const { systemPrompt, tone, outputFormat, maxLength, citeReferences } = config;
	
	// Construct the prompt
	let prompt = \`\${systemPrompt}\\n\\nTone: \${tone}\\nFormat: \${outputFormat}\`;
	if (maxLength) {
		prompt += \`\\nMaximum length: \${maxLength} words\`;
	}
	if (citeReferences) {
		prompt += \`\\nInclude references and citations where appropriate\`;
	}
	prompt += \`\\n\\nText to summarize:\\n\\n\${inputText}\`;

	// Return the prompt - the BlockExecutor will handle the AI API call
	return prompt;
}

module.exports = { execute };
`;

		await this.plugin.app.vault.adapter.write(blockDir + '/executor.js', executorCode);
	}

	private async createQuizzerBlock(): Promise<void> {
		const blockDir = this.blocksDirectory + '/core/quizzer';
		await this.plugin.app.vault.adapter.mkdir(blockDir);

		// Create block.json
		const blockConfig = {
			id: 'core/quizzer',
			name: 'Quiz Generator',
			description: 'Generates quiz questions from educational content',
			author: 'Living Canvas Team',
			version: '1.0.0',
			category: 'core',
			settings: [
				{
					name: 'questionType',
					description: 'Type of questions to generate',
					type: 'dropdown',
					required: true,
					default: 'multiple',
					options: {
						'multiple': 'Multiple Choice',
						'truefalse': 'True/False',
						'short': 'Short Answer',
						'mixed': 'Mixed Types'
					}
				},
				{
					name: 'numQuestions',
					description: 'Number of questions to generate',
					type: 'number',
					required: true,
					default: 5
				},
				{
					name: 'difficulty',
					description: 'Difficulty level',
					type: 'dropdown',
					required: true,
					default: 'medium',
					options: {
						'easy': 'Easy',
						'medium': 'Medium',
						'hard': 'Hard'
					}
				}
			]
		};

		await this.plugin.app.vault.adapter.write(blockDir + '/block.json', JSON.stringify(blockConfig, null, 2));

		// Create executor.js
		const executorCode = `
async function execute(inputText, config) {
	const { questionType, numQuestions, difficulty } = config;
	
	// Construct the prompt
	const prompt = \`Generate \${numQuestions} \${difficulty} \${questionType} questions based on the following content:\\n\\n\${inputText}\\n\\nFormat the questions clearly with answers.\`;

	// Return the prompt - the BlockExecutor will handle the AI API call
	return prompt;
}

module.exports = { execute };
`;

		await this.plugin.app.vault.adapter.write(blockDir + '/executor.js', executorCode);
	}

	private async createAIGraderBlock(): Promise<void> {
		const blockDir = this.blocksDirectory + '/core/ai-grader';
		await this.plugin.app.vault.adapter.mkdir(blockDir);

		const blockConfig = {
			id: 'core/ai-grader',
			name: 'AI Grader',
			description: 'Grades essays, assignments, or answers with detailed feedback',
			author: 'Living Canvas Team',
			version: '1.0.0',
			category: 'core',
			settings: [
				{
					name: 'gradingCriteria',
					description: 'Specific criteria to evaluate',
					type: 'textarea',
					required: true,
					default: 'Clarity, accuracy, completeness, and organization'
				},
				{
					name: 'gradeScale',
					description: 'Grading scale',
					type: 'dropdown',
					required: true,
					default: '100',
					options: {
						'100': '0-100 points',
						'letter': 'A-F letter grades',
						'rubric': 'Detailed rubric'
					}
				},
				{
					name: 'includeSuggestions',
					description: 'Include improvement suggestions',
					type: 'boolean',
					required: false,
					default: true
				}
			]
		};

		await this.plugin.app.vault.adapter.write(blockDir + '/block.json', JSON.stringify(blockConfig, null, 2));

		const executorCode = `
async function execute(inputText, config) {
	const { gradingCriteria, gradeScale, includeSuggestions } = config;
	
	let prompt = \`Please grade the following work based on these criteria: \${gradingCriteria}\\n\\nGrading scale: \${gradeScale}\`;
	if (includeSuggestions) {
		prompt += \`\\nInclude specific suggestions for improvement.\`;
	}
	prompt += \`\\n\\nWork to grade:\\n\\n\${inputText}\`;

	return prompt;
}

module.exports = { execute };
`;

		await this.plugin.app.vault.adapter.write(blockDir + '/executor.js', executorCode);
	}

	private async createTranslatorBlock(): Promise<void> {
		const blockDir = this.blocksDirectory + '/core/translator';
		await this.plugin.app.vault.adapter.mkdir(blockDir);

		const blockConfig = {
			id: 'core/translator',
			name: 'Translator',
			description: 'Translates text between different languages',
			author: 'Living Canvas Team',
			version: '1.0.0',
			category: 'core',
			settings: [
				{
					name: 'targetLanguage',
					description: 'Target language',
					type: 'dropdown',
					required: true,
					default: 'Spanish',
					options: {
						'Spanish': 'Spanish',
						'French': 'French',
						'German': 'German',
						'Italian': 'Italian',
						'Portuguese': 'Portuguese',
						'Chinese': 'Chinese',
						'Japanese': 'Japanese',
						'Korean': 'Korean',
						'Arabic': 'Arabic',
						'Russian': 'Russian'
					}
				},
				{
					name: 'preserveFormatting',
					description: 'Preserve original formatting',
					type: 'boolean',
					required: false,
					default: true
				}
			]
		};

		await this.plugin.app.vault.adapter.write(blockDir + '/block.json', JSON.stringify(blockConfig, null, 2));

		const executorCode = `
async function execute(inputText, config) {
	const { targetLanguage, preserveFormatting } = config;
	
	let prompt = \`Translate the following text to \${targetLanguage}.\`;
	if (preserveFormatting) {
		prompt += \` Preserve the original formatting, including line breaks, bullet points, and emphasis.\`;
	}
	prompt += \`\\n\\nText to translate:\\n\\n\${inputText}\`;

	return prompt;
}

module.exports = { execute };
`;

		await this.plugin.app.vault.adapter.write(blockDir + '/executor.js', executorCode);
	}

	// Public methods
	getBlock(blockId: string): BlockDefinition | undefined {
		return this.blocks.get(blockId);
	}

	getAllBlocks(): BlockDefinition[] {
		return Array.from(this.blocks.values());
	}

	getBlocksByCategory(category: 'core' | 'community'): BlockDefinition[] {
		return this.getAllBlocks().filter(block => block.category === category);
	}

	async reloadBlocks(): Promise<void> {
		this.blocks.clear();
		await this.scanBlocksDirectory();
	}
}