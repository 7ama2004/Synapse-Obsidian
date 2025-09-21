async function execute(inputText, config) {
	const { audienceLevel, useAnalogies, includeVisuals, stepByStep } = config;
	
	let prompt = `Explain the following concept for a ${audienceLevel} audience.`;
	
	if (stepByStep) {
		prompt += ` Break it down into clear, step-by-step explanations.`;
	}
	
	if (useAnalogies) {
		prompt += ` Use analogies and real-world comparisons to make it easier to understand.`;
	}
	
	if (includeVisuals) {
		prompt += ` Suggest visual aids, diagrams, or examples that would help illustrate the concept.`;
	}
	
	prompt += `\n\nConcept to explain:\n\n${inputText}`;
	
	return prompt;
}

module.exports = { execute };
