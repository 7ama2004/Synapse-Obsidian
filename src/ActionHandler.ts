import { App, Modal, Notice, Setting } from 'obsidian';
import { SynapsePlugin } from '../main';
import { BlockInstance } from './BlockManager';

export class ActionHandler {
	private plugin: SynapsePlugin;

	constructor(plugin: SynapsePlugin) {
		this.plugin = plugin;
	}

	public configureSelectedBlock(): void {
		// This would be called when user wants to configure a selected block
		// For now, we'll create a modal to configure the custom AI block
		new BlockConfigModal(this.plugin.app, this.plugin, 'custom-ai').open();
	}

	public saveCustomPrompt(): void {
		new SavePromptModal(this.plugin.app, this.plugin).open();
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
		new Setting(buttonContainer)
			.addButton(button => button
				.setButtonText('Save Configuration')
				.setCta()
				.onClick(async () => {
					await this.saveConfiguration();
					this.close();
				}))
			.addButton(button => button
				.setButtonText('Cancel')
				.onClick(() => {
					this.close();
				}));
	}

	private createSettingControl(container: HTMLElement, setting: any): void {
		const settingContainer = container.createDiv('setting-item');
		
		new Setting(settingContainer)
			.setName(setting.name)
			.setDesc(setting.description)
			.addText(text => {
				if (setting.type === 'textarea') {
					text.inputEl.style.height = '100px';
					text.inputEl.style.resize = 'vertical';
				}
				
				text.setPlaceholder(`Enter ${setting.name.toLowerCase()}`)
					.setValue(this.settings[setting.name] || setting.default || '')
					.onChange(value => {
						this.settings[setting.name] = value;
					});
			});
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

class SavePromptModal extends Modal {
	private plugin: SynapsePlugin;

	constructor(app: App, plugin: SynapsePlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Save Custom Prompt' });

		let promptName = '';
		let promptContent = '';

		// Prompt name input
		new Setting(contentEl)
			.setName('Prompt Name')
			.setDesc('Give your prompt a descriptive name')
			.addText(text => text
				.setPlaceholder('e.g., "Code Review Assistant"')
				.onChange(value => {
					promptName = value;
				}));

		// Prompt content input
		new Setting(contentEl)
			.setName('Prompt Content')
			.setDesc('Enter your custom prompt. Use {{input}} as a placeholder for the text from the canvas.')
			.addTextArea(text => {
				text.inputEl.style.height = '200px';
				text.inputEl.style.resize = 'vertical';
				text.setPlaceholder('Enter your custom prompt here...\nUse {{input}} as a placeholder for canvas text.')
					.onChange(value => {
						promptContent = value;
					});
			});

		// Save button
		const buttonContainer = contentEl.createDiv();
		new Setting(buttonContainer)
			.addButton(button => button
				.setButtonText('Save Prompt')
				.setCta()
				.onClick(async () => {
					if (!promptName.trim()) {
						new Notice('Please enter a prompt name.');
						return;
					}
					if (!promptContent.trim()) {
						new Notice('Please enter prompt content.');
						return;
					}

					try {
						await this.plugin.savePromptToFile(promptName, promptContent);
						new Notice(`Prompt "${promptName}" saved successfully!`);
						this.close();
					} catch (error) {
						console.error('Error saving prompt:', error);
						new Notice('Error saving prompt. Please try again.');
					}
				}))
			.addButton(button => button
				.setButtonText('Cancel')
				.onClick(() => {
					this.close();
				}));
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}