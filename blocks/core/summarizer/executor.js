// Living Canvas Block Executor
// This function will be called with the input text and configuration

async function execute(inputText, config, apiCall) {
    const systemPrompt = config.systemPrompt || 'You are a helpful assistant. Summarize the following text.';
    const tone = config.tone || 'concise and academic';
    const outputFormat = config.outputFormat || 'bullet points';
    const citeReferences = config.citeReferences || false;
    
    const userPrompt = `Please summarize the following text in a ${tone} tone, using ${outputFormat} format.${citeReferences ? ' Include relevant references and citations where appropriate.' : ''}

Text to summarize:
${inputText}`;

    try {
        const response = await apiCall(systemPrompt, userPrompt);
        return response;
    } catch (error) {
        throw new Error(`Failed to summarize text: ${error.message}`);
    }
}

// Export the execute function
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { execute };
}