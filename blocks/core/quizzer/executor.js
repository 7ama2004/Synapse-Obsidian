// Living Canvas Block Executor - Quiz Generator
async function execute(inputText, config, apiCall) {
    const difficulty = config.difficulty || 'medium';
    const questionCount = config.questionCount || 5;
    const questionTypes = config.questionTypes || 'multiple choice';
    
    const systemPrompt = 'You are an expert educator who creates high-quality quiz questions.';
    const userPrompt = `Create ${questionCount} ${difficulty} difficulty quiz questions based on the following text. Question types should be: ${questionTypes}.

Text:
${inputText}

Format your response as:
1. Question text
   A) Option A
   B) Option B
   C) Option C
   D) Option D
   Answer: [Correct answer]

[Continue for each question]`;

    try {
        const response = await apiCall(systemPrompt, userPrompt);
        return response;
    } catch (error) {
        throw new Error(`Failed to generate quiz: ${error.message}`);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { execute };
}