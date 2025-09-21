# Living Canvas Plugin Demo

This demo shows how to use the Living Canvas plugin to create AI-powered workflows in Obsidian.

## Quick Start Demo

### 1. Setup
1. Install the Living Canvas plugin
2. Configure your AI API keys in the plugin settings
3. Open a new canvas file in Obsidian

### 2. Create Your First AI Block
1. Use `Ctrl/Cmd + P` to open the command palette
2. Search for "Living Canvas: Insert Block"
3. Select "Text Summarizer" from the list
4. The block will appear on your canvas

### 3. Add Input Text
1. Create a regular text node on your canvas
2. Add some long text content (e.g., an article, research paper, or notes)
3. Draw an edge from the text node to the Summarizer block

### 4. Configure the Block
1. Click on the Summarizer block
2. Use `Ctrl/Cmd + P` and search for "Configure Selected Block"
3. Adjust settings like:
   - Tone: Academic, Casual, Technical, or Concise
   - Output Format: Bullet Points, Paragraph, or Numbered List
   - Maximum Length: Set word limit for the summary

### 5. Run the Block
1. With the Summarizer block selected, use `Ctrl/Cmd + P`
2. Search for "Run Selected Block"
3. Watch as the AI processes your text and creates a summary node

## Example Workflows

### Academic Research Workflow
1. **Input**: Research paper or article
2. **Summarizer Block**: Create a concise summary
3. **Quiz Generator Block**: Create study questions
4. **AI Grader Block**: Grade practice answers

### Language Learning Workflow
1. **Input**: Text in your native language
2. **Translator Block**: Translate to target language
3. **Quiz Generator Block**: Create vocabulary or comprehension questions

### Content Creation Workflow
1. **Input**: Raw notes or ideas
2. **Summarizer Block**: Create structured outlines
3. **AI Grader Block**: Review and improve content quality

## Advanced Features

### Text Clarification
1. Select any text in an editor
2. Right-click and choose "Ask AI to Clarify"
3. Enter your question
4. Get an AI-generated answer in a new canvas node

### Custom Block Creation
1. Create a new directory in `blocks/community/`
2. Add `block.json` with your block definition
3. Add `executor.js` with your execution logic
4. Reload blocks in plugin settings

## Tips and Best Practices

### Canvas Organization
- Use different colors for different types of nodes
- Group related blocks together
- Create clear visual connections with edges
- Use descriptive names for your blocks

### Block Configuration
- Experiment with different settings to find what works best
- Save frequently used configurations
- Use debug mode to troubleshoot issues

### Performance
- Keep input texts reasonable in length (under 10,000 words)
- Use appropriate AI models for your needs
- Monitor your API usage and costs

## Troubleshooting

### Common Issues
- **"No canvas file open"**: Make sure you're working in a canvas file
- **"API key not configured"**: Add your keys in plugin settings
- **"No input text found"**: Connect text nodes to your blocks
- **"Block execution failed"**: Check your internet connection and API keys

### Getting Help
- Enable debug mode for detailed error messages
- Check the browser console for error logs
- Review the plugin settings for configuration issues

## Next Steps

1. **Explore Block Types**: Try all the built-in block types
2. **Create Custom Blocks**: Build your own specialized blocks
3. **Share Workflows**: Export and share your canvas workflows
4. **Join Community**: Connect with other users and developers

---

**Ready to transform your canvas into an AI-powered workspace? Start with the Quick Start Demo above! 🚀**