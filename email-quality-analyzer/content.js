/**
 * Friday Draft Edit Analyzer - Content Script
 * This runs on Gmail and watches for Friday-generated drafts, then tracks how users edit them
 */

(function() {
  'use strict';

  console.log('[Friday Edit Analyzer] Content script loaded');

  // Keep track of the current draft we're monitoring
  let currentDraft = null;

  // Remember which compose windows we've already set up watchers for (prevents duplicates)
  let watchedComposeWindows = new WeakSet();

  // Thresholds for detecting Friday drafts and when to analyze edits
  const DETECTION_CONFIG = {
    MIN_WORD_COUNT: 30,              // Need at least 30 words to be a draft
    BULK_INSERT_THRESHOLD: 2000,     // Text appearing in under 2 seconds = probably pasted
    MIN_EDIT_PERCENTAGE: 10,         // Don't bother analyzing if user changed less than 10%
    ANALYSIS_DELAY: 3000             // Wait 3 seconds after user stops typing before we analyze
  };

  // Kick things off once Gmail loads
  function initialize() {
    console.log('[Friday Edit Analyzer] Initializing...');
    waitForGmail().then(() => {
      console.log('[Friday Edit Analyzer] Gmail detected, monitoring compose windows');
      observeComposeWindows();
    });
  }

  // Gmail takes a sec to load, so wait for it
  function waitForGmail() {
    return new Promise((resolve) => {
      const checkGmail = setInterval(() => {
        // Look for Gmail-specific elements to know when it's ready
        if (document.querySelector('[gh="cm"]') || document.querySelector('div[role="main"]')) {
          clearInterval(checkGmail);
          resolve();
        }
      }, 1000);
    });
  }

  // Watch for new compose windows popping up (Gmail uses dynamic DOM)
  function observeComposeWindows() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            // Look for ANY textbox where users type (compose, reply, forward)
            let textBoxes = [];

            if (node.querySelector) {
              // Find all possible textboxes in this node
              const allTextBoxes = node.querySelectorAll('div[role="textbox"][contenteditable="true"]');
              textBoxes = Array.from(allTextBoxes);

              // Also check if the node itself is a textbox
              if (node.getAttribute && node.getAttribute('role') === 'textbox' && node.getAttribute('contenteditable') === 'true') {
                textBoxes.push(node);
              }
            } else if (node.getAttribute && node.getAttribute('role') === 'textbox' && node.getAttribute('contenteditable') === 'true') {
              textBoxes.push(node);
            }

            // Monitor all found textboxes (compose, reply, forward)
            textBoxes.forEach(textBox => {
              if (!watchedComposeWindows.has(textBox)) {
                const ariaLabel = textBox.getAttribute('aria-label') || '';
                const boxType = ariaLabel.includes('Reply') ? 'reply' :
                               ariaLabel.includes('Forward') ? 'forward' : 'compose';
                console.log(`[Friday Edit Analyzer] ✅ Found ${boxType} textbox`);
                watchedComposeWindows.add(textBox);
                setTimeout(() => monitorComposeWindow(textBox), 500);
              }
            });
          }
        });
      });
    });

    // Start watching the whole page for new compose windows
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('[Friday Edit Analyzer] MutationObserver attached to document.body');

    // Also check if there are any compose windows already open
    const existingWindows = document.querySelectorAll('[role="dialog"]');
    console.log('[Friday Edit Analyzer] Found', existingWindows.length, 'existing dialogs');
    existingWindows.forEach(window => {
      if (!watchedComposeWindows.has(window)) {
        watchedComposeWindows.add(window);
        monitorComposeWindow(window);
      }
    });
  }

  // Set up watchers on a compose window to detect Friday drafts and track edits
  function monitorComposeWindow(element) {
    // Sometimes we get the textbox directly, sometimes we get a container - handle both
    let textBox;

    if (element.getAttribute && element.getAttribute('role') === 'textbox') {
      textBox = element;
    } else {
      textBox = element.querySelector('div[role="textbox"][contenteditable="true"]');
    }

    if (!textBox) {
      console.warn('[Friday Edit Analyzer] No textbox found in compose window');
      return;
    }

    console.log('[Friday Edit Analyzer] ✅ Monitoring textbox for changes');

    // Track state for this specific compose window
    let lastText = '';
    let lastChangeTime = Date.now();
    let fridayDraftDetected = false;
    let analysisTimer = null;

    // Watch every time the text changes in this compose window
    const observer = new MutationObserver(() => {
      const currentText = textBox.innerText || textBox.textContent || '';
      const currentTime = Date.now();

      // Skip if nothing actually changed
      if (currentText === lastText) return;

      const wordCount = currentText.split(/\s+/).filter(w => w.length > 0).length;
      const timeDelta = currentTime - lastChangeTime;
      const textAdded = currentText.length - lastText.length;

      console.log('[Friday Edit Analyzer] 📝 Text changed:', {
        wordCount,
        textAdded,
        timeDelta,
        meetsWordCount: wordCount >= DETECTION_CONFIG.MIN_WORD_COUNT,
        meetsTextAdded: textAdded > 100,
        meetsTimeDelta: timeDelta < DETECTION_CONFIG.BULK_INSERT_THRESHOLD,
        alreadyDetected: fridayDraftDetected
      });

      // THIS IS THE KEY PART: Detect if this looks like a Friday draft
      // We're looking for: lots of text appearing very quickly (paste pattern)
      if (!fridayDraftDetected &&
          wordCount >= DETECTION_CONFIG.MIN_WORD_COUNT &&
          textAdded > 100 &&
          timeDelta < DETECTION_CONFIG.BULK_INSERT_THRESHOLD) {

        console.log('[Friday Edit Analyzer] 🎯 Friday draft detected!');

        fridayDraftDetected = true;
        handleFridayDraftDetected(textBox, currentText);
      }

      // If we detected a Friday draft, track all subsequent edits
      if (fridayDraftDetected && currentDraft) {
        // Reset the timer every time they type (so we only analyze after they stop)
        if (analysisTimer) {
          clearTimeout(analysisTimer);
        }

        // Wait 3 seconds after they stop typing, then analyze what changed
        analysisTimer = setTimeout(() => {
          analyzeCurrentEdits(currentText);
        }, DETECTION_CONFIG.ANALYSIS_DELAY);
      }

      lastText = currentText;
      lastChangeTime = currentTime;
    });

    observer.observe(textBox, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  // We detected a Friday draft! Save the original text so we can compare later
  function handleFridayDraftDetected(textBox, originalText) {
    const draftId = generateDraftId();

    currentDraft = {
      id: draftId,
      textBox: textBox,
      originalText: originalText,
      originalWordCount: originalText.split(/\s+/).filter(w => w.length > 0).length,
      generatedAt: new Date().toISOString(),
      timestamp: Date.now()
    };

    console.log('[Friday Edit Analyzer] Captured draft:', {
      id: draftId,
      wordCount: currentDraft.originalWordCount
    });

    storeDraft(currentDraft);
  }

  // User stopped typing for 3 seconds, time to analyze what they changed
  function analyzeCurrentEdits(currentText) {
    if (!currentDraft) return;

    const editPercentage = calculateEditPercentage(currentDraft.originalText, currentText);

    // Only bother analyzing if they changed at least 10%
    if (editPercentage >= DETECTION_CONFIG.MIN_EDIT_PERCENTAGE) {
      console.log('[Friday Edit Analyzer] ✏️ Analyzing edits:', editPercentage + '%');

      const wordCount = currentText.split(/\s+/).filter(w => w.length > 0).length;
      const timeSinceGeneration = Date.now() - currentDraft.timestamp;

      // Send to OpenAI to figure out what kind of changes they made
      analyzeEdits(currentDraft.originalText, currentText, editPercentage, timeSinceGeneration)
        .then(analysis => {
          console.log('[Friday Edit Analyzer] 📊 Analysis result:', analysis);
          // Save the analysis results
          updateDraftWithAnalysis(currentDraft.id, {
            finalText: currentText,
            finalWordCount: wordCount,
            sentAt: new Date().toISOString(),
            sendDelay: timeSinceGeneration,
            editPercentage,
            ...analysis,
            status: 'editing'
          });
        })
        .catch(error => {
          console.error('[Friday Edit Analyzer] ❌ Analysis failed:', error);
        });
    }
  }

  /**
   * Calculate edit percentage between two texts
   */
  function calculateEditPercentage(original, final) {
    const distance = levenshteinDistance(original, final);
    const maxLength = Math.max(original.length, final.length);
    return Math.round((distance / maxLength) * 100);
  }

  /**
   * Levenshtein distance algorithm
   */
  function levenshteinDistance(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Analyze edits using OpenAI API
   */
  async function analyzeEdits(originalText, finalText, editPercentage, sendDelay) {
    try {
      console.log('[Friday Edit Analyzer] 🔑 Getting API key...');
      const apiKey = await getOpenAIKey();

      if (!apiKey) {
        console.warn('[Friday Edit Analyzer] ⚠️ No OpenAI API key configured');
        return {
          toneChange: 'Unable to analyze (no API key)',
          ctaChange: 'Unable to analyze (no API key)',
          lengthChange: categorizeLengthChange(originalText, finalText),
          summary: 'No API key configured'
        };
      }

      console.log('[Friday Edit Analyzer] 🚀 Making OpenAI API call...');

      const prompt = `You are analyzing how a user edited an AI-generated email draft before sending.

ORIGINAL DRAFT (generated by AI):
"${originalText}"

FINAL DRAFT (after user edits):
"${finalText}"

EDIT STATS:
- ${editPercentage}% of text changed
- Time between generation and send: ${Math.round(sendDelay / 1000)} seconds

Classify the changes in these categories:

1. TONE CHANGE:
   - "More formal" (user made it more professional/formal)
   - "More casual" (user made it friendlier/less formal)
   - "No significant change"

2. CTA (Call-to-Action) CHANGE:
   - "Vague → specific" (user made CTA more concrete)
   - "CTA added" (user added a clear ask)
   - "CTA removed" (user removed or softened the ask)
   - "No significant change"

3. LENGTH CHANGE:
   - "Shortened" (user reduced length significantly)
   - "Expanded" (user added more content)
   - "No significant change"

Return your analysis as a JSON object:
{
  "toneChange": "<one of the tone options>",
  "ctaChange": "<one of the CTA options>",
  "lengthChange": "<one of the length options>",
  "summary": "<1 sentence describing the most significant change>"
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an expert at analyzing email edits. Always respond with valid JSON only.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0,
          max_tokens: 500,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);

      return result;

    } catch (error) {
      console.error('[Friday Edit Analyzer] Error analyzing edits:', error);

      // Fallback to simple heuristics
      return {
        toneChange: 'Unable to analyze (API error)',
        ctaChange: 'Unable to analyze (API error)',
        lengthChange: categorizeLengthChange(originalText, finalText),
        summary: 'Analysis failed'
      };
    }
  }

  /**
   * Simple heuristic for length change
   */
  function categorizeLengthChange(original, final) {
    const origWords = original.split(/\s+/).length;
    const finalWords = final.split(/\s+/).length;
    const change = ((finalWords - origWords) / origWords) * 100;

    if (change > 20) return 'Expanded';
    if (change < -20) return 'Shortened';
    return 'No significant change';
  }

  /**
   * Generate unique draft ID
   */
  function generateDraftId() {
    return 'draft_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
  }

  /**
   * Get OpenAI API key from storage
   */
  async function getOpenAIKey() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get(['openai_api_key'], (result) => {
          resolve(result.openai_api_key || '');
        });
      } else {
        resolve(localStorage.getItem('openai_api_key') || '');
      }
    });
  }

  /**
   * Store draft in Chrome storage
   */
  function storeDraft(draft) {
    const draftRecord = {
      id: draft.id,
      originalText: draft.originalText,
      originalWordCount: draft.originalWordCount,
      generatedAt: draft.generatedAt,
      timestamp: draft.timestamp,
      status: 'pending'
    };

    // Get existing drafts and add this one
    chrome.storage.local.get(['drafts'], (result) => {
      const drafts = result.drafts || [];
      drafts.push(draftRecord);
      chrome.storage.local.set({ drafts }, () => {
        console.log('[Friday Edit Analyzer] ✅ Draft stored in Chrome storage');
      });
    });
  }

  /**
   * Update draft with analysis results
   */
  function updateDraftWithAnalysis(draftId, analysisData) {
    chrome.storage.local.get(['drafts'], (result) => {
      const drafts = result.drafts || [];
      const draftIndex = drafts.findIndex(d => d.id === draftId);

      if (draftIndex !== -1) {
        drafts[draftIndex] = {
          ...drafts[draftIndex],
          finalText: analysisData.finalText,
          finalWordCount: analysisData.finalWordCount,
          sentAt: analysisData.sentAt,
          sendDelay: analysisData.sendDelay,
          editPercentage: analysisData.editPercentage,
          toneChange: analysisData.toneChange,
          ctaChange: analysisData.ctaChange,
          lengthChange: analysisData.lengthChange,
          summary: analysisData.summary,
          status: analysisData.status || 'editing'
        };

        chrome.storage.local.set({ drafts }, () => {
          console.log('[Friday Edit Analyzer] ✅ Draft updated in Chrome storage:', drafts[draftIndex]);
        });
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();
