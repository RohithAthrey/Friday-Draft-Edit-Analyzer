// Configuration constants for Email Quality Analyzer

const CONFIG = {
  // Email type word count ranges
  EMAIL_TYPES: {
    cold_outreach: {
      minWords: 50,
      maxWords: 100,
      idealMin: 60,
      idealMax: 90
    },
    investor_email: {
      minWords: 50,
      maxWords: 120,
      idealMin: 70,
      idealMax: 110
    },
    customer_reply: {
      minWords: 30,
      maxWords: 150,
      idealMin: 50,
      idealMax: 120
    },
    follow_up: {
      minWords: 30,
      maxWords: 80,
      idealMin: 40,
      idealMax: 70
    }
  },

  // CTA patterns
  CTA_PATTERNS: {
    strong: [
      /are you (free|available)/i,
      /let'?s schedule/i,
      /would you be (open|interested)/i,
      /can we (chat|talk|meet|discuss)/i,
      /shall we/i,
      /could we schedule/i,
      /would.*work for you/i,
      /when (are you|would you be) available/i,
      /what time works/i,
      /book a (call|meeting|time)/i
    ],
    weak: [
      /let me know/i,
      /if you'?re interested/i,
      /feel free to/i,
      /reach out if/i,
      /if you (want|would like)/i,
      /happy to (chat|discuss)/i
    ]
  },

  // Scoring weights for overall calculation
  SCORE_WEIGHTS: {
    tone: 0.30,
    clarity: 0.25,
    cta: 0.25,
    length: 0.20
  },

  // Score thresholds
  THRESHOLDS: {
    excellent: 8,
    good: 6,
    needsWork: 6
  },

  // OpenAI configuration
  OPENAI: {
    model: 'gpt-4o-mini',
    temperature: 0,
    maxTokens: 500
  },

  // Email type detection keywords
  EMAIL_TYPE_KEYWORDS: {
    cold_outreach: ['intro', 'introduction', 'reaching out', 'connect'],
    investor_email: ['funding', 'investment', 'pitch', 'raise', 'series', 'investor'],
    follow_up: ['follow up', 'following up', 'circling back', 'checking in'],
    customer_reply: [] // Default fallback
  },

  // Recipient type detection
  RECIPIENT_TYPE_KEYWORDS: {
    investor: ['vc', 'ventures', 'capital', 'partners', 'fund'],
    customer: ['customer', 'client', 'support'],
    professional: [] // Default fallback
  }
};

// Make config available globally
if (typeof window !== 'undefined') {
  window.EMAIL_ANALYZER_CONFIG = CONFIG;
}
