async function execute(inputText, config) {
	const { targetLanguage, preserveFormatting } = config;
	
	let prompt = `Translate the following text to ${targetLanguage}.`;
	if (preserveFormatting) {
		prompt += ` Preserve the original formatting, including line breaks, bullet points, and emphasis.`;
	}
	prompt += `\n\nText to translate:\n\n${inputText}`;

	return prompt;
}

module.exports = { execute };
