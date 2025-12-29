/**
 * Length Checker - Analyzes email word count and provides feedback
 * Pure logic analyzer - no external API calls
 */

function analyzeLengthScore(emailText, emailType = 'customer_reply') {
  try {
    // Get configuration for the email type
    const config = window.EMAIL_ANALYZER_CONFIG.EMAIL_TYPES[emailType] ||
                   window.EMAIL_ANALYZER_CONFIG.EMAIL_TYPES.customer_reply;

    // Calculate word count (split by whitespace and filter empty strings)
    const words = emailText.trim().split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;

    // Initialize result object
    const result = {
      score: 0,
      wordCount: wordCount,
      feedback: '',
      suggestions: []
    };

    // Edge case: empty or very short email
    if (wordCount < 10) {
      result.score = 1;
      result.feedback = 'Email is too short to be effective';
      result.suggestions.push('Add more context and details to your message');
      result.suggestions.push('Aim for at least 30-50 words for a complete message');
      return result;
    }

    // Calculate score based on word count ranges
    if (wordCount >= config.idealMin && wordCount <= config.idealMax) {
      // Perfect range
      result.score = 10;
      result.feedback = `Perfect length for ${emailType.replace('_', ' ')}`;
    } else if (wordCount >= config.minWords && wordCount <= config.maxWords) {
      // Acceptable range but not ideal
      if (wordCount < config.idealMin) {
        const distance = config.idealMin - wordCount;
        result.score = Math.max(7, 10 - Math.floor(distance / 5));
        result.feedback = `Slightly short for ${emailType.replace('_', ' ')}`;
        result.suggestions.push(`Add ${distance}-${distance + 10} more words to provide better context`);
        result.suggestions.push('Consider adding a brief example or additional detail');
      } else {
        const distance = wordCount - config.idealMax;
        result.score = Math.max(7, 10 - Math.floor(distance / 10));
        result.feedback = `A bit lengthy for ${emailType.replace('_', ' ')}`;
        result.suggestions.push(`Try to reduce by ${distance}-${distance + 10} words for better impact`);
        result.suggestions.push('Remove redundant phrases or consolidate similar points');
      }
    } else if (wordCount < config.minWords) {
      // Too short
      const wordsNeeded = config.minWords - wordCount;
      result.score = Math.max(2, 7 - Math.floor(wordsNeeded / 10));
      result.feedback = `Too short for ${emailType.replace('_', ' ')}`;
      result.suggestions.push(`Add at least ${wordsNeeded} more words to meet minimum length`);
      result.suggestions.push('Provide more context about your request or proposal');
      result.suggestions.push('Add specific details or examples to strengthen your message');
    } else {
      // Too long
      const excessWords = wordCount - config.maxWords;
      result.score = Math.max(3, 8 - Math.floor(excessWords / 15));
      result.feedback = `Too long for ${emailType.replace('_', ' ')}`;
      result.suggestions.push(`Reduce by at least ${excessWords} words to improve readability`);
      result.suggestions.push('Focus on one main point and remove tangential information');
      result.suggestions.push('Break into shorter paragraphs or consider a follow-up email');
    }

    // Additional context-based suggestions
    if (wordCount > 200) {
      result.suggestions.push('Consider using bullet points for easier scanning');
    }

    console.log('[Length Checker] Analysis complete:', result);
    return result;

  } catch (error) {
    console.error('[Length Checker] Error:', error);
    return {
      score: 5,
      wordCount: 0,
      feedback: 'Unable to analyze length',
      suggestions: ['Please try again']
    };
  }
}

// Make function available globally
if (typeof window !== 'undefined') {
  window.analyzeLengthScore = analyzeLengthScore;
}
