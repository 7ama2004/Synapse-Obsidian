async function execute(inputText, config) {
	const { gradingCriteria, gradeScale, includeSuggestions } = config;
	
	let prompt = `Please grade the following work based on these criteria: ${gradingCriteria}\n\nGrading scale: ${gradeScale}`;
	if (includeSuggestions) {
		prompt += `\nInclude specific suggestions for improvement.`;
	}
	prompt += `\n\nWork to grade:\n\n${inputText}`;

	return prompt;
}

module.exports = { execute };
