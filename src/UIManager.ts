import { App, Modal, Notice } from 'obsidian';
import { SynapsePlugin } from '../main';
import { BlockConfig } from './BlockManager';

export class UIManager {
	private plugin: SynapsePlugin;
	private canvasModal: CanvasModal | null = null;

	constructor(plugin: SynapsePlugin) {
		this.plugin = plugin;
	}

	public openCanvas(): void {
		if (this.canvasModal) {
			this.canvasModal.close();
		}
		this.canvasModal = new CanvasModal(this.plugin.app, this.plugin);
		this.canvasModal.open();
	}

	public closeCanvas(): void {
		if (this.canvasModal) {
			this.canvasModal.close();
			this.canvasModal = null;
		}
	}
}

class CanvasModal extends Modal {
	private plugin: SynapsePlugin;
	private canvas: HTMLElement;
	private blocks: Map<string, HTMLElement> = new Map();

	constructor(app: App, plugin: SynapsePlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		// Create canvas header
		const header = contentEl.createDiv('canvas-header');
		header.createEl('h2', { text: 'Synapse Canvas' });

		// Create toolbar
		const toolbar = header.createDiv('canvas-toolbar');
		const addBlockButton = toolbar.createEl('button', { text: 'Add Block' });
		addBlockButton.onclick = () => this.showBlockSelector();

		// Create canvas area
		this.canvas = contentEl.createDiv('canvas-area');
		this.canvas.style.cssText = `
			width: 100%;
			height: 500px;
			border: 2px dashed #ccc;
			position: relative;
			background: #f9f9f9;
			overflow: hidden;
		`;

		// Add click handler to canvas
		this.canvas.onclick = (e) => {
			if (e.target === this.canvas) {
				this.deselectAllBlocks();
			}
		};

		// Load existing blocks
		this.loadExistingBlocks();
	}

	private showBlockSelector(): void {
		new BlockSelectorModal(this.plugin.app, this.plugin, (blockConfig) => {
			this.addBlockToCanvas(blockConfig);
		}).open();
	}

	private addBlockToCanvas(blockConfig: BlockConfig): void {
		const blockElement = this.createBlockElement(blockConfig);
		this.canvas.appendChild(blockElement);
		this.blocks.set(blockConfig.id, blockElement);
	}

	private createBlockElement(blockConfig: BlockConfig): HTMLElement {
		const blockDiv = document.createElement('div');
		blockDiv.className = 'synapse-block';
		blockDiv.style.cssText = `
			position: absolute;
			width: 200px;
			height: 150px;
			border: 2px solid #007acc;
			border-radius: 8px;
			background: white;
			padding: 10px;
			cursor: move;
			box-shadow: 0 2px 4px rgba(0,0,0,0.1);
		`;

		// Block header
		const header = blockDiv.createDiv('block-header');
		header.createEl('h4', { text: blockConfig.name });
		header.style.cssText = 'margin: 0 0 10px 0; font-size: 14px; font-weight: bold;';

		// Block description
		const description = blockDiv.createDiv('block-description');
		description.createEl('p', { text: blockConfig.description });
		description.style.cssText = 'margin: 0 0 10px 0; font-size: 12px; color: #666;';

		// Block actions
		const actions = blockDiv.createDiv('block-actions');
		actions.style.cssText = 'display: flex; gap: 5px;';

		const configureBtn = actions.createEl('button', { text: 'Configure' });
		configureBtn.style.cssText = 'font-size: 10px; padding: 2px 6px;';
		configureBtn.onclick = (e) => {
			e.stopPropagation();
			this.configureBlock(blockConfig);
		};

		const deleteBtn = actions.createEl('button', { text: 'Delete' });
		deleteBtn.style.cssText = 'font-size: 10px; padding: 2px 6px; background: #ff4444; color: white; border: none;';
		deleteBtn.onclick = (e) => {
			e.stopPropagation();
			this.deleteBlock(blockDiv, blockConfig.id);
		};

		// Make block draggable
		this.makeDraggable(blockDiv);

		// Add click handler for selection
		blockDiv.onclick = (e) => {
			e.stopPropagation();
			this.selectBlock(blockDiv);
		};

		return blockDiv;
	}

	private makeDraggable(element: HTMLElement): void {
		let isDragging = false;
		let startX = 0;
		let startY = 0;
		let initialX = 0;
		let initialY = 0;

		element.onmousedown = (e) => {
			isDragging = true;
			startX = e.clientX;
			startY = e.clientY;
			
			const rect = element.getBoundingClientRect();
			initialX = rect.left;
			initialY = rect.top;

			document.onmousemove = (e) => {
				if (!isDragging) return;
				
				const deltaX = e.clientX - startX;
				const deltaY = e.clientY - startY;
				
				element.style.left = `${initialX + deltaX}px`;
				element.style.top = `${initialY + deltaY}px`;
			};

			document.onmouseup = () => {
				isDragging = false;
				document.onmousemove = null;
				document.onmouseup = null;
			};
		};
	}

	private selectBlock(blockElement: HTMLElement): void {
		this.deselectAllBlocks();
		blockElement.style.borderColor = '#ff6b35';
		blockElement.style.boxShadow = '0 0 10px rgba(255, 107, 53, 0.5)';
	}

	private deselectAllBlocks(): void {
		this.blocks.forEach(block => {
			block.style.borderColor = '#007acc';
			block.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
		});
	}

	private configureBlock(blockConfig: BlockConfig): void {
		new BlockConfigModal(this.plugin.app, this.plugin, blockConfig.id).open();
	}

	private deleteBlock(blockElement: HTMLElement, blockId: string): void {
		blockElement.remove();
		this.blocks.delete(blockId);
	}

	private loadExistingBlocks(): void {
		// This would load existing blocks from saved state
		// For now, we'll just show a placeholder
		const placeholder = this.canvas.createDiv('canvas-placeholder');
		placeholder.createEl('p', { text: 'Click "Add Block" to get started' });
		placeholder.style.cssText = `
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			color: #999;
			font-size: 16px;
		`;
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class BlockSelectorModal extends Modal {
	private plugin: SynapsePlugin;
	private onSelect: (blockConfig: BlockConfig) => void;

	constructor(app: App, plugin: SynapsePlugin, onSelect: (blockConfig: BlockConfig) => void) {
		super(app);
		this.plugin = plugin;
		this.onSelect = onSelect;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Select a Block' });

		const blocks = this.plugin.blockManager.getAllBlocks();
		
		blocks.forEach(block => {
			const blockDiv = contentEl.createDiv('block-option');
			blockDiv.style.cssText = `
				border: 1px solid #ddd;
				border-radius: 4px;
				padding: 10px;
				margin: 5px 0;
				cursor: pointer;
				transition: background-color 0.2s;
			`;

			blockDiv.onmouseover = () => {
				blockDiv.style.backgroundColor = '#f0f0f0';
			};
			blockDiv.onmouseout = () => {
				blockDiv.style.backgroundColor = 'white';
			};

			blockDiv.createEl('h4', { text: block.name });
			blockDiv.createEl('p', { text: block.description });
			blockDiv.createEl('small', { text: `Category: ${block.category}` });

			blockDiv.onclick = () => {
				this.onSelect(block);
				this.close();
			};
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class BlockConfigModal extends Modal {
	private plugin: SynapsePlugin;
	private blockId: string;
	private settings: { [key: string]: any } = {};

	constructor(app: App, plugin: SynapsePlugin, blockId: string) {
		super(app);
		this.plugin = plugin;
		this.blockId = blockId;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Configure Block' });

		const blockConfig = this.plugin.blockManager.getBlockConfig(this.blockId);
		if (!blockConfig) {
			contentEl.createEl('p', { text: 'Block configuration not found.' });
			return;
		}

		contentEl.createEl('h3', { text: blockConfig.name });
		contentEl.createEl('p', { text: blockConfig.description });

		// Create settings for each block setting
		blockConfig.settings.forEach(setting => {
			this.createSettingControl(contentEl, setting);
		});

		// Add save button
		const buttonContainer = contentEl.createDiv();
		const saveBtn = buttonContainer.createEl('button', { text: 'Save Configuration' });
		saveBtn.style.cssText = 'margin-right: 10px; padding: 8px 16px; background: #007acc; color: white; border: none; border-radius: 4px;';
		saveBtn.onclick = async () => {
			await this.saveConfiguration();
			this.close();
		};

		const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelBtn.style.cssText = 'padding: 8px 16px; background: #666; color: white; border: none; border-radius: 4px;';
		cancelBtn.onclick = () => {
			this.close();
		};
	}

	private createSettingControl(container: HTMLElement, setting: any): void {
		const settingContainer = container.createDiv('setting-item');
		settingContainer.style.cssText = 'margin: 15px 0;';
		
		const label = settingContainer.createEl('label', { text: setting.name });
		label.style.cssText = 'display: block; margin-bottom: 5px; font-weight: bold;';
		
		const description = settingContainer.createEl('small', { text: setting.description });
		description.style.cssText = 'display: block; margin-bottom: 5px; color: #666;';

		if (setting.type === 'textarea') {
			const textarea = settingContainer.createEl('textarea');
			textarea.style.cssText = 'width: 100%; height: 100px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; resize: vertical;';
			textarea.placeholder = `Enter ${setting.name.toLowerCase()}`;
			textarea.value = this.settings[setting.name] || setting.default || '';
			textarea.onchange = (e) => {
				this.settings[setting.name] = (e.target as HTMLTextAreaElement).value;
			};
		} else {
			const input = settingContainer.createEl('input');
			input.type = setting.type === 'toggle' ? 'checkbox' : 'text';
			input.style.cssText = 'width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;';
			input.placeholder = `Enter ${setting.name.toLowerCase()}`;
			
			if (setting.type === 'toggle') {
				input.checked = this.settings[setting.name] || setting.default || false;
				input.onchange = (e) => {
					this.settings[setting.name] = (e.target as HTMLInputElement).checked;
				};
			} else {
				input.value = this.settings[setting.name] || setting.default || '';
				input.onchange = (e) => {
					this.settings[setting.name] = (e.target as HTMLInputElement).value;
				};
			}
		}
	}

	private async saveConfiguration(): Promise<void> {
		try {
			// Save the configuration to plugin settings
			const configKey = `block_${this.blockId}_config`;
			this.plugin.settings[configKey] = this.settings;
			await this.plugin.saveSettings();
			
			new Notice('Configuration saved successfully!');
		} catch (error) {
			console.error('Error saving configuration:', error);
			new Notice('Error saving configuration. Please try again.');
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}