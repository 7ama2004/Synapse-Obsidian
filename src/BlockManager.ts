import { Plugin, TFile } from 'obsidian';

export interface BlockConfig {
	id: string;
	name: string;
	description: string;
	author: string;
	version: string;
	category: string;
	settings: BlockSetting[];
}

export interface BlockSetting {
	name: string;
	description: string;
	type: 'text' | 'textarea' | 'dropdown' | 'toggle';
	required: boolean;
	default: any;
	options?: string[];
}

export interface BlockInstance {
	id: string;
	config: BlockConfig;
	settings: { [key: string]: any };
	position: { x: number; y: number };
}

export class BlockManager {
	private plugin: Plugin;
	private blocks: Map<string, BlockConfig> = new Map();
	private instances: Map<string, BlockInstance> = new Map();

	constructor(plugin: Plugin) {
		this.plugin = plugin;
		this.loadBlocks();
	}

	private async loadBlocks(): Promise<void> {
		// Load core blocks
		const coreBlocks = [
			'custom-ai',
			'summarizer',
			'translator',
			'quizzer',
			'concept-explainer',
			'study-buddy',
			'ai-grader'
		];

		for (const blockId of coreBlocks) {
			try {
				const config = await this.loadBlockConfig(`blocks/core/${blockId}/block.json`);
				this.blocks.set(blockId, config);
			} catch (error) {
				console.error(`Failed to load block ${blockId}:`, error);
			}
		}
	}

	private async loadBlockConfig(path: string): Promise<BlockConfig> {
		const file = this.plugin.app.vault.getAbstractFileByPath(path);
		if (!file || !(file instanceof TFile)) {
			throw new Error(`Block config not found: ${path}`);
		}

		const content = await this.plugin.app.vault.read(file);
		return JSON.parse(content);
	}

	public getBlockConfig(blockId: string): BlockConfig | undefined {
		return this.blocks.get(blockId);
	}

	public getAllBlocks(): BlockConfig[] {
		return Array.from(this.blocks.values());
	}

	public createBlockInstance(blockId: string, settings: { [key: string]: any }, position: { x: number; y: number }): BlockInstance {
		const config = this.getBlockConfig(blockId);
		if (!config) {
			throw new Error(`Block not found: ${blockId}`);
		}

		const instanceId = `${blockId}_${Date.now()}`;
		const instance: BlockInstance = {
			id: instanceId,
			config,
			settings,
			position
		};

		this.instances.set(instanceId, instance);
		return instance;
	}

	public getBlockInstance(instanceId: string): BlockInstance | undefined {
		return this.instances.get(instanceId);
	}

	public updateBlockInstance(instanceId: string, settings: { [key: string]: any }): void {
		const instance = this.instances.get(instanceId);
		if (instance) {
			instance.settings = { ...instance.settings, ...settings };
		}
	}

	public deleteBlockInstance(instanceId: string): void {
		this.instances.delete(instanceId);
	}

	public getAllInstances(): BlockInstance[] {
		return Array.from(this.instances.values());
	}

	public async executeBlock(instanceId: string, input: string): Promise<string> {
		const instance = this.getBlockInstance(instanceId);
		if (!instance) {
			throw new Error(`Block instance not found: ${instanceId}`);
		}

		// Load and execute the block's executor
		const executorPath = `blocks/core/${instance.config.id}/executor.js`;
		const file = this.plugin.app.vault.getAbstractFileByPath(executorPath);
		
		if (!file || !(file instanceof TFile)) {
			throw new Error(`Block executor not found: ${executorPath}`);
		}

		const executorCode = await this.plugin.app.vault.read(file);
		
		// Create a function from the executor code
		const executor = new Function('input', 'settings', 'plugin', executorCode);
		
		try {
			const result = await executor(input, instance.settings, this.plugin);
			return result;
		} catch (error) {
			console.error(`Error executing block ${instanceId}:`, error);
			throw error;
		}
	}
}