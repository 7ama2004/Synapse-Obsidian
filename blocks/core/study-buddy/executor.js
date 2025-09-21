async function execute(inputText, config) {
	const { studyFormat, learningStyle, timeAvailable, includeExamples } = config;
	
	let prompt = `Create ${studyFormat} optimized for a ${learningStyle} from the following content.`;
	
	if (timeAvailable) {
		prompt += ` Design for ${timeAvailable} minutes of study time.`;
	}
	
	if (includeExamples) {
		prompt += ` Include practical examples and real-world applications.`;
	}
	
	prompt += `\n\nContent to process:\n\n${inputText}`;
	
	return prompt;
}

module.exports = { execute };
