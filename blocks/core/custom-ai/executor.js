// Custom AI Block Executor
// This function processes the input using the configured custom prompt

async function execute(input, settings, plugin) {
    try {
        // Get the custom prompt from settings
        const customPrompt = settings.customPrompt || "Summarize the following text for me: {{input}}";
        
        // Replace {{input}} placeholder with the actual input
        const processedPrompt = customPrompt.replace(/\{\{input\}\}/g, input);
        
        // If savePrompt is enabled and promptName is provided, save the prompt
        if (settings.savePrompt && settings.promptName) {
            try {
                await plugin.savePromptToFile(settings.promptName, customPrompt);
                console.log(`Prompt "${settings.promptName}" saved successfully`);
            } catch (error) {
                console.error('Error saving prompt:', error);
            }
        }
        
        // Check if API key is configured
        if (!plugin.settings.apiKey) {
            return "Error: API key not configured. Please set your OpenAI API key in the plugin settings.";
        }
        
        // Make API call to OpenAI
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${plugin.settings.apiKey}`
            },
            body: JSON.stringify({
                model: plugin.settings.model || 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'user',
                        content: processedPrompt
                    }
                ],
                max_tokens: 1000,
                temperature: 0.7
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            return `Error: ${errorData.error?.message || 'Failed to get response from AI'}`;
        }
        
        const data = await response.json();
        return data.choices[0]?.message?.content || 'No response received';
        
    } catch (error) {
        console.error('Error in custom AI executor:', error);
        return `Error: ${error.message}`;
    }
}

// Export the execute function
if (typeof module !== 'undefined' && module.exports) {
    module.exports = execute;
} else {
    // For browser/plugin environment
    return execute;
}