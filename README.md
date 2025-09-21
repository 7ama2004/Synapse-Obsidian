# Living Canvas - Obsidian Plugin

Transform your Obsidian canvas into an interactive AI-powered workspace with intelligent blocks that can process, analyze, and enhance your content.

## Features

### 🤖 AI-Powered Blocks
- **Text Summarizer**: Summarize connected text with customizable tone and format
- **Quiz Generator**: Create quizzes from your content
- **AI Grader**: Get feedback on your writing
- **Custom Blocks**: Extensible system for creating your own AI blocks

### 🎨 Canvas Integration
- Seamlessly integrates with Obsidian's native canvas
- Visual workflow with connected nodes
- Real-time status indicators for processing blocks
- Smart positioning for new nodes

### 🔧 Flexible Configuration
- Support for multiple LLM providers (OpenAI, Anthropic, Ollama)
- Configurable block settings
- Custom system prompts and parameters
- Local Ollama support for privacy

### 📝 Text Clarification
- Right-click any selected text to ask AI for clarification
- Automatic node creation and connection
- Context-aware responses

## Installation

1. Download the latest release from the [releases page](https://github.com/living-canvas/obsidian-plugin/releases)
2. Extract the files to your vault's `.obsidian/plugins/living-canvas/` folder
3. Enable the plugin in Obsidian's Community Plugins settings
4. Configure your LLM API key in the plugin settings

## Quick Start

### 1. Configure LLM Provider
- Go to Settings → Community Plugins → Living Canvas
- Choose your LLM provider (OpenAI, Anthropic, or Ollama)
- Enter your API key (not needed for Ollama)
- Set your preferred model

### 2. Insert Your First Block
- Open a canvas file
- Click the "Living Canvas" ribbon icon or use the command palette
- Select "Insert Living Canvas Block"
- Choose a block type (e.g., "Text Summarizer")

### 3. Connect and Run
- Add text nodes to your canvas
- Connect them to your Living Canvas block with edges
- Right-click the block and select "Run Block"
- Watch as AI processes your content and creates output nodes

### 4. Configure Blocks
- Right-click any Living Canvas block
- Select "Configure Block" to customize settings
- Adjust tone, format, and other parameters

## Block Types

### Core Blocks (Included)

#### Text Summarizer
- **Purpose**: Summarize connected text content
- **Settings**:
  - System Prompt: Customize the AI's instructions
  - Tone: Choose from academic, casual, formal, or creative
  - Output Format: Bullet points, paragraph, numbered list, or outline
  - Cite References: Include citations and references

#### Quiz Generator
- **Purpose**: Create quizzes from your content
- **Settings**:
  - Difficulty: Easy, medium, or hard
  - Question Count: Number of questions to generate
  - Question Types: Multiple choice, true/false, short answer

#### AI Grader
- **Purpose**: Provide feedback on writing
- **Settings**:
  - Criteria: What to evaluate (clarity, accuracy, completeness)
  - Scoring Scale: Customize the grading scale
  - Feedback Style: Constructive, detailed, or brief

### Creating Custom Blocks

You can create your own AI blocks by adding them to the `blocks/` directory:

```
blocks/
├── core/
│   ├── summarizer/
│   │   ├── block.json
│   │   └── executor.js
│   └── quizzer/
│       ├── block.json
│       └── executor.js
└── community/
    └── my-custom-block/
        ├── block.json
        └── executor.js
```

#### Block Definition (`block.json`)
```json
{
  "id": "community/my-custom-block",
  "name": "My Custom Block",
  "description": "A custom AI block for specific tasks",
  "author": "Your Name",
  "version": "1.0.0",
  "settings": [
    {
      "name": "customSetting",
      "description": "A custom setting",
      "type": "text",
      "required": true,
      "default": "default value"
    }
  ],
  "executor": "executor.js"
}
```

#### Block Executor (`executor.js`)
```javascript
async function execute(inputText, config, apiCall) {
    const systemPrompt = config.systemPrompt || 'You are a helpful assistant.';
    const userPrompt = `Process this text: ${inputText}`;
    
    try {
        const response = await apiCall(systemPrompt, userPrompt);
        return response;
    } catch (error) {
        throw new Error(`Processing failed: ${error.message}`);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { execute };
}
```

## Usage Examples

### Academic Research Workflow
1. Add research notes as text nodes
2. Connect them to a Summarizer block
3. Configure for academic tone and bullet points
4. Run to get a comprehensive summary
5. Use the output for your research paper

### Content Creation
1. Write draft content in text nodes
2. Connect to an AI Grader block
3. Get feedback on clarity and structure
4. Iterate based on AI suggestions

### Learning and Study
1. Add study material as text nodes
2. Connect to a Quiz Generator block
3. Generate practice questions
4. Test your knowledge

## API Providers

### OpenAI
- Models: GPT-3.5-turbo, GPT-4, etc.
- Requires API key
- Good for general-purpose tasks

### Anthropic
- Models: Claude-3-sonnet, Claude-3-haiku, etc.
- Requires API key
- Excellent for analysis and reasoning

### Ollama (Local)
- Run models locally on your machine
- No API key required
- Privacy-focused
- Models: Llama, Mistral, CodeLlama, etc.

## Troubleshooting

### Common Issues

**"No input text found"**
- Make sure you have text nodes connected to your Living Canvas block
- Check that the edges are properly connected

**"API call failed"**
- Verify your API key is correct
- Check your internet connection
- Ensure you have sufficient API credits

**"Block definition not found"**
- Reload the plugin in settings
- Check that your block files are in the correct directory structure

### Getting Help

- Check the [GitHub Issues](https://github.com/living-canvas/obsidian-plugin/issues)
- Join our [Discord community](https://discord.gg/living-canvas)
- Read the [documentation](https://docs.living-canvas.com)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Clone the repository
2. Run `npm install`
3. Run `npm run dev` for development
4. Run `npm run build` for production

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Built for the Obsidian community
- Inspired by the need for AI-powered knowledge work
- Thanks to all contributors and users