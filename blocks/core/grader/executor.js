// Living Canvas Block Executor - AI Grader
async function execute(inputText, config, apiCall) {
    const criteria = config.criteria || 'clarity, accuracy, completeness, organization';
    const scoringScale = config.scoringScale || '100 point scale';
    const feedbackStyle = config.feedbackStyle || 'constructive';
    
    const systemPrompt = 'You are an expert educator who provides fair, constructive feedback on written work.';
    const userPrompt = `Please evaluate the following text using these criteria: ${criteria}

Use a ${scoringScale} and provide ${feedbackStyle} feedback.

Text to evaluate:
${inputText}

Provide your evaluation in this format:
**Overall Score: [score]**

**Strengths:**
- [strength 1]
- [strength 2]

**Areas for Improvement:**
- [improvement 1]
- [improvement 2]

**Detailed Feedback:**
[Detailed analysis and suggestions]`;

    try {
        const response = await apiCall(systemPrompt, userPrompt);
        return response;
    } catch (error) {
        throw new Error(`Failed to grade content: ${error.message}`);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { execute };
}