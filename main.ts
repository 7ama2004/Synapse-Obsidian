import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder } from 'obsidian';
import { BlockManager } from './src/BlockManager';
import { UIManager } from './src/UIManager';
import { ActionHandler } from './src/ActionHandler';
import { CanvasManager } from './src/CanvasManager';

interface SynapseSettings {
	apiKey: string;
	model: string;
	savedPrompts: { [key: string]: string };
}

const DEFAULT_SETTINGS: SynapseSettings = {
	apiKey: '',
	model: 'gpt-3.5-turbo',
	savedPrompts: {}
}

export default class SynapsePlugin extends Plugin {
	settings: SynapseSettings;
	blockManager: BlockManager;
	uiManager: UIManager;
	actionHandler: ActionHandler;
	canvasManager: CanvasManager;

	async onload() {
		await this.loadSettings();

		// Initialize managers
		this.blockManager = new BlockManager(this);
		this.uiManager = new UIManager(this);
		this.actionHandler = new ActionHandler(this);
		this.canvasManager = new CanvasManager(this);

		// Register commands
		this.addCommand({
			id: 'synapse-open-canvas',
			name: 'Open Synapse Canvas',
			callback: () => {
				this.uiManager.openCanvas();
			}
		});

		this.addCommand({
			id: 'synapse-configure-block',
			name: 'Configure Selected Block',
			callback: () => {
				this.actionHandler.configureSelectedBlock();
			}
		});

		this.addCommand({
			id: 'synapse-save-prompt',
			name: 'Save Custom Prompt',
			callback: () => {
				this.actionHandler.saveCustomPrompt();
			}
		});

		// Add settings tab
		this.addSettingTab(new SynapseSettingTab(this.app, this));

		console.log('Synapse plugin loaded');
	}

	onunload() {
		console.log('Synapse plugin unloaded');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async savePromptToFile(promptName: string, promptContent: string): Promise<void> {
		const vault = this.app.vault;
		const promptsFolder = 'Synapse Prompts';
		
		// Create prompts folder if it doesn't exist
		const folder = vault.getAbstractFileByPath(promptsFolder);
		if (!folder || !(folder instanceof TFolder)) {
			await vault.createFolder(promptsFolder);
		}

		// Create or update the prompt file
		const fileName = `${promptName}.md`;
		const filePath = `${promptsFolder}/${fileName}`;
		
		const existingFile = vault.getAbstractFileByPath(filePath);
		if (existingFile && existingFile instanceof TFile) {
			await vault.modify(existingFile, promptContent);
		} else {
			await vault.create(filePath, promptContent);
		}

		// Update settings
		this.settings.savedPrompts[promptName] = promptContent;
		await this.saveSettings();
	}
}

class SynapseSettingTab extends PluginSettingTab {
	plugin: SynapsePlugin;

	constructor(app: App, plugin: SynapsePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Synapse Settings' });

		new Setting(containerEl)
			.setName('API Key')
			.setDesc('Your OpenAI API key for AI functionality')
			.addText(text => text
				.setPlaceholder('Enter your API key')
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Model')
			.setDesc('The AI model to use')
			.addDropdown(dropdown => dropdown
				.addOption('gpt-3.5-turbo', 'GPT-3.5 Turbo')
				.addOption('gpt-4', 'GPT-4')
				.setValue(this.plugin.settings.model)
				.onChange(async (value) => {
					this.plugin.settings.model = value;
					await this.plugin.saveSettings();
				}));

		// Display saved prompts
		containerEl.createEl('h3', { text: 'Saved Prompts' });
		const promptsContainer = containerEl.createDiv();
		this.displaySavedPrompts(promptsContainer);
	}

	private displaySavedPrompts(container: HTMLElement): void {
		container.empty();
		
		const prompts = this.plugin.settings.savedPrompts;
		if (Object.keys(prompts).length === 0) {
			container.createEl('p', { text: 'No saved prompts yet.' });
			return;
		}

		Object.entries(prompts).forEach(([name, content]) => {
			const promptDiv = container.createDiv('prompt-item');
			promptDiv.createEl('h4', { text: name });
			promptDiv.createEl('p', { text: content.substring(0, 100) + (content.length > 100 ? '...' : '') });
			
			const buttonContainer = promptDiv.createDiv();
			new Setting(buttonContainer)
				.addButton(button => button
					.setButtonText('Delete')
					.setCta()
					.onClick(async () => {
						delete this.plugin.settings.savedPrompts[name];
						await this.plugin.saveSettings();
						this.displaySavedPrompts(container);
					}));
		});
	}
}
