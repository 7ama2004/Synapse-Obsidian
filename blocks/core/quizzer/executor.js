async function execute(inputText, config) {
	const { questionType, numQuestions, difficulty } = config;
	
	// Construct the prompt
	const prompt = `Generate ${numQuestions} ${difficulty} ${questionType} questions based on the following content:\n\n${inputText}\n\nFormat the questions clearly with answers.`;

	// Return the prompt - the BlockExecutor will handle the AI API call
	return prompt;
}

module.exports = { execute };
