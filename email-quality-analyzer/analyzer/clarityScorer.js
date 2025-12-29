/**
 * Clarity Scorer - Analyzes email clarity using OpenAI API
 * Evaluates if main point is clear, checks for jargon, and ensures focused messaging
 */

async function analyzeClarityScore(emailText) {
  try {
    // Get API key from Chrome storage
    const apiKey = await window.getOpenAIKey();
    if (!apiKey) {
      console.error('[Clarity Scorer] No API key found');
      return {
        score: 5,
        mainIssues: ['OpenAI API key not configured'],
        suggestions: ['Please add your OpenAI API key in the extension settings']
      };
    }

    const config = window.EMAIL_ANALYZER_CONFIG.OPENAI;

    // Construct the analysis prompt
    const prompt = `You are an expert email communication analyst. Analyze the clarity of this email.

Email content:
"${emailText}"

Evaluate:
1. Rate clarity from 1-10 (10 = perfectly clear and easy to understand)
2. Is the main point clear in the first 2 sentences?
3. Is there too much jargon or technical language?
4. Are multiple unrelated topics mixed together?
5. Is the ask/purpose obvious to the reader?
6. Are there any confusing or ambiguous phrases?

Return your analysis as a JSON object with this exact structure:
{
  "score": <number 1-10>,
  "mainIssues": ["<issue1>", "<issue2>", "<issue3>"],
  "suggestions": ["<actionable suggestion1>", "<actionable suggestion2>", "<actionable suggestion3>"]
}

Focus on:
- Identifying specific clarity problems
- Providing actionable suggestions with examples
- Being concise but helpful

If the email is clear, mainIssues can be an empty array and suggestions should reinforce what works well.`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert email communication analyst. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Clarity Scorer] API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const result = JSON.parse(content);

    // Validate and normalize the response
    const normalizedResult = {
      score: Math.max(1, Math.min(10, result.score || 5)),
      mainIssues: Array.isArray(result.mainIssues) ? result.mainIssues.slice(0, 3) : [],
      suggestions: Array.isArray(result.suggestions) ? result.suggestions.slice(0, 3) : []
    };

    // Add local clarity checks as backup/supplement
    const localChecks = performLocalClarityChecks(emailText);
    if (localChecks.issues.length > 0 && normalizedResult.score > 6) {
      // Adjust score slightly if local checks find issues
      normalizedResult.score = Math.max(6, normalizedResult.score - 1);
      // Add local issues if not already covered
      localChecks.issues.forEach(issue => {
        if (!normalizedResult.mainIssues.some(i => i.toLowerCase().includes(issue.toLowerCase()))) {
          normalizedResult.mainIssues.push(issue);
        }
      });
    }

    console.log('[Clarity Scorer] Analysis complete:', normalizedResult);
    return normalizedResult;

  } catch (error) {
    console.error('[Clarity Scorer] Error:', error);
    // Fallback to local checks only
    const localChecks = performLocalClarityChecks(emailText);
    return {
      score: localChecks.score,
      mainIssues: localChecks.issues,
      suggestions: ['Please check your internet connection and API key', 'Try analyzing again']
    };
  }
}

/**
 * Perform basic local clarity checks as fallback/supplement
 */
function performLocalClarityChecks(emailText) {
  const issues = [];
  let score = 8; // Start with a good score

  // Check sentence length (overly long sentences reduce clarity)
  const sentences = emailText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgWordsPerSentence = emailText.split(/\s+/).length / sentences.length;

  if (avgWordsPerSentence > 25) {
    issues.push('Sentences are too long on average (reduces clarity)');
    score -= 1;
  }

  // Check for excessive paragraph length
  const paragraphs = emailText.split(/\n\n+/).filter(p => p.trim().length > 0);
  const hasLongParagraph = paragraphs.some(p => p.split(/\s+/).length > 100);

  if (hasLongParagraph) {
    issues.push('Contains very long paragraphs (break into smaller chunks)');
    score -= 1;
  }

  // Check for excessive use of "and" (indicates run-on thoughts)
  const andCount = (emailText.match(/\band\b/gi) || []).length;
  if (andCount > 5 && emailText.split(/\s+/).length < 150) {
    issues.push('Overuse of "and" suggests run-on sentences');
    score -= 1;
  }

  // Check if email starts with context/greeting or jumps right into details
  const firstSentence = sentences[0]?.toLowerCase() || '';
  const startsAbruptly = !firstSentence.match(/hi|hello|hope|thank|following up|wanted to|quick/i);

  if (startsAbruptly && firstSentence.length > 100) {
    issues.push('First sentence is complex - consider starting with a brief greeting or context');
    score -= 1;
  }

  return {
    score: Math.max(1, Math.min(10, score)),
    issues: issues.slice(0, 3)
  };
}

// Make function available globally
if (typeof window !== 'undefined') {
  window.analyzeClarityScore = analyzeClarityScore;
}
