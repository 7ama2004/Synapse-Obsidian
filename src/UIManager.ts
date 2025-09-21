import { App, Menu, Notice, TFile, WorkspaceLeaf } from 'obsidian';
import { LivingCanvasPlugin } from '../main';
import { BlockDefinition } from './BlockManager';
import { CanvasNode } from './CanvasManager';

export class UIManager {
	private plugin: LivingCanvasPlugin;
	private blockConfigView: BlockConfigView | null = null;

	constructor(plugin: LivingCanvasPlugin) {
		this.plugin = plugin;
	}

	async initialize(): Promise<void> {
		this.plugin.debug('Initializing UIManager');
		
		// Add commands
		this.addCommands();
		
		// Register context menus
		this.registerContextMenus();
		
		// Register canvas click handler
		this.registerCanvasClickHandler();
	}

	cleanup(): void {
		this.plugin.debug('Cleaning up UIManager');
		
		// Clean up any open views
		if (this.blockConfigView) {
			this.blockConfigView.cleanup();
		}
	}

	private addCommands(): void {
		// Insert Block command
		this.plugin.addCommand({
			id: 'insert-block',
			name: 'Insert Living Canvas Block',
			checkCallback: (checking: boolean) => {
				const canvasView = this.getCurrentCanvasView();
				if (canvasView) {
					if (!checking) {
						this.showBlockSelectionModal();
					}
					return true;
				}
				return false;
			}
		});

		// Run Block command (for selected block)
		this.plugin.addCommand({
			id: 'run-block',
			name: 'Run Selected Block',
			checkCallback: (checking: boolean) => {
				const selectedNode = this.getSelectedLivingCanvasNode();
				if (selectedNode) {
					if (!checking) {
						this.plugin.actionHandler.handleRunBlock(selectedNode.id);
					}
					return true;
				}
				return false;
			}
		});

		// Configure Block command
		this.plugin.addCommand({
			id: 'configure-block',
			name: 'Configure Selected Block',
			checkCallback: (checking: boolean) => {
				const selectedNode = this.getSelectedLivingCanvasNode();
				if (selectedNode) {
					if (!checking) {
						this.showBlockConfigView(selectedNode);
					}
					return true;
				}
				return false;
			}
		});
	}

	private registerContextMenus(): void {
		// For now, we'll use commands instead of context menus
		// Context menus can be added later when the proper API is available
		this.plugin.debug('Context menus registered (using commands instead)');
	}

	private registerCanvasClickHandler(): void {
		// Register click handler for canvas nodes
		this.plugin.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			const target = evt.target as HTMLElement;
			const canvasNode = target.closest('.canvas-node');
			
			if (canvasNode) {
				const nodeId = canvasNode.getAttribute('data-id');
				if (nodeId) {
					this.handleCanvasNodeClick(nodeId, evt);
				}
			}
		});
	}

	private async handleCanvasNodeClick(nodeId: string, evt: MouseEvent): Promise<void> {
		const canvasFile = this.plugin.getCurrentCanvasFile();
		if (!canvasFile) return;

		this.plugin.canvasManager.setCurrentCanvas(canvasFile);
		const node = await this.plugin.canvasManager.getNode(nodeId, canvasFile);
		
		if (node && node.livingCanvas) {
			// Double-click to configure
			if (evt.detail === 2) {
				this.showBlockConfigView(node);
			}
		}
	}

	private showBlockSelectionModal(): void {
		const blocks = this.plugin.blockManager.getAllBlocks();
		
		if (blocks.length === 0) {
			new Notice('No blocks available. Please check your blocks directory.');
			return;
		}

		const modal = new BlockSelectionModal(this.plugin.app, blocks, (blockId) => {
			if (blockId) {
				this.insertBlock(blockId);
			}
		});
		modal.open();
	}

	private async insertBlock(blockId: string): Promise<void> {
		const blockDefinition = this.plugin.blockManager.getBlock(blockId);
		if (!blockDefinition) {
			new Notice(`Block '${blockId}' not found`);
			return;
		}

		const canvasFile = this.plugin.getCurrentCanvasFile();
		if (!canvasFile) {
			new Notice('No canvas file is currently open');
			return;
		}

		this.plugin.canvasManager.setCurrentCanvas(canvasFile);

		// Create the block node
		const blockNode = {
			type: 'text',
			text: `📝 ${blockDefinition.name}`,
			x: 100,
			y: 100,
			width: 250,
			height: 60,
			livingCanvas: {
				blockType: blockId,
				status: 'idle' as const,
				config: this.getDefaultConfig(blockDefinition)
			}
		};

		const nodeId = await this.plugin.canvasManager.createNode(blockNode, canvasFile);
		if (nodeId) {
			new Notice(`Inserted ${blockDefinition.name} block`);
		} else {
			new Notice('Failed to insert block');
		}
	}

	private getDefaultConfig(blockDefinition: BlockDefinition): any {
		const config: any = {};
		
		for (const setting of blockDefinition.settings) {
			if (setting.default !== undefined) {
				config[setting.name] = setting.default;
			}
		}
		
		return config;
	}

	private showBlockConfigView(node: CanvasNode): void {
		if (!node.livingCanvas) return;

		const blockDefinition = this.plugin.blockManager.getBlock(node.livingCanvas.blockType);
		if (!blockDefinition) {
			new Notice(`Block definition not found for ${node.livingCanvas.blockType}`);
			return;
		}

		// Clean up existing view
		if (this.blockConfigView) {
			this.blockConfigView.cleanup();
		}

		// Create new view
		this.blockConfigView = new BlockConfigView(
			this.plugin.app,
			this.plugin,
			node,
			blockDefinition
		);
		this.blockConfigView.open();
	}

	private async resetBlock(node: CanvasNode): Promise<void> {
		if (!node.livingCanvas) return;

		const canvasFile = this.plugin.getCurrentCanvasFile();
		if (!canvasFile) return;

		await this.plugin.canvasManager.updateNodeData(node.id, {
			livingCanvas: {
				...node.livingCanvas,
				status: 'idle',
				error: undefined
			}
		}, canvasFile);

		new Notice('Block reset successfully');
	}

	private getCurrentCanvasView(): any {
		const activeLeaf = this.plugin.app.workspace.activeLeaf;
		if (activeLeaf && activeLeaf.view.getViewType() === 'canvas') {
			return activeLeaf.view;
		}
		return null;
	}

	private getSelectedLivingCanvasNode(): CanvasNode | null {
		// This is a simplified implementation
		// In a real implementation, you'd need to track the currently selected node
		// For now, we'll return null and rely on context menus
		return null;
	}
}

// Block Selection Modal
class BlockSelectionModal {
	private app: App;
	private blocks: BlockDefinition[];
	private onSelect: (blockId: string | null) => void;
	private modalEl: HTMLElement;

	constructor(app: App, blocks: BlockDefinition[], onSelect: (blockId: string | null) => void) {
		this.app = app;
		this.blocks = blocks;
		this.onSelect = onSelect;
	}

	open(): void {
		this.modalEl = document.createElement('div');
		this.modalEl.className = 'modal';
		this.modalEl.style.cssText = `
			position: fixed;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			background: rgba(0, 0, 0, 0.5);
			display: flex;
			align-items: center;
			justify-content: center;
			z-index: 1000;
		`;

		const content = document.createElement('div');
		content.style.cssText = `
			background: var(--background-primary);
			padding: 20px;
			border-radius: 8px;
			min-width: 500px;
			max-width: 700px;
			max-height: 80vh;
			overflow-y: auto;
		`;

		const title = document.createElement('h3');
		title.textContent = 'Select a Block to Insert';
		title.style.marginTop = '0';

		const blocksContainer = document.createElement('div');
		blocksContainer.style.cssText = `
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
			gap: 12px;
			margin: 16px 0;
		`;

		// Group blocks by category
		const coreBlocks = this.blocks.filter(b => b.category === 'core');
		const communityBlocks = this.blocks.filter(b => b.category === 'community');

		if (coreBlocks.length > 0) {
			const coreSection = this.createBlockSection('Core Blocks', coreBlocks);
			blocksContainer.appendChild(coreSection);
		}

		if (communityBlocks.length > 0) {
			const communitySection = this.createBlockSection('Community Blocks', communityBlocks);
			blocksContainer.appendChild(communitySection);
		}

		const cancelBtn = document.createElement('button');
		cancelBtn.textContent = 'Cancel';
		cancelBtn.onclick = () => {
			this.close();
			this.onSelect(null);
		};

		content.appendChild(title);
		content.appendChild(blocksContainer);
		content.appendChild(cancelBtn);

		this.modalEl.appendChild(content);
		document.body.appendChild(this.modalEl);

		// Handle clicking outside modal
		this.modalEl.onclick = (e) => {
			if (e.target === this.modalEl) {
				cancelBtn.click();
			}
		};
	}

	private createBlockSection(title: string, blocks: BlockDefinition[]): HTMLElement {
		const section = document.createElement('div');
		
		const sectionTitle = document.createElement('h4');
		sectionTitle.textContent = title;
		sectionTitle.style.marginBottom = '8px';
		sectionTitle.style.color = 'var(--text-muted)';

		const blocksGrid = document.createElement('div');
		blocksGrid.style.cssText = `
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
			gap: 8px;
			margin-bottom: 16px;
		`;

		for (const block of blocks) {
			const blockCard = document.createElement('div');
			blockCard.style.cssText = `
				padding: 12px;
				border: 1px solid var(--background-modifier-border);
				border-radius: 6px;
				cursor: pointer;
				transition: background-color 0.2s;
			`;

			blockCard.onmouseenter = () => {
				blockCard.style.backgroundColor = 'var(--background-modifier-hover)';
			};

			blockCard.onmouseleave = () => {
				blockCard.style.backgroundColor = 'transparent';
			};

			blockCard.onclick = () => {
				this.close();
				this.onSelect(block.id);
			};

			const blockName = document.createElement('div');
			blockName.textContent = block.name;
			blockName.style.fontWeight = 'bold';
			blockName.style.marginBottom = '4px';

			const blockDesc = document.createElement('div');
			blockDesc.textContent = block.description;
			blockDesc.style.fontSize = '0.9em';
			blockDesc.style.color = 'var(--text-muted)';

			blockCard.appendChild(blockName);
			blockCard.appendChild(blockDesc);
			blocksGrid.appendChild(blockCard);
		}

		section.appendChild(sectionTitle);
		section.appendChild(blocksGrid);

		return section;
	}

	private close(): void {
		if (this.modalEl && this.modalEl.parentNode) {
			this.modalEl.parentNode.removeChild(this.modalEl);
		}
	}
}

// Block Configuration View
class BlockConfigView {
	private app: App;
	private plugin: LivingCanvasPlugin;
	private node: CanvasNode;
	private blockDefinition: BlockDefinition;
	private viewEl: HTMLElement;

	constructor(app: App, plugin: LivingCanvasPlugin, node: CanvasNode, blockDefinition: BlockDefinition) {
		this.app = app;
		this.plugin = plugin;
		this.node = node;
		this.blockDefinition = blockDefinition;
	}

	open(): void {
		// Create a sidebar view for configuration
		this.viewEl = document.createElement('div');
		this.viewEl.className = 'living-canvas-config-view';
		this.viewEl.style.cssText = `
			padding: 20px;
			height: 100%;
			overflow-y: auto;
		`;

		const title = document.createElement('h3');
		title.textContent = `Configure ${this.blockDefinition.name}`;
		title.style.marginTop = '0';

		const form = document.createElement('form');
		form.style.cssText = `
			display: flex;
			flex-direction: column;
			gap: 16px;
		`;

		// Create form fields based on block settings
		for (const setting of this.blockDefinition.settings) {
			const fieldContainer = document.createElement('div');
			
			const label = document.createElement('label');
			label.textContent = setting.description;
			label.style.display = 'block';
			label.style.marginBottom = '4px';
			label.style.fontWeight = '500';

			let input: HTMLElement;

			switch (setting.type) {
				case 'text':
					input = document.createElement('input');
					(input as HTMLInputElement).type = 'text';
					(input as HTMLInputElement).value = this.node.livingCanvas?.config[setting.name] || setting.default || '';
					break;

				case 'textarea':
					input = document.createElement('textarea');
					(input as HTMLTextAreaElement).value = this.node.livingCanvas?.config[setting.name] || setting.default || '';
					(input as HTMLTextAreaElement).rows = 4;
					break;

				case 'dropdown':
					input = document.createElement('select');
					for (const [value, label] of Object.entries(setting.options || {})) {
						const option = document.createElement('option');
						option.value = value;
						option.textContent = label;
						(input as HTMLSelectElement).appendChild(option);
					}
					(input as HTMLSelectElement).value = this.node.livingCanvas?.config[setting.name] || setting.default || '';
					break;

				case 'number':
					input = document.createElement('input');
					(input as HTMLInputElement).type = 'number';
					(input as HTMLInputElement).value = this.node.livingCanvas?.config[setting.name] || setting.default || '';
					break;

				case 'boolean':
					input = document.createElement('input');
					(input as HTMLInputElement).type = 'checkbox';
					(input as HTMLInputElement).checked = this.node.livingCanvas?.config[setting.name] || setting.default || false;
					break;

				default:
					input = document.createElement('input');
					(input as HTMLInputElement).type = 'text';
			}

			input.style.cssText = `
				width: 100%;
				padding: 8px;
				border: 1px solid var(--background-modifier-border);
				border-radius: 4px;
				background: var(--background-primary);
				color: var(--text-normal);
			`;

			fieldContainer.appendChild(label);
			fieldContainer.appendChild(input);
			form.appendChild(fieldContainer);
		}

		const buttonContainer = document.createElement('div');
		buttonContainer.style.cssText = `
			display: flex;
			gap: 8px;
			margin-top: 20px;
		`;

		const saveBtn = document.createElement('button');
		saveBtn.textContent = 'Save Configuration';
		saveBtn.onclick = () => this.saveConfiguration(form);

		const cancelBtn = document.createElement('button');
		cancelBtn.textContent = 'Cancel';
		cancelBtn.onclick = () => this.cleanup();

		buttonContainer.appendChild(saveBtn);
		buttonContainer.appendChild(cancelBtn);

		this.viewEl.appendChild(title);
		this.viewEl.appendChild(form);
		this.viewEl.appendChild(buttonContainer);

		// Add to sidebar (simplified implementation)
		const sidebar = document.querySelector('.workspace-leaf-content[data-type="file-explorer"]')?.parentElement;
		if (sidebar) {
			sidebar.appendChild(this.viewEl);
		}
	}

	private async saveConfiguration(form: HTMLFormElement): Promise<void> {
		const config: any = {};
		const inputs = form.querySelectorAll('input, textarea, select');

		for (const input of Array.from(inputs)) {
			const element = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
			const name = element.getAttribute('name') || element.previousElementSibling?.textContent?.toLowerCase().replace(/\s+/g, '_');
			
			if (name) {
				if (element.type === 'checkbox') {
					config[name] = (element as HTMLInputElement).checked;
				} else {
					config[name] = element.value;
				}
			}
		}

		// Update the node configuration
		const canvasFile = this.plugin.getCurrentCanvasFile();
		if (canvasFile) {
			await this.plugin.canvasManager.updateNodeData(this.node.id, {
				livingCanvas: {
					...this.node.livingCanvas!,
					config: config
				}
			}, canvasFile);

			new Notice('Configuration saved successfully');
			this.cleanup();
		}
	}

	cleanup(): void {
		if (this.viewEl && this.viewEl.parentNode) {
			this.viewEl.parentNode.removeChild(this.viewEl);
		}
	}
}