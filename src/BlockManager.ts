import { Plugin, TAbstractFile, TFolder } from 'obsidian';

export interface BlockSetting {
	name: string;
	description: string;
	type: 'text' | 'textarea' | 'dropdown' | 'number' | 'boolean';
	required?: boolean;
	default?: any;
	options?: string[]; // For dropdown type
}

export interface BlockDefinition {
	id: string;
	name: string;
	description: string;
	author: string;
	version: string;
	settings: BlockSetting[];
	executorPath: string;
}

export class BlockManager {
	private plugin: Plugin;
	private blocks: Map<string, BlockDefinition> = new Map();
	private blocksPath: string;

	constructor(plugin: Plugin) {
		this.plugin = plugin;
		this.blocksPath = `${(this.plugin.app.vault.adapter as any).basePath}/${this.plugin.manifest.id}/blocks`;
	}

	async initialize(): Promise<void> {
		await this.scanBlocksDirectory();
	}

	private async scanBlocksDirectory(): Promise<void> {
		this.blocks.clear();
		
		try {
			// Check if blocks directory exists
			const blocksFolder = this.plugin.app.vault.getAbstractFileByPath(`${this.plugin.manifest.id}/blocks`);
			
			if (!blocksFolder || !(blocksFolder instanceof TFolder)) {
				console.log('Living Canvas: No blocks directory found, creating sample block...');
				await this.createSampleBlock();
				return;
			}

			// Scan all subdirectories in blocks folder
			await this.scanFolder(blocksFolder, '');
		} catch (error) {
			console.error('Living Canvas: Error scanning blocks directory:', error);
			await this.createSampleBlock();
		}
	}

	private async scanFolder(folder: TFolder, prefix: string): Promise<void> {
		for (const child of folder.children) {
			if (child instanceof TFolder) {
				const blockId = prefix ? `${prefix}/${child.name}` : child.name;
				await this.loadBlockDefinition(child, blockId);
			}
		}
	}

	private async loadBlockDefinition(folder: TFolder, blockId: string): Promise<void> {
		try {
			// Look for block.json
			const blockJsonFile = folder.children.find(child => 
				child.name === 'block.json' && child instanceof TAbstractFile
			);

			if (!blockJsonFile) {
				console.warn(`Living Canvas: No block.json found in ${folder.path}`);
				return;
			}

			// Read and parse block.json
			const blockJsonContent = await this.plugin.app.vault.read(blockJsonFile as any);
			const blockConfig = JSON.parse(blockJsonContent);

			// Validate required fields
			if (!blockConfig.id || !blockConfig.name || !blockConfig.executor) {
				console.warn(`Living Canvas: Invalid block.json in ${folder.path}`);
				return;
			}

			// Check if executor.js exists
			const executorFile = folder.children.find(child => 
				child.name === 'executor.js' && child instanceof TAbstractFile
			);

			if (!executorFile) {
				console.warn(`Living Canvas: No executor.js found in ${folder.path}`);
				return;
			}

			const blockDefinition: BlockDefinition = {
				id: blockConfig.id,
				name: blockConfig.name,
				description: blockConfig.description || '',
				author: blockConfig.author || 'Unknown',
				version: blockConfig.version || '1.0.0',
				settings: blockConfig.settings || [],
				executorPath: `${folder.path}/executor.js`
			};

			this.blocks.set(blockId, blockDefinition);
			console.log(`Living Canvas: Loaded block "${blockDefinition.name}" (${blockId})`);

		} catch (error) {
			console.error(`Living Canvas: Error loading block definition from ${folder.path}:`, error);
		}
	}

	private async createSampleBlock(): Promise<void> {
		try {
			// Create blocks directory structure
			const blocksPath = `${this.plugin.manifest.id}/blocks/core/summarizer`;
			
			// Create block.json
			const blockJson = {
				id: 'core/summarizer',
				name: 'Text Summarizer',
				description: 'Summarizes input text with customizable tone and format',
				author: 'Living Canvas Team',
				version: '1.0.0',
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
						required: false,
						default: 'concise and academic',
						options: ['concise and academic', 'casual and friendly', 'formal and detailed', 'creative and engaging']
					},
					{
						name: 'outputFormat',
						description: 'Format of the output',
						type: 'dropdown',
						required: false,
						default: 'bullet points',
						options: ['bullet points', 'paragraph', 'numbered list', 'outline']
					},
					{
						name: 'citeReferences',
						description: 'Include references and citations',
						type: 'boolean',
						required: false,
						default: false
					}
				],
				executor: 'executor.js'
			};

			// Create executor.js
			const executorJs = `// Living Canvas Block Executor
// This function will be called with the input text and configuration

async function execute(inputText, config, apiCall) {
    const systemPrompt = config.systemPrompt || 'You are a helpful assistant. Summarize the following text.';
    const tone = config.tone || 'concise and academic';
    const outputFormat = config.outputFormat || 'bullet points';
    const citeReferences = config.citeReferences || false;
    
    const userPrompt = \`Please summarize the following text in a \${tone} tone, using \${outputFormat} format.\${citeReferences ? ' Include relevant references and citations where appropriate.' : ''}

Text to summarize:
\${inputText}\`;

    try {
        const response = await apiCall(systemPrompt, userPrompt);
        return response;
    } catch (error) {
        throw new Error(\`Failed to summarize text: \${error.message}\`);
    }
}

// Export the execute function
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { execute };
}`;

			// Write files
			await this.plugin.app.vault.create(`${blocksPath}/block.json`, JSON.stringify(blockJson, null, 2));
			await this.plugin.app.vault.create(`${blocksPath}/executor.js`, executorJs);

			// Reload blocks
			await this.scanBlocksDirectory();

		} catch (error) {
			console.error('Living Canvas: Error creating sample block:', error);
		}
	}

	getBlockDefinition(blockId: string): BlockDefinition | undefined {
		return this.blocks.get(blockId);
	}

	getAllBlocks(): BlockDefinition[] {
		return Array.from(this.blocks.values());
	}

	getBlocksByCategory(category: string): BlockDefinition[] {
		return this.getAllBlocks().filter(block => block.id.startsWith(category));
	}

	async reloadBlocks(): Promise<void> {
		await this.scanBlocksDirectory();
	}
}