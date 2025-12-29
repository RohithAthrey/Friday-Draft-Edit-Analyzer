/**
 * Master Email Analyzer - Orchestrates all analysis modules
 * Runs all analyzers in parallel and compiles comprehensive results
 */

/**
 * Main analysis function that orchestrates all analyzers
 * @param {string} emailText - The email content to analyze
 * @param {string} emailType - Type of email (cold_outreach, investor_email, customer_reply, follow_up)
 * @param {string} recipientType - Type of recipient (investor, customer, professional)
 * @returns {Promise<Object>} Complete analysis results
 */
async function analyzeEmail(emailText, emailType = 'customer_reply', recipientType = 'professional') {
  try {
    console.log('[Email Analyzer] Starting analysis...', { emailType, recipientType });

    // Validate input
    if (!emailText || emailText.trim().length === 0) {
      return {
        error: true,
        message: 'Email content is empty',
        overallScore: 0
      };
    }

    // Run all analyzers in parallel for maximum performance
    const [lengthResult, ctaResult, toneResult, clarityResult] = await Promise.all([
      // Pure logic analyzers (fast)
      Promise.resolve(window.analyzeLengthScore(emailText, emailType)),
      Promise.resolve(window.analyzeCTAScore(emailText)),
      // API-based analyzers (slower)
      window.analyzeToneScore(emailText, recipientType),
      window.analyzeClarityScore(emailText)
    ]);

    console.log('[Email Analyzer] All analyses complete', {
      length: lengthResult,
      cta: ctaResult,
      tone: toneResult,
      clarity: clarityResult
    });

    // Calculate weighted overall score
    const weights = window.EMAIL_ANALYZER_CONFIG.SCORE_WEIGHTS;
    const overallScore = Math.round(
      (toneResult.score * weights.tone) +
      (clarityResult.score * weights.clarity) +
      (ctaResult.score * weights.cta) +
      (lengthResult.score * weights.length)
    );

    // Identify strengths (scores of 8+)
    const strengths = [];
    if (toneResult.score >= 8) strengths.push({ metric: 'Tone', score: toneResult.score });
    if (clarityResult.score >= 8) strengths.push({ metric: 'Clarity', score: clarityResult.score });
    if (ctaResult.score >= 8) strengths.push({ metric: 'Call-to-Action', score: ctaResult.score });
    if (lengthResult.score >= 8) strengths.push({ metric: 'Length', score: lengthResult.score });

    // Compile all suggestions and prioritize
    const allSuggestions = [
      ...toneResult.suggestions.map(s => ({ text: s, category: 'tone', priority: calculatePriority(toneResult.score) })),
      ...clarityResult.suggestions.map(s => ({ text: s, category: 'clarity', priority: calculatePriority(clarityResult.score) })),
      ...ctaResult.suggestions.map(s => ({ text: s, category: 'cta', priority: calculatePriority(ctaResult.score) })),
      ...lengthResult.suggestions.map(s => ({ text: s, category: 'length', priority: calculatePriority(lengthResult.score) }))
    ];

    // Sort by priority and take top 3
    const topSuggestions = allSuggestions
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);

    // Compile all issues
    const allIssues = [];
    if (toneResult.issues && toneResult.issues.length > 0) {
      allIssues.push(...toneResult.issues.map(i => ({ text: i, category: 'tone' })));
    }
    if (clarityResult.mainIssues && clarityResult.mainIssues.length > 0) {
      allIssues.push(...clarityResult.mainIssues.map(i => ({ text: i, category: 'clarity' })));
    }
    if (ctaResult.score < 8 && ctaResult.feedback) {
      allIssues.push({ text: ctaResult.feedback, category: 'cta' });
    }
    if (lengthResult.score < 8 && lengthResult.feedback) {
      allIssues.push({ text: lengthResult.feedback, category: 'length' });
    }

    // Compile comprehensive results
    const results = {
      overallScore: overallScore,
      breakdown: {
        tone: {
          score: toneResult.score,
          currentTone: toneResult.currentTone,
          recommendedTone: toneResult.recommendedTone,
          issues: toneResult.issues || [],
          weight: weights.tone
        },
        clarity: {
          score: clarityResult.score,
          mainIssues: clarityResult.mainIssues || [],
          weight: weights.clarity
        },
        cta: {
          score: ctaResult.score,
          hasCTA: ctaResult.hasCTA,
          ctaType: ctaResult.ctaType,
          feedback: ctaResult.feedback,
          weight: weights.cta
        },
        length: {
          score: lengthResult.score,
          wordCount: lengthResult.wordCount,
          feedback: lengthResult.feedback,
          weight: weights.length
        }
      },
      strengths: strengths,
      issues: allIssues,
      topSuggestions: topSuggestions,
      metadata: {
        emailType: emailType,
        recipientType: recipientType,
        analyzedAt: new Date().toISOString()
      }
    };

    console.log('[Email Analyzer] Final results:', results);
    return results;

  } catch (error) {
    console.error('[Email Analyzer] Error during analysis:', error);
    return {
      error: true,
      message: 'An error occurred during analysis. Please try again.',
      overallScore: 0,
      details: error.message
    };
  }
}

/**
 * Calculate priority for a suggestion based on the score
 * Lower scores = higher priority for improvement
 */
function calculatePriority(score) {
  if (score <= 3) return 5; // Critical
  if (score <= 5) return 4; // High
  if (score <= 7) return 3; // Medium
  if (score <= 8) return 2; // Low
  return 1; // Minimal (almost perfect)
}

/**
 * Detect email type from subject and content
 */
function detectEmailType(subject, emailText) {
  const keywords = window.EMAIL_ANALYZER_CONFIG.EMAIL_TYPE_KEYWORDS;
  const combinedText = `${subject} ${emailText}`.toLowerCase();

  // Check for each email type
  if (keywords.investor_email.some(kw => combinedText.includes(kw))) {
    return 'investor_email';
  }
  if (keywords.follow_up.some(kw => combinedText.includes(kw))) {
    return 'follow_up';
  }
  if (keywords.cold_outreach.some(kw => combinedText.includes(kw))) {
    return 'cold_outreach';
  }

  // Default to customer_reply
  return 'customer_reply';
}

/**
 * Detect recipient type from email address or context
 */
function detectRecipientType(recipientEmail, emailText) {
  const keywords = window.EMAIL_ANALYZER_CONFIG.RECIPIENT_TYPE_KEYWORDS;
  const combinedText = `${recipientEmail} ${emailText}`.toLowerCase();

  // Check for investor
  if (keywords.investor.some(kw => combinedText.includes(kw))) {
    return 'investor';
  }

  // Check for customer
  if (keywords.customer.some(kw => combinedText.includes(kw))) {
    return 'customer';
  }

  // Default to professional
  return 'professional';
}

/**
 * Get score color based on thresholds
 */
function getScoreColor(score) {
  const thresholds = window.EMAIL_ANALYZER_CONFIG.THRESHOLDS;
  if (score >= thresholds.excellent) return '#10b981'; // Green
  if (score >= thresholds.good) return '#f59e0b'; // Yellow
  return '#ef4444'; // Red
}

/**
 * Get score label based on thresholds
 */
function getScoreLabel(score) {
  const thresholds = window.EMAIL_ANALYZER_CONFIG.THRESHOLDS;
  if (score >= thresholds.excellent) return 'Excellent';
  if (score >= thresholds.good) return 'Good';
  return 'Needs Work';
}

// Make functions available globally
if (typeof window !== 'undefined') {
  window.analyzeEmail = analyzeEmail;
  window.detectEmailType = detectEmailType;
  window.detectRecipientType = detectRecipientType;
  window.getScoreColor = getScoreColor;
  window.getScoreLabel = getScoreLabel;
}
