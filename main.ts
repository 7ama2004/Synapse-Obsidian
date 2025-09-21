import { App, Plugin, PluginSettingTab, Setting, Notice, TFile, WorkspaceLeaf } from 'obsidian';
import { BlockManager } from './src/BlockManager';
import { CanvasManager } from './src/CanvasManager';
import { UIManager, LivingCanvasConfigView } from './src/UIManager';
import { ActionHandler } from './src/ActionHandler';
import { BlockExecutor } from './src/BlockExecutor';

interface LivingCanvasSettings {
	llmApiKey: string;
	llmProvider: 'openai' | 'anthropic' | 'ollama';
	llmModel: string;
	ollamaUrl: string;
}

const DEFAULT_SETTINGS: LivingCanvasSettings = {
	llmApiKey: '',
	llmProvider: 'openai',
	llmModel: 'gpt-3.5-turbo',
	ollamaUrl: 'http://localhost:11434'
}

export default class LivingCanvasPlugin extends Plugin {
	settings: LivingCanvasSettings;
	blockManager!: BlockManager;
	canvasManager!: CanvasManager;
	uiManager!: UIManager;
	actionHandler!: ActionHandler;
	blockExecutor!: BlockExecutor;

	async onload() {
		await this.loadSettings();

		// Initialize core components
		this.blockManager = new BlockManager(this);
		this.canvasManager = new CanvasManager(this);
		this.blockExecutor = new BlockExecutor(this);
		this.actionHandler = new ActionHandler(this);
		this.uiManager = new UIManager(this);

		// Initialize components
		await this.blockManager.initialize();
		await this.canvasManager.initialize();
		await this.uiManager.initialize();
		await this.actionHandler.initialize();

		// Add settings tab
		this.addSettingTab(new LivingCanvasSettingTab(this.app, this));

		// Register the configuration view
		this.registerView('living-canvas-config', (leaf) => new LivingCanvasConfigView(leaf, this));

		new Notice('Living Canvas plugin loaded successfully!');
	}

	onunload() {
		// Cleanup
		this.uiManager?.cleanup();
		this.actionHandler?.cleanup();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class LivingCanvasSettingTab extends PluginSettingTab {
	plugin: LivingCanvasPlugin;

	constructor(app: App, plugin: LivingCanvasPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Living Canvas Settings' });

		// LLM Provider Selection
		new Setting(containerEl)
			.setName('LLM Provider')
			.setDesc('Choose your preferred LLM provider')
			.addDropdown(dropdown => dropdown
				.addOption('openai', 'OpenAI')
				.addOption('anthropic', 'Anthropic')
				.addOption('ollama', 'Ollama (Local)')
				.setValue(this.plugin.settings.llmProvider)
				.onChange(async (value: 'openai' | 'anthropic' | 'ollama') => {
					this.plugin.settings.llmProvider = value;
					await this.plugin.saveSettings();
					this.display(); // Refresh to show/hide relevant settings
				}));

		// API Key (for OpenAI and Anthropic)
		if (this.plugin.settings.llmProvider === 'openai' || this.plugin.settings.llmProvider === 'anthropic') {
			new Setting(containerEl)
				.setName('API Key')
				.setDesc(`Your ${this.plugin.settings.llmProvider} API key`)
				.addText(text => text
					.setPlaceholder('Enter your API key')
					.setValue(this.plugin.settings.llmApiKey)
					.onChange(async (value) => {
						this.plugin.settings.llmApiKey = value;
						await this.plugin.saveSettings();
					}));
		}

		// Model Selection
		new Setting(containerEl)
			.setName('Model')
			.setDesc('The model to use for AI processing')
			.addText(text => text
				.setPlaceholder('e.g., gpt-3.5-turbo, claude-3-sonnet')
				.setValue(this.plugin.settings.llmModel)
				.onChange(async (value) => {
					this.plugin.settings.llmModel = value;
					await this.plugin.saveSettings();
				}));

		// Ollama URL (only for Ollama)
		if (this.plugin.settings.llmProvider === 'ollama') {
			new Setting(containerEl)
				.setName('Ollama URL')
				.setDesc('URL of your local Ollama instance')
				.addText(text => text
					.setPlaceholder('http://localhost:11434')
					.setValue(this.plugin.settings.ollamaUrl)
					.onChange(async (value) => {
						this.plugin.settings.ollamaUrl = value;
						await this.plugin.saveSettings();
					}));
		}

		// Block Management Section
		containerEl.createEl('h3', { text: 'Block Management' });
		
		new Setting(containerEl)
			.setName('Reload Blocks')
			.setDesc('Reload all block definitions from the blocks directory')
			.addButton(button => button
				.setButtonText('Reload')
				.onClick(async () => {
					await this.plugin.blockManager.initialize();
					new Notice('Blocks reloaded successfully!');
				}));
	}
}