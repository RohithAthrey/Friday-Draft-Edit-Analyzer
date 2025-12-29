/**
 * Tone Analyzer - Analyzes email tone appropriateness using OpenAI API
 * Evaluates tone against recipient type and provides specific feedback
 */

async function analyzeToneScore(emailText, recipientType = 'professional') {
  try {
    // Get API key from Chrome storage
    const apiKey = await getOpenAIKey();
    if (!apiKey) {
      console.error('[Tone Analyzer] No API key found');
      return {
        score: 5,
        currentTone: 'unknown',
        recommendedTone: recipientType,
        issues: ['OpenAI API key not configured'],
        suggestions: ['Please add your OpenAI API key in the extension settings']
      };
    }

    const config = window.EMAIL_ANALYZER_CONFIG.OPENAI;

    // Construct the analysis prompt
    const prompt = `You are an expert email communication analyst. Analyze the tone of this email intended for a ${recipientType} recipient.

Email content:
"${emailText}"

Analyze:
1. Rate the tone appropriateness from 1-10 (10 = perfect tone for recipient)
2. Identify the current tone (e.g., casual, formal, friendly, aggressive, passive, direct)
3. Recommend the ideal tone for this recipient type
4. List specific tone issues if any (e.g., too casual, too formal, too aggressive, lacks warmth)
5. Provide 2-3 actionable suggestions to improve tone

Return your analysis as a JSON object with this exact structure:
{
  "score": <number 1-10>,
  "currentTone": "<brief description>",
  "recommendedTone": "<brief description>",
  "issues": ["<issue1>", "<issue2>"],
  "suggestions": ["<suggestion1>", "<suggestion2>", "<suggestion3>"]
}

Be specific and actionable in your feedback. Focus on concrete improvements.`;

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
      console.error('[Tone Analyzer] API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const result = JSON.parse(content);

    // Validate and normalize the response
    const normalizedResult = {
      score: Math.max(1, Math.min(10, result.score || 5)),
      currentTone: result.currentTone || 'neutral',
      recommendedTone: result.recommendedTone || recipientType,
      issues: Array.isArray(result.issues) ? result.issues : [],
      suggestions: Array.isArray(result.suggestions) ? result.suggestions.slice(0, 3) : []
    };

    console.log('[Tone Analyzer] Analysis complete:', normalizedResult);
    return normalizedResult;

  } catch (error) {
    console.error('[Tone Analyzer] Error:', error);
    return {
      score: 5,
      currentTone: 'unknown',
      recommendedTone: recipientType,
      issues: ['Unable to analyze tone'],
      suggestions: ['Please check your internet connection and API key', 'Try analyzing again']
    };
  }
}

/**
 * Helper function to get OpenAI API key from Chrome storage
 */
async function getOpenAIKey() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(['openai_api_key'], (result) => {
        resolve(result.openai_api_key || '');
      });
    } else {
      // Fallback for testing outside Chrome extension environment
      resolve(localStorage.getItem('openai_api_key') || '');
    }
  });
}

/**
 * Helper function to save OpenAI API key to Chrome storage
 */
async function saveOpenAIKey(apiKey) {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ openai_api_key: apiKey }, () => {
        resolve(true);
      });
    } else {
      // Fallback for testing
      localStorage.setItem('openai_api_key', apiKey);
      resolve(true);
    }
  });
}

// Make functions available globally
if (typeof window !== 'undefined') {
  window.analyzeToneScore = analyzeToneScore;
  window.getOpenAIKey = getOpenAIKey;
  window.saveOpenAIKey = saveOpenAIKey;
}
