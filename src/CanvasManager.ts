import { App, TFile } from 'obsidian';
import { SynapsePlugin } from '../main';
import { BlockInstance } from './BlockManager';

export interface CanvasState {
	blocks: BlockInstance[];
	connections: CanvasConnection[];
	metadata: {
		created: Date;
		modified: Date;
		version: string;
	};
}

export interface CanvasConnection {
	id: string;
	fromBlock: string;
	toBlock: string;
	fromPort: string;
	toPort: string;
}

export class CanvasManager {
	private plugin: SynapsePlugin;
	private currentState: CanvasState | null = null;

	constructor(plugin: SynapsePlugin) {
		this.plugin = plugin;
	}

	public async saveCanvasState(state: CanvasState): Promise<void> {
		try {
			const fileName = `Synapse Canvas ${new Date().toISOString().split('T')[0]}.json`;
			const content = JSON.stringify(state, null, 2);
			
			// Save to vault
			const file = this.plugin.app.vault.getAbstractFileByPath(fileName);
			if (file && file instanceof TFile) {
				await this.plugin.app.vault.modify(file, content);
			} else {
				await this.plugin.app.vault.create(fileName, content);
			}

			this.currentState = state;
		} catch (error) {
			console.error('Error saving canvas state:', error);
			throw error;
		}
	}

	public async loadCanvasState(fileName: string): Promise<CanvasState | null> {
		try {
			const file = this.plugin.app.vault.getAbstractFileByPath(fileName);
			if (!file || !(file instanceof TFile)) {
				return null;
			}

			const content = await this.plugin.app.vault.read(file);
			const state = JSON.parse(content) as CanvasState;
			this.currentState = state;
			return state;
		} catch (error) {
			console.error('Error loading canvas state:', error);
			return null;
		}
	}

	public getCurrentState(): CanvasState | null {
		return this.currentState;
	}

	public createNewState(): CanvasState {
		const state: CanvasState = {
			blocks: [],
			connections: [],
			metadata: {
				created: new Date(),
				modified: new Date(),
				version: '1.0.0'
			}
		};

		this.currentState = state;
		return state;
	}

	public addBlockToState(blockInstance: BlockInstance): void {
		if (!this.currentState) {
			this.currentState = this.createNewState();
		}

		this.currentState.blocks.push(blockInstance);
		this.currentState.metadata.modified = new Date();
	}

	public removeBlockFromState(blockId: string): void {
		if (!this.currentState) return;

		this.currentState.blocks = this.currentState.blocks.filter(block => block.id !== blockId);
		this.currentState.connections = this.currentState.connections.filter(
			conn => conn.fromBlock !== blockId && conn.toBlock !== blockId
		);
		this.currentState.metadata.modified = new Date();
	}

	public addConnection(connection: CanvasConnection): void {
		if (!this.currentState) {
			this.currentState = this.createNewState();
		}

		this.currentState.connections.push(connection);
		this.currentState.metadata.modified = new Date();
	}

	public removeConnection(connectionId: string): void {
		if (!this.currentState) return;

		this.currentState.connections = this.currentState.connections.filter(
			conn => conn.id !== connectionId
		);
		this.currentState.metadata.modified = new Date();
	}

	public updateBlockPosition(blockId: string, position: { x: number; y: number }): void {
		if (!this.currentState) return;

		const block = this.currentState.blocks.find(block => block.id === blockId);
		if (block) {
			block.position = position;
			this.currentState.metadata.modified = new Date();
		}
	}

	public updateBlockSettings(blockId: string, settings: { [key: string]: any }): void {
		if (!this.currentState) return;

		const block = this.currentState.blocks.find(block => block.id === blockId);
		if (block) {
			block.settings = { ...block.settings, ...settings };
			this.currentState.metadata.modified = new Date();
		}
	}

	public async exportCanvas(format: 'json' | 'markdown' = 'json'): Promise<string> {
		if (!this.currentState) {
			throw new Error('No canvas state to export');
		}

		if (format === 'json') {
			return JSON.stringify(this.currentState, null, 2);
		} else if (format === 'markdown') {
			return this.generateMarkdownFromState();
		}

		throw new Error(`Unsupported export format: ${format}`);
	}

	private generateMarkdownFromState(): string {
		if (!this.currentState) return '';

		let markdown = `# Synapse Canvas\n\n`;
		markdown += `Created: ${this.currentState.metadata.created.toISOString()}\n`;
		markdown += `Modified: ${this.currentState.metadata.modified.toISOString()}\n\n`;

		markdown += `## Blocks\n\n`;
		this.currentState.blocks.forEach(block => {
			markdown += `### ${block.config.name}\n`;
			markdown += `- **ID**: ${block.id}\n`;
			markdown += `- **Description**: ${block.config.description}\n`;
			markdown += `- **Position**: (${block.position.x}, ${block.position.y})\n`;
			markdown += `- **Settings**:\n`;
			
			Object.entries(block.settings).forEach(([key, value]) => {
				markdown += `  - ${key}: ${value}\n`;
			});
			markdown += `\n`;
		});

		if (this.currentState.connections.length > 0) {
			markdown += `## Connections\n\n`;
			this.currentState.connections.forEach(conn => {
				markdown += `- ${conn.fromBlock} → ${conn.toBlock}\n`;
			});
		}

		return markdown;
	}

	public async importCanvas(content: string, format: 'json' | 'markdown' = 'json'): Promise<void> {
		if (format === 'json') {
			const state = JSON.parse(content) as CanvasState;
			this.currentState = state;
		} else if (format === 'markdown') {
			// Parse markdown and convert to state
			// This is a simplified implementation
			this.currentState = this.createNewState();
		} else {
			throw new Error(`Unsupported import format: ${format}`);
		}
	}
}