import { Plugin, WorkspaceLeaf, ItemView, Setting, Notice, Menu, Editor, MarkdownView, Modal } from 'obsidian';
import { BlockDefinition, BlockSetting } from './BlockManager';
import { CanvasNode } from './CanvasManager';

interface LivingCanvasPlugin extends Plugin {
	blockManager: any;
	canvasManager: any;
	uiManager: any;
	actionHandler: any;
	blockExecutor: any;
	settings: any;
}

export class UIManager {
	private plugin: LivingCanvasPlugin;
	private configView: LivingCanvasConfigView | null = null;

	constructor(plugin: LivingCanvasPlugin) {
		this.plugin = plugin;
	}

	async initialize(): Promise<void> {
		await this.setupCommands();
		await this.setupContextMenus();
		await this.setupRibbonIcon();
	}

	private async setupCommands(): Promise<void> {
		// Command to insert a block
		this.plugin.addCommand({
			id: 'insert-living-canvas-block',
			name: 'Insert Living Canvas Block',
			callback: () => {
				this.showBlockSelectionModal();
			}
		});

		// Command to open configuration panel
		this.plugin.addCommand({
			id: 'open-living-canvas-config',
			name: 'Open Living Canvas Configuration',
			callback: () => {
				this.openConfigView();
			}
		});

		// Command to run the selected block
		this.plugin.addCommand({
			id: 'run-living-canvas-block',
			name: 'Run Living Canvas Block',
			callback: () => {
				this.runSelectedBlock();
			}
		});

		// Command to configure the selected block
		this.plugin.addCommand({
			id: 'configure-living-canvas-block',
			name: 'Configure Living Canvas Block',
			callback: () => {
				this.configureSelectedBlock();
			}
		});
	}

	private async setupContextMenus(): Promise<void> {
		// Canvas context menu for Living Canvas blocks
		// Note: Canvas context menus are handled differently in newer Obsidian versions
		// For now, we'll use commands instead

		// Editor context menu for clarify feature
		this.plugin.registerEvent(
			this.plugin.app.workspace.on('editor-menu', (menu: Menu, editor: Editor, view: MarkdownView) => {
				const selection = editor.getSelection();
				if (selection && selection.trim().length > 0) {
					menu.addItem((item: any) => {
						item.setTitle('Ask AI to Clarify')
							.setIcon('help-circle')
							.onClick(() => {
								this.showClarifyModal(selection, view);
							});
					});
				}
			})
		);
	}

	private async setupRibbonIcon(): Promise<void> {
		const ribbonIconEl = this.plugin.addRibbonIcon('zap', 'Living Canvas', () => {
			this.showBlockSelectionModal();
		});
		ribbonIconEl.addClass('living-canvas-ribbon-class');
	}

	private showBlockSelectionModal(): void {
		if (!this.plugin.canvasManager.isCanvasActive()) {
			new Notice('Please open a canvas file first');
			return;
		}

		const modal = new BlockSelectionModal(this.plugin.app, this.plugin);
		modal.open();
	}

	private openConfigView(): void {
		const existingLeaf = this.plugin.app.workspace.getLeavesOfType('living-canvas-config');
		
		if (existingLeaf.length > 0) {
			this.plugin.app.workspace.revealLeaf(existingLeaf[0]);
		} else {
			const leaf = this.plugin.app.workspace.getRightLeaf(false);
			if (leaf) {
				leaf.setViewState({ type: 'living-canvas-config' });
			}
		}
	}

	private openBlockConfigModal(node: CanvasNode): void {
		const modal = new BlockConfigModal(this.plugin.app, this.plugin, node);
		modal.open();
	}

	private showClarifyModal(selectedText: string, view: MarkdownView): void {
		const modal = new ClarifyModal(this.plugin.app, this.plugin, selectedText, view);
		modal.open();
	}

	private runSelectedBlock(): void {
		if (!this.plugin.canvasManager.isCanvasActive()) {
			new Notice('Please open a canvas file first');
			return;
		}

		// For now, we'll show a modal to select which block to run
		const modal = new BlockRunModal(this.plugin.app, this.plugin);
		modal.open();
	}

	private configureSelectedBlock(): void {
		if (!this.plugin.canvasManager.isCanvasActive()) {
			new Notice('Please open a canvas file first');
			return;
		}

		// For now, we'll show a modal to select which block to configure
		const modal = new BlockConfigureModal(this.plugin.app, this.plugin);
		modal.open();
	}

	cleanup(): void {
		// Cleanup any resources
		if (this.configView) {
			this.configView = null;
		}
	}
}

class BlockSelectionModal extends Modal {
	private plugin: LivingCanvasPlugin;

	constructor(app: any, plugin: LivingCanvasPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Insert Living Canvas Block' });

		const blocks = this.plugin.blockManager.getAllBlocks();
		
		if (blocks.length === 0) {
			contentEl.createEl('p', { text: 'No blocks available. Please check your blocks directory.' });
			return;
		}

		// Group blocks by category
		const categories = new Map<string, BlockDefinition[]>();
		blocks.forEach((block: BlockDefinition) => {
			const category = block.id.split('/')[0] || 'other';
			if (!categories.has(category)) {
				categories.set(category, []);
			}
			categories.get(category)!.push(block);
		});

		// Display blocks by category
		categories.forEach((categoryBlocks, category) => {
			const categoryEl = contentEl.createEl('div', { cls: 'living-canvas-category' });
			categoryEl.createEl('h3', { text: category.charAt(0).toUpperCase() + category.slice(1) });

			categoryBlocks.forEach(block => {
				const blockEl = categoryEl.createEl('div', { cls: 'living-canvas-block-item' });
				blockEl.createEl('div', { cls: 'block-name', text: block.name });
				blockEl.createEl('div', { cls: 'block-description', text: block.description });
				
				blockEl.addEventListener('click', () => {
					this.insertBlock(block);
				});
			});
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	private async insertBlock(block: BlockDefinition): Promise<void> {
		try {
			// Get smart position for new block
			const position = this.plugin.canvasManager.getSmartPosition();
			
			// Create the block node
			const nodeData = {
				type: 'text' as const,
				text: `📝 ${block.name}`,
				x: position.x,
				y: position.y,
				width: 250,
				height: 60,
				livingCanvas: {
					blockType: block.id,
					status: 'idle' as const,
					config: this.getDefaultConfig(block)
				}
			};

			await this.plugin.canvasManager.createNode(nodeData);
			new Notice(`Inserted ${block.name} block`);
			this.close();
		} catch (error) {
			console.error('Living Canvas: Error inserting block:', error);
			new Notice('Failed to insert block');
		}
	}

	private getDefaultConfig(block: BlockDefinition): Record<string, any> {
		const config: Record<string, any> = {};
		block.settings.forEach(setting => {
			if (setting.default !== undefined) {
				config[setting.name] = setting.default;
			}
		});
		return config;
	}
}

class BlockConfigModal extends Modal {
	private plugin: LivingCanvasPlugin;
	private node: CanvasNode;
	private config: Record<string, any>;

	constructor(app: any, plugin: LivingCanvasPlugin, node: CanvasNode) {
		super(app);
		this.plugin = plugin;
		this.node = node;
		this.config = { ...node.livingCanvas?.config || {} };
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Configure Block' });

		const blockDefinition = this.plugin.blockManager.getBlockDefinition(this.node.livingCanvas!.blockType);
		if (!blockDefinition) {
			contentEl.createEl('p', { text: 'Block definition not found' });
			return;
		}

		// Create settings form
		blockDefinition.settings.forEach((setting: BlockSetting) => {
			this.createSettingControl(contentEl, setting);
		});

		// Add save button
		const buttonContainer = contentEl.createEl('div', { cls: 'modal-button-container' });
		buttonContainer.createEl('button', { text: 'Save', cls: 'mod-cta' })
			.addEventListener('click', () => this.saveConfig());
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	private createSettingControl(container: HTMLElement, setting: BlockSetting): void {
		const settingEl = container.createEl('div', { cls: 'setting-item' });
		
		const nameEl = settingEl.createEl('div', { cls: 'setting-item-name' });
		nameEl.setText(setting.name);
		if (setting.required) {
			nameEl.createEl('span', { text: ' *', cls: 'required' });
		}

		const descEl = settingEl.createEl('div', { cls: 'setting-item-description' });
		descEl.setText(setting.description);

		const controlEl = settingEl.createEl('div', { cls: 'setting-item-control' });
		
		switch (setting.type) {
			case 'text':
				this.createTextInput(controlEl, setting);
				break;
			case 'textarea':
				this.createTextareaInput(controlEl, setting);
				break;
			case 'dropdown':
				this.createDropdownInput(controlEl, setting);
				break;
			case 'number':
				this.createNumberInput(controlEl, setting);
				break;
			case 'boolean':
				this.createBooleanInput(controlEl, setting);
				break;
		}
	}

	private createTextInput(container: HTMLElement, setting: BlockSetting): void {
		const input = container.createEl('input', { type: 'text' });
		input.value = this.config[setting.name] || setting.default || '';
		input.addEventListener('change', (e) => {
			this.config[setting.name] = (e.target as HTMLInputElement).value;
		});
	}

	private createTextareaInput(container: HTMLElement, setting: BlockSetting): void {
		const textarea = container.createEl('textarea');
		textarea.value = this.config[setting.name] || setting.default || '';
		textarea.addEventListener('change', (e) => {
			this.config[setting.name] = (e.target as HTMLTextAreaElement).value;
		});
	}

	private createDropdownInput(container: HTMLElement, setting: BlockSetting): void {
		const select = container.createEl('select');
		setting.options?.forEach(option => {
			const optionEl = select.createEl('option', { value: option, text: option });
			if (option === (this.config[setting.name] || setting.default)) {
				optionEl.selected = true;
			}
		});
		select.addEventListener('change', (e) => {
			this.config[setting.name] = (e.target as HTMLSelectElement).value;
		});
	}

	private createNumberInput(container: HTMLElement, setting: BlockSetting): void {
		const input = container.createEl('input', { type: 'number' });
		input.value = this.config[setting.name] || setting.default || '0';
		input.addEventListener('change', (e) => {
			this.config[setting.name] = Number((e.target as HTMLInputElement).value);
		});
	}

	private createBooleanInput(container: HTMLElement, setting: BlockSetting): void {
		const input = container.createEl('input', { type: 'checkbox' });
		input.checked = this.config[setting.name] || setting.default || false;
		input.addEventListener('change', (e) => {
			this.config[setting.name] = (e.target as HTMLInputElement).checked;
		});
	}

	private async saveConfig(): Promise<void> {
		try {
			await this.plugin.canvasManager.updateNodeData(this.node.id, {
				livingCanvas: {
					...this.node.livingCanvas,
					config: this.config
				}
			});
			new Notice('Block configuration saved');
			this.close();
		} catch (error) {
			console.error('Living Canvas: Error saving config:', error);
			new Notice('Failed to save configuration');
		}
	}
}

class ClarifyModal extends Modal {
	private plugin: LivingCanvasPlugin;
	private selectedText: string;
	private view: MarkdownView;

	constructor(app: any, plugin: LivingCanvasPlugin, selectedText: string, view: MarkdownView) {
		super(app);
		this.plugin = plugin;
		this.selectedText = selectedText;
		this.view = view;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Ask AI to Clarify' });

		contentEl.createEl('div', { cls: 'selected-text-preview' })
			.createEl('p', { text: `Selected text: "${this.selectedText.substring(0, 100)}${this.selectedText.length > 100 ? '...' : ''}"` });

		const questionInput = contentEl.createEl('textarea', {
			placeholder: 'What would you like to know about this text?',
			cls: 'clarify-question-input'
		});

		const buttonContainer = contentEl.createEl('div', { cls: 'modal-button-container' });
		buttonContainer.createEl('button', { text: 'Ask AI', cls: 'mod-cta' })
			.addEventListener('click', () => this.askAI(questionInput.value));
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	private async askAI(question: string): Promise<void> {
		if (!question.trim()) {
			new Notice('Please enter a question');
			return;
		}

		try {
			await this.plugin.actionHandler.handleClarifyText(this.selectedText, question, this.view);
			new Notice('AI clarification requested');
			this.close();
		} catch (error) {
			console.error('Living Canvas: Error asking AI:', error);
			new Notice('Failed to get AI clarification');
		}
	}
}

// Configuration view for the sidebar
export class LivingCanvasConfigView extends ItemView {
	private plugin: LivingCanvasPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: LivingCanvasPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return 'living-canvas-config';
	}

	getDisplayText(): string {
		return 'Living Canvas Config';
	}

	getIcon(): string {
		return 'zap';
	}

	async onOpen() {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Living Canvas Configuration' });

		// Show current canvas info
		if (this.plugin.canvasManager.isCanvasActive()) {
			const canvasFile = this.plugin.canvasManager.getCurrentCanvasFile();
			containerEl.createEl('p', { text: `Active Canvas: ${canvasFile?.name}` });
			
			const livingCanvasNodes = this.plugin.canvasManager.getLivingCanvasNodes();
			containerEl.createEl('p', { text: `Living Canvas Blocks: ${livingCanvasNodes.length}` });
		} else {
			containerEl.createEl('p', { text: 'No active canvas' });
		}

		// Show available blocks
		const blocks = this.plugin.blockManager.getAllBlocks();
		containerEl.createEl('h3', { text: 'Available Blocks' });
		
		if (blocks.length === 0) {
			containerEl.createEl('p', { text: 'No blocks available' });
		} else {
			const blocksList = containerEl.createEl('ul');
			blocks.forEach((block: BlockDefinition) => {
				const li = blocksList.createEl('li');
				li.createEl('strong', { text: block.name });
				li.createEl('span', { text: ` (${block.id})` });
				li.createEl('div', { text: block.description, cls: 'block-description' });
			});
		}
	}

	async onClose() {
		// Cleanup
	}
}

class BlockRunModal extends Modal {
	private plugin: LivingCanvasPlugin;

	constructor(app: any, plugin: LivingCanvasPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Run Living Canvas Block' });

		const livingCanvasNodes = this.plugin.canvasManager.getLivingCanvasNodes();
		
		if (livingCanvasNodes.length === 0) {
			contentEl.createEl('p', { text: 'No Living Canvas blocks found in the current canvas.' });
			return;
		}

		livingCanvasNodes.forEach((node: CanvasNode) => {
			const blockEl = contentEl.createEl('div', { cls: 'living-canvas-block-item' });
			blockEl.createEl('div', { cls: 'block-name', text: node.text || 'Unnamed Block' });
			blockEl.createEl('div', { cls: 'block-description', text: `Status: ${node.livingCanvas?.status || 'unknown'}` });
			
			blockEl.addEventListener('click', () => {
				this.runBlock(node);
			});
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	private async runBlock(node: CanvasNode): Promise<void> {
		try {
			await this.plugin.actionHandler.handleRunBlock(node.id);
			new Notice(`Running block: ${node.text}`);
			this.close();
		} catch (error) {
			console.error('Living Canvas: Error running block:', error);
			new Notice('Failed to run block');
		}
	}
}

class BlockConfigureModal extends Modal {
	private plugin: LivingCanvasPlugin;

	constructor(app: any, plugin: LivingCanvasPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Configure Living Canvas Block' });

		const livingCanvasNodes = this.plugin.canvasManager.getLivingCanvasNodes();
		
		if (livingCanvasNodes.length === 0) {
			contentEl.createEl('p', { text: 'No Living Canvas blocks found in the current canvas.' });
			return;
		}

		livingCanvasNodes.forEach((node: CanvasNode) => {
			const blockEl = contentEl.createEl('div', { cls: 'living-canvas-block-item' });
			blockEl.createEl('div', { cls: 'block-name', text: node.text || 'Unnamed Block' });
			blockEl.createEl('div', { cls: 'block-description', text: `Type: ${node.livingCanvas?.blockType || 'unknown'}` });
			
			blockEl.addEventListener('click', () => {
				this.configureBlock(node);
			});
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	private configureBlock(node: CanvasNode): void {
		const modal = new BlockConfigModal(this.plugin.app, this.plugin, node);
		modal.open();
		this.close();
	}
}