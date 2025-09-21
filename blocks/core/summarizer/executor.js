async function execute(inputText, config) {
	const { systemPrompt, tone, outputFormat, maxLength, citeReferences } = config;
	
	// Construct the prompt
	let prompt = `${systemPrompt}\n\nTone: ${tone}\nFormat: ${outputFormat}`;
	if (maxLength) {
		prompt += `\nMaximum length: ${maxLength} words`;
	}
	if (citeReferences) {
		prompt += `\nInclude references and citations where appropriate`;
	}
	prompt += `\n\nText to summarize:\n\n${inputText}`;

	// Return the prompt - the BlockExecutor will handle the AI API call
	return prompt;
}

module.exports = { execute };
