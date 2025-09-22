# Living Canvas - AI-Powered Obsidian Canvas Plugin

Transform your Obsidian canvas into an intelligent workspace with AI-powered blocks that can process, analyze, and generate content.

## Features

### 🤖 AI-Powered Blocks
- **Text Summarizer**: Summarize long texts into concise bullet points or paragraphs
- **Quiz Generator**: Create quiz questions from educational content
- **AI Grader**: Grade essays and assignments with detailed feedback
- **Translator**: Translate text between different languages
- **Clarification Tool**: Ask AI to clarify any selected text
-. **Custom Prompt**: Write any prompt and run it against connected text, with reusable saved prompts

### 🎨 Canvas Integration
- Seamlessly integrates with Obsidian's native canvas
- All data stored directly in canvas JSON files
- Portable and shareable workflows
- Visual connections between input and output

### ⚙️ Configurable Blocks
- Each block type has customizable settings
- Easy-to-use configuration panels
- Support for different AI models (GPT, Claude)
- Extensible block system for community contributions

## Installation

1. Download the plugin files to your Obsidian plugins directory
2. Enable the plugin in Obsidian's Community Plugins settings
3. Configure your AI API keys in the plugin settings

## Setup

### API Keys Configuration

1. Open Obsidian Settings
2. Go to Community Plugins → Living Canvas
3. Add your API keys:
   - **OpenAI API Key**: For GPT models (gpt-3.5-turbo, gpt-4)
   - **Anthropic API Key**: For Claude models (claude-3-sonnet, claude-3-haiku)
4. Select your default AI model
5. Enable debug mode if needed for troubleshooting

### Getting API Keys

- **OpenAI**: Visit [OpenAI API](https://platform.openai.com/api-keys) to get your key
- **Anthropic**: Visit [Anthropic Console](https://console.anthropic.com/) to get your key

## Usage

### Inserting Blocks

1. Open a canvas in Obsidian
2. Use the command palette (`Ctrl/Cmd + P`)
3. Search for "Living Canvas: Insert Block"
4. Select the block type you want to insert
5. The block will appear on your canvas

### Configuring Blocks

1. Click a Living Canvas block (double‑click also opens configuration)
2. Use the command palette to "Configure Selected Block"
   - The command is always available. If nothing is selected, you’ll be prompted to choose a block from the current canvas.
3. Adjust the settings in the configuration panel
4. Save your changes

### Running Blocks

1. Connect text nodes to your Living Canvas block (draw edges between them)
2. Use the command palette to "Run Selected Block"
   - The command is always available. If nothing is selected, you’ll be prompted to choose a block from the current canvas.
3. The AI will process the connected text and create an output node

### Text Clarification

1. Select text in any editor
2. Right-click and choose "Ask AI to Clarify"
3. Enter your question in the modal
4. The AI will provide an answer in a new canvas node

### Command list

- "Living Canvas: Insert Block" — insert any available block
- "Living Canvas: Configure Selected Block" — configure the chosen block (prompts to pick if none is selected)
- "Living Canvas: Run Selected Block" — execute the chosen block (prompts to pick if none is selected)
- Right‑click on selected editor text → "Ask AI to Clarify" — answer appears on the canvas

## Block Types

### 📝 Text Summarizer
- **Purpose**: Summarize long texts into concise formats
- **Settings**:
  - System prompt customization
  - Tone selection (concise, academic, casual, technical)
  - Output format (bullet points, paragraph, numbered list)
  - Maximum length control
  - Reference citation options

### 🧠 Quiz Generator
- **Purpose**: Create quiz questions from educational content
- **Settings**:
  - Question type (multiple choice, true/false, short answer, mixed)
  - Number of questions
  - Difficulty level (easy, medium, hard)

### 📊 AI Grader
- **Purpose**: Grade essays and assignments with detailed feedback
- **Settings**:
  - Grading criteria specification
  - Grade scale (0-100 points, letter grades, detailed rubric)
  - Improvement suggestions toggle

### 🌍 Translator
- **Purpose**: Translate text between different languages
- **Settings**:
  - Target language selection
  - Formatting preservation options

### ✨ Custom Prompt
- **Purpose**: Run any prompt you define against the connected text
- **How it works**:
  - In the prompt field, use `{{ input }}` where the connected text should be inserted.
  - Optionally set a temperature value to hint creativity.
  - Save prompts for reuse from the configuration panel; saved prompts can be applied or deleted.
- **Settings**:
  - Prompt (textarea)
  - Temperature (number, optional)

## Architecture

The plugin follows a modular architecture:

- **BlockManager**: Discovers and manages block definitions
- **CanvasManager**: Handles canvas file operations
- **UIManager**: Manages user interface and commands
- **ActionHandler**: Orchestrates block execution
- **BlockExecutor**: Handles AI API calls

## Creating Custom Blocks

You can create custom blocks by adding them to the `blocks/` directory:

1. Create a new directory: `blocks/community/my-block/`
2. Add `block.json` with block metadata and settings
3. Add `executor.js` with the execution logic
4. Reload blocks using the plugin settings

### Block Definition Example

```json
{
  "id": "community/my-block",
  "name": "My Custom Block",
  "description": "Description of what this block does",
  "author": "Your Name",
  "version": "1.0.0",
  "category": "community",
  "settings": [
    {
      "name": "mySetting",
      "description": "Description of the setting",
      "type": "text",
      "required": true,
      "default": "default value"
    }
  ]
}
```

### Executor Example

```javascript
async function execute(inputText, config) {
  const { mySetting } = config;
  
  // Construct your prompt
  const prompt = `Process this text with setting: ${mySetting}\n\nText: ${inputText}`;
  
  // Return the prompt - the BlockExecutor will handle the AI API call
  return prompt;
}

module.exports = { execute };
```

## Troubleshooting

### Common Issues

1. **"No canvas file is currently open"**
   - Make sure you have a canvas file open in Obsidian
   - The plugin only works with canvas files (.canvas)

2. **"API key not configured"**
   - Add your API keys in the plugin settings
   - Make sure the keys are valid and have sufficient credits

3. **"Block execution failed"**
   - Check your internet connection
   - Verify your API keys are correct
   - Enable debug mode to see detailed error messages

4. **"No input text found"**
   - Connect text nodes to your Living Canvas block
   - Make sure the text nodes contain actual text content

5. **"Commands not visible"**
   - The Run/Configure commands always show in the palette; if nothing is selected you’ll be prompted to choose a block from the current canvas.

### Debug Mode

Enable debug mode in the plugin settings to see detailed logging in the browser console. This helps troubleshoot issues with block execution and API calls.

## Contributing

We welcome contributions! Here's how you can help:

1. **Report Issues**: Use GitHub Issues to report bugs or request features
2. **Create Blocks**: Develop new block types for the community
3. **Improve Documentation**: Help improve this README and other docs
4. **Code Contributions**: Submit pull requests for bug fixes and features

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

- **GitHub Issues**: Report bugs and request features
- **Discussions**: Join community discussions about the plugin
- **Documentation**: Check the wiki for detailed guides

## Changelog

### Version 1.0.1
- Added Custom Prompt block with saved prompts
- Added right‑click "Ask AI to Clarify" on selected text
- Run/Configure commands always visible and prompt for target if none selected

### Version 1.0.0
- Initial release
- Core block types (Summarizer, Quiz Generator, AI Grader, Translator)
- Canvas integration
- AI API support (OpenAI, Anthropic)
- Configuration system
- Text clarification feature

**Happy Canvas Building! 🎨✨**
