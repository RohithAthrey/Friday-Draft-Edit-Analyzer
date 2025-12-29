/**
 * CTA Detector - Detects and analyzes call-to-action in emails
 * Pure logic analyzer using regex patterns - no external API calls
 */

function analyzeCTAScore(emailText) {
  try {
    const config = window.EMAIL_ANALYZER_CONFIG.CTA_PATTERNS;

    // Initialize result object
    const result = {
      score: 0,
      hasCTA: false,
      feedback: '',
      suggestions: [],
      ctaType: 'none',
      detectedCTAs: []
    };

    // Check for strong CTAs
    let strongCTACount = 0;
    const strongCTAsFound = [];

    config.strong.forEach(pattern => {
      const matches = emailText.match(pattern);
      if (matches) {
        strongCTACount++;
        strongCTAsFound.push(matches[0]);
      }
    });

    // Check for weak CTAs
    let weakCTACount = 0;
    const weakCTAsFound = [];

    config.weak.forEach(pattern => {
      const matches = emailText.match(pattern);
      if (matches) {
        weakCTACount++;
        weakCTAsFound.push(matches[0]);
      }
    });

    // Check for question marks (indicates asking for something)
    const hasQuestionMark = emailText.includes('?');
    const questionCount = (emailText.match(/\?/g) || []).length;

    // Scoring logic
    if (strongCTACount > 0) {
      result.hasCTA = true;
      result.ctaType = 'strong';
      result.detectedCTAs = strongCTAsFound;

      if (strongCTACount === 1) {
        result.score = 10;
        result.feedback = 'Clear and direct call-to-action';
      } else if (strongCTACount === 2) {
        result.score = 8;
        result.feedback = 'Multiple clear CTAs detected';
        result.suggestions.push('Consider focusing on one primary call-to-action for better response rate');
      } else {
        result.score = 6;
        result.feedback = 'Too many calls-to-action';
        result.suggestions.push('Reduce to one primary CTA to avoid overwhelming the recipient');
        result.suggestions.push('Multiple asks can reduce response rates significantly');
      }

    } else if (weakCTACount > 0) {
      result.hasCTA = true;
      result.ctaType = 'weak';
      result.detectedCTAs = weakCTAsFound;
      result.score = 5;
      result.feedback = 'Weak or passive call-to-action detected';
      result.suggestions.push('Replace passive phrases with direct requests');
      result.suggestions.push('Try: "Are you free for a 15-min call this week?" instead of "Let me know if interested"');
      result.suggestions.push('Strong CTAs get 2-3x more responses than passive ones');

    } else if (hasQuestionMark && questionCount === 1) {
      result.hasCTA = true;
      result.ctaType = 'implicit';
      result.score = 6;
      result.feedback = 'Implicit call-to-action through a question';
      result.suggestions.push('Make your ask more explicit and actionable');
      result.suggestions.push('Example: "Would you be open to a quick call on Tuesday at 2pm?"');

    } else if (hasQuestionMark && questionCount > 1) {
      result.hasCTA = true;
      result.ctaType = 'implicit_multiple';
      result.score = 4;
      result.feedback = 'Multiple questions without a clear primary ask';
      result.suggestions.push('Choose one primary question/request');
      result.suggestions.push('Move other questions to a follow-up conversation');
      result.suggestions.push('Make your main ask specific with a clear next step');

    } else {
      result.hasCTA = false;
      result.score = 2;
      result.feedback = 'No clear call-to-action found';
      result.suggestions.push('Add a specific ask or next step at the end of your email');
      result.suggestions.push('Examples: "Are you available for a call this week?", "Can we schedule 15 minutes to discuss?"');
      result.suggestions.push('Emails with clear CTAs get 371% more responses');
    }

    // Additional suggestions based on email structure
    const sentences = emailText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 5 && result.ctaType !== 'none') {
      const lastSentence = sentences[sentences.length - 1].toLowerCase();
      const hasCtaInLastSentence = config.strong.some(pattern => pattern.test(lastSentence)) ||
                                   config.weak.some(pattern => pattern.test(lastSentence));

      if (!hasCtaInLastSentence && result.score > 6) {
        result.score = Math.max(6, result.score - 1);
        result.suggestions.push('Consider placing your CTA in the last sentence for better visibility');
      }
    }

    console.log('[CTA Detector] Analysis complete:', result);
    return result;

  } catch (error) {
    console.error('[CTA Detector] Error:', error);
    return {
      score: 5,
      hasCTA: false,
      feedback: 'Unable to analyze call-to-action',
      suggestions: ['Please try again'],
      ctaType: 'error',
      detectedCTAs: []
    };
  }
}

// Make function available globally
if (typeof window !== 'undefined') {
  window.analyzeCTAScore = analyzeCTAScore;
}
