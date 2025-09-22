// Summarizer Block Executor
async function execute(input, settings, plugin) {
    try {
        if (!plugin.settings.apiKey) {
            return "Error: API key not configured. Please set your OpenAI API key in the plugin settings.";
        }

        const length = settings.summaryLength || 'medium';
        const focus = settings.focus || '';
        
        let prompt = `Please summarize the following text`;
        
        if (length === 'short') {
            prompt += ' in 1-2 sentences';
        } else if (length === 'medium') {
            prompt += ' in 2-3 paragraphs';
        } else if (length === 'long') {
            prompt += ' in 3-4 paragraphs';
        }
        
        if (focus) {
            prompt += `, focusing on: ${focus}`;
        }
        
        prompt += `:\n\n${input}`;

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
                        content: prompt
                    }
                ],
                max_tokens: 1000,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            return `Error: ${errorData.error?.message || 'Failed to get response from AI'}`;
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || 'No response received';
        
    } catch (error) {
        console.error('Error in summarizer executor:', error);
        return `Error: ${error.message}`;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = execute;
} else {
    return execute;
}