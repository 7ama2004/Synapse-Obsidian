# Synapse - AI-Powered Canvas Blocks for Obsidian

Synapse is an Obsidian plugin that brings AI-powered canvas blocks to enhance your productivity and learning experience. Create interactive AI blocks that can process text, generate summaries, translate content, and much more.

## Features

- **Custom AI Block**: Create your own AI prompts and save them to your directory
- **Canvas Interface**: Drag and drop blocks on a visual canvas
- **Block Configuration**: Easy configuration interface for all blocks
- **Prompt Management**: Save and manage your custom prompts
- **Multiple AI Models**: Support for GPT-3.5 and GPT-4

## Installation

1. Download the latest release from the releases page
2. Extract the files to your Obsidian vault's `.obsidian/plugins/synapse/` directory
3. Enable the plugin in Obsidian's Community Plugins settings
4. Configure your OpenAI API key in the plugin settings

## Quick Start

1. **Set up your API key**:
   - Go to Settings → Community Plugins → Synapse
   - Enter your OpenAI API key
   - Select your preferred AI model

2. **Open the Canvas**:
   - Use the command palette (Ctrl/Cmd + P)
   - Search for "Open Synapse Canvas"
   - Click "Add Block" to start building

3. **Configure a Block**:
   - Add a Custom AI block to your canvas
   - Click "Configure" on the block
   - Enter your custom prompt (use `{{input}}` as placeholder for canvas text)
   - Optionally save the prompt to your directory

## Available Blocks

### Custom AI Block
- **Purpose**: Create any AI-powered functionality you want
- **Configuration**:
  - `customPrompt`: Your custom prompt (use `{{input}}` for canvas text)
  - `promptName`: Name for saving the prompt
  - `savePrompt`: Toggle to save prompt to your directory

### Summarizer Block
- **Purpose**: Summarize text content
- **Configuration**:
  - `summaryLength`: Choose between short, medium, or long summaries
  - `focus`: Optional focus area for the summary

## Saving Prompts

The Custom AI block allows you to save prompts to your Obsidian vault:

1. Configure a Custom AI block
2. Enter your prompt in the `customPrompt` field
3. Give it a name in the `promptName` field
4. Enable `savePrompt` toggle
5. Save the configuration

Your prompt will be saved as a markdown file in the "Synapse Prompts" folder in your vault.

## Configuration Saving

All block configurations are automatically saved when you:
- Click "Save Configuration" in the block configuration modal
- The settings are persisted in the plugin's data

## Troubleshooting

### Configuration Not Saving
If you're unable to save block configurations:
1. Make sure you have write permissions to your Obsidian vault
2. Check that the plugin is properly enabled
3. Try restarting Obsidian

### API Errors
- Verify your OpenAI API key is correct
- Check your API key has sufficient credits
- Ensure you have access to the selected model

## Development

To build the plugin from source:

```bash
npm install
npm run build
```

## Contributing

We welcome contributions! Please feel free to submit issues and pull requests.

## License

MIT License - see LICENSE file for details.