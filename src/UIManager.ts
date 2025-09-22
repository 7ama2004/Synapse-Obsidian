import { App, Notice, TFile, Menu, Editor, MarkdownView, MenuItem } from 'obsidian';
import { LivingCanvasPlugin } from '../main';
import { BlockDefinition } from './BlockManager';
import { CanvasNode } from './CanvasManager';

export class UIManager {
	private plugin: LivingCanvasPlugin;
	private blockConfigView: BlockConfigView | null = null;
	private selectedNode: CanvasNode | null = null;

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

		// Create Custom Block command
		this.plugin.addCommand({
			id: 'create-custom-block',
			name: 'Create Custom AI Block',
			callback: () => {
				const modal = new CreateCustomBlockModal(this.plugin.app, async (data) => {
					if (!data) return;
					const created = await this.plugin.blockManager.createUserBlock({
						name: data.name,
						description: data.description,
						prompt: data.prompt,
						temperature: data.temperature
					});
					if (created) {
						new Notice(`Created custom block: ${created.id}`);
						await this.plugin.blockManager.reloadBlocks();
					}
				});
				modal.open();
			}
		});

		// Run Block command (always visible; will prompt for a block if none selected)
		this.plugin.addCommand({
			id: 'run-block',
			name: 'Run Selected Block',
			callback: async () => {
				const node = await this.resolveTargetLivingNode();
				if (!node) return;
				await this.plugin.actionHandler.handleRunBlock(node.id);
			}
		});

		// Configure Block command (always visible; will prompt for a block if none selected)
		this.plugin.addCommand({
			id: 'configure-block',
			name: 'Configure Selected Block',
			callback: async () => {
				const node = await this.resolveTargetLivingNode();
				if (!node) return;
				this.showBlockConfigView(node);
			}
		});
	}

	private registerContextMenus(): void {
		// Editor context menu: Ask AI to Clarify
		this.plugin.registerEvent(
			this.plugin.app.workspace.on('editor-menu', (menu: Menu, editor: Editor, view: MarkdownView) => {
				try {
					const selectedText = editor?.getSelection?.() || '';
					if (typeof selectedText === 'string' && selectedText.trim().length > 0) {
						menu.addItem((item: MenuItem) => {
							item
								.setTitle('Ask AI to Clarify')
								.setIcon('help')
								.onClick(async () => {
									await this.plugin.actionHandler.handleClarifyText(selectedText);
								});
						});
					}
				} catch (e) {
					this.plugin.debug('Error registering editor-menu item', e);
				}
			})
		);

		this.plugin.debug('Context menus registered');
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
			// Track currently selected living canvas node
			this.selectedNode = node;
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
		console.log(`[Living Canvas] Starting insertBlock for blockId: ${blockId}`);
		
		const blockDefinition = this.plugin.blockManager.getBlock(blockId);
		if (!blockDefinition) {
			console.error(`[Living Canvas] Block definition not found for blockId: ${blockId}`);
			new Notice(`Block '${blockId}' not found`);
			return;
		}
		console.log(`[Living Canvas] Block definition found:`, blockDefinition);

		const canvasFile = this.getCurrentCanvasView();
		if (!canvasFile) {
			console.error(`[Living Canvas] No canvas file detected`);
			new Notice('No canvas file is currently open');
			return;
		}
		console.log(`[Living Canvas] Canvas file detected: ${canvasFile.path}`);

		// Ensure the canvas manager knows about the current canvas
		this.plugin.canvasManager.setCurrentCanvas(canvasFile);
		console.log(`[Living Canvas] Canvas manager updated with current canvas`);

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
		console.log(`[Living Canvas] Block node created:`, blockNode);

		console.log(`[Living Canvas] Calling createNode...`);
		const nodeId = await this.plugin.canvasManager.createNode(blockNode, canvasFile);
		console.log(`[Living Canvas] createNode returned nodeId:`, nodeId);
		
		if (nodeId) {
			console.log(`[Living Canvas] Successfully inserted block with nodeId: ${nodeId}`);
			new Notice(`Inserted ${blockDefinition.name} block`);
		} else {
			console.error(`[Living Canvas] Failed to create node`);
			new Notice('Failed to insert block');
		}
	}

	private getDefaultConfig(blockDefinition: BlockDefinition): Record<string, unknown> {
		const config: Record<string, unknown> = {};
		
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

	private getCurrentCanvasView(): TFile | null {
		const activeLeaf = this.plugin.app.workspace.activeLeaf;
		if (activeLeaf && activeLeaf.view.getViewType() === 'canvas') {
			return (activeLeaf.view as unknown as { file: TFile }).file;
		}
		return null;
	}

	private getSelectedLivingCanvasNode(): CanvasNode | null {
		return this.selectedNode;
	}

	// Resolve a target living-canvas node: use selection if available, otherwise prompt user to choose
	private async resolveTargetLivingNode(): Promise<CanvasNode | null> {
		const selected = this.getSelectedLivingCanvasNode();
		if (selected && selected.livingCanvas) return selected;

		const canvasFile = this.getCurrentCanvasView();
		if (!canvasFile) {
			new Notice('No canvas file is currently open');
			return null;
		}

		const nodes = await this.plugin.canvasManager.getLivingCanvasNodes(canvasFile);
		if (nodes.length === 0) {
			new Notice('No Living Canvas blocks found on this canvas');
			return null;
		}

		return await new Promise<CanvasNode | null>((resolve) => {
			const modal = new NodePickModal(this.plugin.app, nodes, (node) => resolve(node));
			modal.open();
		});
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

// Modal to pick a Living Canvas node when none is selected
class NodePickModal {
    private app: App;
    private nodes: CanvasNode[];
    private onPick: (node: CanvasNode | null) => void;
    private modalEl: HTMLElement;

    constructor(app: App, nodes: CanvasNode[], onPick: (node: CanvasNode | null) => void) {
        this.app = app;
        this.nodes = nodes;
        this.onPick = onPick;
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
            min-width: 420px;
            max-width: 640px;
            max-height: 80vh;
            overflow-y: auto;
        `;

        const title = document.createElement('h3');
        title.textContent = 'Choose a Living Canvas block';
        title.style.marginTop = '0';

        const list = document.createElement('div');
        list.style.display = 'flex';
        list.style.flexDirection = 'column';
        list.style.gap = '8px';
        for (const n of this.nodes) {
            const row = document.createElement('button');
            row.style.textAlign = 'left';
            row.style.padding = '8px';
            row.style.border = '1px solid var(--background-modifier-border)';
            row.style.borderRadius = '6px';
            row.textContent = `${n.text || ''} (${n.livingCanvas?.blockType || ''})`;
            row.onclick = () => {
                this.close();
                this.onPick(n);
            };
            list.appendChild(row);
        }

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = () => {
            this.close();
            this.onPick(null);
        };

        content.appendChild(title);
        content.appendChild(list);
        content.appendChild(cancelBtn);
        this.modalEl.appendChild(content);
        document.body.appendChild(this.modalEl);

        this.modalEl.onclick = (e) => {
            if (e.target === this.modalEl) {
                cancelBtn.click();
            }
        };
    }

    private close(): void {
        if (this.modalEl && this.modalEl.parentNode) {
            this.modalEl.parentNode.removeChild(this.modalEl);
        }
    }
}

// Modal to create a new custom AI block
class CreateCustomBlockModal {
    private app: App;
    private onDone: (data: { name: string; description: string; prompt: string; temperature?: number } | null) => void;
    private modalEl: HTMLElement;
    private nameInput: HTMLInputElement;
    private descInput: HTMLInputElement;
    private promptInput: HTMLTextAreaElement;
    private tempInput: HTMLInputElement;

    constructor(app: App, onDone: (data: { name: string; description: string; prompt: string; temperature?: number } | null) => void) {
        this.app = app;
        this.onDone = onDone;
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
            min-width: 560px;
            max-width: 800px;
            max-height: 80vh;
            overflow-y: auto;
        `;

        const title = document.createElement('h3');
        title.textContent = 'Create Custom AI Block';
        title.style.marginTop = '0';

        const form = document.createElement('div');
        form.style.display = 'flex';
        form.style.flexDirection = 'column';
        form.style.gap = '12px';

        this.nameInput = document.createElement('input');
        this.nameInput.type = 'text';
        this.nameInput.placeholder = 'Block name (e.g., My Research Helper)';

        this.descInput = document.createElement('input');
        this.descInput.type = 'text';
        this.descInput.placeholder = 'Short description';

        this.promptInput = document.createElement('textarea');
        this.promptInput.rows = 10;
        this.promptInput.placeholder = 'Write your prompt here. Use {{ input }} to insert connected text.';

        this.tempInput = document.createElement('input');
        this.tempInput.type = 'number';
        this.tempInput.step = '0.1';
        this.tempInput.min = '0';
        this.tempInput.max = '1';
        this.tempInput.placeholder = 'Temperature (optional)';

        form.appendChild(this.nameInput);
        form.appendChild(this.descInput);
        form.appendChild(this.promptInput);
        form.appendChild(this.tempInput);

        const buttons = document.createElement('div');
        buttons.style.display = 'flex';
        buttons.style.gap = '8px';
        buttons.style.marginTop = '12px';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = () => { this.close(); this.onDone(null); };

        const createBtn = document.createElement('button');
        createBtn.textContent = 'Create Block';
        createBtn.onclick = () => {
            const name = (this.nameInput.value || '').trim();
            const description = (this.descInput.value || '').trim();
            const prompt = (this.promptInput.value || '').trim();
            const temperature = this.tempInput.value ? Number(this.tempInput.value) : undefined;
            if (!name || !prompt) return;
            this.close();
            this.onDone({ name, description, prompt, temperature });
        };

        buttons.appendChild(cancelBtn);
        buttons.appendChild(createBtn);

        content.appendChild(title);
        content.appendChild(form);
        content.appendChild(buttons);
        this.modalEl.appendChild(content);
        document.body.appendChild(this.modalEl);

        this.modalEl.onclick = (e) => {
            if (e.target === this.modalEl) cancelBtn.click();
        };
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
	private modalEl: HTMLElement;
	private viewEl: HTMLElement;

	constructor(app: App, plugin: LivingCanvasPlugin, node: CanvasNode, blockDefinition: BlockDefinition) {
		this.app = app;
		this.plugin = plugin;
		this.node = node;
		this.blockDefinition = blockDefinition;
	}

	open(): void {
		// Create overlay modal
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

		// Modal content
		this.viewEl = document.createElement('div');
		this.viewEl.className = 'living-canvas-config-view';
		this.viewEl.style.cssText = `
			padding: 20px;
			min-width: 520px;
			max-width: 720px;
			max-height: 80vh;
			overflow-y: auto;
			background: var(--background-primary);
			border-radius: 8px;
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

			// Set a stable name attribute for saving
			if ((input as HTMLElement).setAttribute) {
				(input as HTMLElement).setAttribute('name', setting.name);
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

		// If this is the custom prompt block, add saved prompts UI
		if (this.blockDefinition.id === 'core/custom-prompt') {
			const savedHeader = document.createElement('h4');
			savedHeader.textContent = 'Saved prompts';
			savedHeader.style.margin = '16px 0 8px 0';

			const savedList = document.createElement('div');
			savedList.style.display = 'flex';
			savedList.style.flexDirection = 'column';
			savedList.style.gap = '6px';

			const refreshSaved = () => {
				savedList.empty?.();
				const prompts = this.plugin.settings.savedPrompts || [];
				for (const p of prompts) {
					const row = document.createElement('div');
					row.style.display = 'flex';
					row.style.alignItems = 'center';
					row.style.gap = '8px';

					const nameEl = document.createElement('span');
					nameEl.textContent = p.name;
					nameEl.style.flex = '0 0 auto';

					const applyBtn = document.createElement('button');
					applyBtn.textContent = 'Use';
					applyBtn.onclick = () => {
						const promptInput = form.querySelector('[name="prompt"]') as HTMLTextAreaElement | null;
						if (promptInput) promptInput.value = p.content;
					};

					const deleteBtn = document.createElement('button');
					deleteBtn.textContent = 'Delete';
					deleteBtn.onclick = async () => {
						const next = (this.plugin.settings.savedPrompts || []).filter(sp => sp.name !== p.name);
						this.plugin.settings.savedPrompts = next;
						await this.plugin.saveSettings();
						refreshSaved();
					};

					row.appendChild(nameEl);
					row.appendChild(applyBtn);
					row.appendChild(deleteBtn);
					savedList.appendChild(row);
				}
			};

			refreshSaved();

			const saveRow = document.createElement('div');
			saveRow.style.display = 'flex';
			saveRow.style.gap = '8px';
			saveRow.style.marginTop = '8px';

			const nameInput = document.createElement('input');
			nameInput.type = 'text';
			nameInput.placeholder = 'Name this prompt';
			nameInput.style.flex = '1 1 auto';

			const savePromptBtn = document.createElement('button');
			savePromptBtn.textContent = 'Save current prompt';
			savePromptBtn.onclick = async () => {
				const promptInput = form.querySelector('[name="prompt"]') as HTMLTextAreaElement | null;
				const name = nameInput.value.trim();
				if (!promptInput || !promptInput.value.trim() || !name) return;
				const prompts = this.plugin.settings.savedPrompts || [];
				const filtered = prompts.filter(p => p.name !== name);
				filtered.push({ name, content: promptInput.value });
				this.plugin.settings.savedPrompts = filtered;
				await this.plugin.saveSettings();
				nameInput.value = '';
				refreshSaved();
			};

			saveRow.appendChild(nameInput);
			saveRow.appendChild(savePromptBtn);

			this.viewEl.appendChild(savedHeader);
			this.viewEl.appendChild(savedList);
			this.viewEl.appendChild(saveRow);

			// Add a button to save current config as a reusable community block
			const saveAsBlockBtn = document.createElement('button');
			saveAsBlockBtn.textContent = 'Save as new block';
			saveAsBlockBtn.onclick = async () => {
				const promptInput = form.querySelector('[name="prompt"]') as HTMLTextAreaElement | null;
				const tempInput = form.querySelector('[name="temperature"]') as HTMLInputElement | null;
				const creator = new CreateCustomBlockModal(this.plugin.app, async (data) => {
					if (!data) return;
					const finalPrompt = (promptInput?.value?.trim() || data.prompt || '').trim();
					const finalTemp = tempInput?.value ? Number(tempInput.value) : data.temperature;
					const created = await this.plugin.blockManager.createUserBlock({
						name: data.name,
						description: data.description,
						prompt: finalPrompt,
						temperature: finalTemp
					});
					if (created) {
						new Notice(`Created custom block: ${created.id}`);
						await this.plugin.blockManager.reloadBlocks();
					}
				});
				creator.open();
			};

			this.viewEl.appendChild(saveAsBlockBtn);
		}

		this.viewEl.appendChild(buttonContainer);

		this.modalEl.appendChild(this.viewEl);
		document.body.appendChild(this.modalEl);

		// Close when clicking outside
		this.modalEl.onclick = (e) => {
			if (e.target === this.modalEl) {
				this.cleanup();
			}
		};
	}

	private async saveConfiguration(form: HTMLFormElement): Promise<void> {
		const config: Record<string, unknown> = {};
		const inputs = form.querySelectorAll('input, textarea, select');

		for (const input of Array.from(inputs)) {
			const element = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
			const name = element.getAttribute('name') || (element.previousElementSibling as HTMLElement)?.innerText?.toLowerCase().replace(/\s+/g, '_');
			
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
		if (canvasFile && this.node.livingCanvas) {
			await this.plugin.canvasManager.updateNodeData(this.node.id, {
				livingCanvas: {
					...this.node.livingCanvas,
					config: config
				}
			}, canvasFile);

			new Notice('Configuration saved successfully');
			this.cleanup();
		}
	}

	cleanup(): void {
		if (this.modalEl && this.modalEl.parentNode) {
			this.modalEl.parentNode.removeChild(this.modalEl);
		}
	}
}
