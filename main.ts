import { App, Plugin, PluginSettingTab, Setting, TFile, WorkspaceLeaf, Notice } from 'obsidian';
import { BlockManager } from './src/BlockManager';
import { CanvasManager } from './src/CanvasManager';
import { UIManager } from './src/UIManager';
import { ActionHandler } from './src/ActionHandler';
import { BlockExecutor } from './src/BlockExecutor';

export interface LivingCanvasSettings {
	openaiApiKey: string;
	anthropicApiKey: string;
	defaultModel: string;
	enableDebugMode: boolean;
}

const DEFAULT_SETTINGS: LivingCanvasSettings = {
	openaiApiKey: '',
	anthropicApiKey: '',
	defaultModel: 'gpt-3.5-turbo',
	enableDebugMode: false
};

export class LivingCanvasPlugin extends Plugin {
	settings: LivingCanvasSettings;
	
	// Core components
	blockManager: BlockManager;
	canvasManager: CanvasManager;
	uiManager: UIManager;
	actionHandler: ActionHandler;
	blockExecutor: BlockExecutor;

	async onload() {
		await this.loadSettings();

		// Initialize core components
		this.blockManager = new BlockManager(this);
		this.canvasManager = new CanvasManager(this);
		this.blockExecutor = new BlockExecutor(this);
		this.actionHandler = new ActionHandler(this);
		this.uiManager = new UIManager(this);

		// Initialize components in order
		await this.blockManager.initialize();
		await this.canvasManager.initialize();
		await this.uiManager.initialize();
		await this.actionHandler.initialize();

		// Add settings tab
		this.addSettingTab(new LivingCanvasSettingTab(this.app, this));

		console.log('Living Canvas plugin loaded successfully');
	}

	onunload() {
		// Clean up components
		this.uiManager?.cleanup();
		this.actionHandler?.cleanup();
		console.log('Living Canvas plugin unloaded');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	// Utility method to get the current canvas file
	getCurrentCanvasFile(): TFile | null {
		const activeLeaf = this.app.workspace.activeLeaf;
		if (activeLeaf && activeLeaf.view.getViewType() === 'canvas') {
			return (activeLeaf.view as any).file;
		}
		return null;
	}

	// Debug logging
	debug(message: string, ...args: any[]) {
		if (this.settings.enableDebugMode) {
			console.log(`[Living Canvas] ${message}`, ...args);
		}
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

		// API Keys Section
		containerEl.createEl('h3', { text: 'AI API Configuration' });

		new Setting(containerEl)
			.setName('OpenAI API Key')
			.setDesc('Your OpenAI API key for GPT models')
			.addText(text => text
				.setPlaceholder('sk-...')
				.setValue(this.plugin.settings.openaiApiKey)
				.onChange(async (value: string) => {
					this.plugin.settings.openaiApiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Anthropic API Key')
			.setDesc('Your Anthropic API key for Claude models')
			.addText(text => text
				.setPlaceholder('sk-ant-...')
				.setValue(this.plugin.settings.anthropicApiKey)
				.onChange(async (value: string) => {
					this.plugin.settings.anthropicApiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Default Model')
			.setDesc('Default AI model to use for processing')
			.addDropdown(dropdown => dropdown
				.addOption('gpt-3.5-turbo', 'GPT-3.5 Turbo')
				.addOption('gpt-4', 'GPT-4')
				.addOption('claude-3-sonnet', 'Claude 3 Sonnet')
				.addOption('claude-3-haiku', 'Claude 3 Haiku')
				.setValue(this.plugin.settings.defaultModel)
				.onChange(async (value) => {
					this.plugin.settings.defaultModel = value;
					await this.plugin.saveSettings();
				}));

		// Debug Section
		containerEl.createEl('h3', { text: 'Debug Options' });

		new Setting(containerEl)
			.setName('Enable Debug Mode')
			.setDesc('Show debug messages in the console')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableDebugMode)
				.onChange(async (value) => {
					this.plugin.settings.enableDebugMode = value;
					await this.plugin.saveSettings();
				}));

		// Block Management Section
		containerEl.createEl('h3', { text: 'Block Management' });

		new Setting(containerEl)
			.setName('Reload Blocks')
			.setDesc('Reload all block definitions from the blocks directory')
			.addButton(button => button
				.setButtonText('Reload Blocks')
				.onClick(async () => {
					await this.plugin.blockManager.initialize();
					new Notice('Blocks reloaded successfully');
				}));
	}
}

export default LivingCanvasPlugin;