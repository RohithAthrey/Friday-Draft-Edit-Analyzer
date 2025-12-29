// Friday Draft Edit Analytics - Dashboard
// This powers the popup UI where users see all their draft analytics

document.addEventListener('DOMContentLoaded', async () => {
  // Check if they already saved an API key
  const apiKey = await getAPIKey();
  if (apiKey) {
    document.getElementById('api-key-input').value = apiKey;
    showStatus('API key configured ✓', '#059669');
  }

  // Load and display all the draft analytics
  loadAnalytics();

  // Hook up the buttons
  document.getElementById('save-api-key').addEventListener('click', saveAPIKey);
  document.getElementById('clear-data').addEventListener('click', clearAllData);
});

async function getAPIKey() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['openai_api_key'], (result) => {
      resolve(result.openai_api_key || '');
    });
  });
}

function saveAPIKey() {
  const apiKey = document.getElementById('api-key-input').value.trim();
  if (!apiKey.startsWith('sk-')) {
    showStatus('Invalid API key format', '#dc2626');
    return;
  }

  chrome.storage.sync.set({ openai_api_key: apiKey }, () => {
    showStatus('API key saved successfully ✓', '#059669');
  });
}

function showStatus(message, color) {
  const status = document.getElementById('api-status');
  status.textContent = message;
  status.style.color = color;
  status.style.display = 'block';

  setTimeout(() => {
    status.style.display = 'none';
  }, 3000);
}

async function loadAnalytics() {
  chrome.storage.local.get(['drafts'], (result) => {
    const allDrafts = result.drafts || [];
    console.log('[Popup] All drafts from Chrome storage:', allDrafts);

    // Show drafts that have been analyzed (editing) or sent
    const drafts = allDrafts.filter(d => d.status === 'sent' || d.status === 'editing');
    console.log('[Popup] Filtered drafts:', drafts);
    displayAnalytics(drafts);
  });
}

function displayAnalytics(drafts) {
  // Update the quick stats at the top
  document.getElementById('total-drafts').textContent = drafts.length;

  if (drafts.length === 0) {
    document.getElementById('avg-edit').textContent = '0%';
    document.getElementById('drafts-list').innerHTML = '<p style="color:#6b7280;padding:20px;text-align:center;">No drafts analyzed yet</p>';
    return;
  }

  // Calculate average edit percentage
  const avgEdit = drafts.reduce((sum, d) => sum + (d.editPercentage || 0), 0) / drafts.length;
  document.getElementById('avg-edit').textContent = Math.round(avgEdit) + '%';

  // Show most recent drafts first
  const sortedDrafts = [...drafts].sort((a, b) => b.timestamp - a.timestamp);

  // Build the individual draft cards (one for each draft)
  const draftsList = document.getElementById('drafts-list');
  draftsList.innerHTML = sortedDrafts.map((draft, index) => {
    const editSeverity = getEditSeverity(draft.editPercentage || 0);
    const truncatedOriginal = truncateText(draft.originalText || '', 150);
    const truncatedFinal = truncateText(draft.finalText || draft.originalText || '', 150);
    const date = new Date(draft.generatedAt || draft.timestamp);

    return `
      <div class="draft-card">
        <div class="draft-header">
          <div class="draft-title">
            <span class="draft-number">Draft #${sortedDrafts.length - index}</span>
            <span class="draft-date">${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
          <span class="edit-badge ${editSeverity.class}">${draft.editPercentage || 0}% edited</span>
        </div>

        <div class="draft-content">
          <div class="text-section">
            <div class="text-label">Original Draft:</div>
            <div class="text-preview">${truncatedOriginal}</div>
          </div>

          ${draft.finalText ? `
            <div class="text-section">
              <div class="text-label">Final Draft:</div>
              <div class="text-preview">${truncatedFinal}</div>
            </div>
          ` : ''}
        </div>

        ${draft.toneChange || draft.ctaChange || draft.lengthChange ? `
          <div class="draft-analysis">
            <div class="analysis-grid">
              ${draft.toneChange ? `
                <div class="analysis-item">
                  <span class="analysis-label">Tone:</span>
                  <span class="analysis-value">${draft.toneChange}</span>
                </div>
              ` : ''}
              ${draft.ctaChange ? `
                <div class="analysis-item">
                  <span class="analysis-label">CTA:</span>
                  <span class="analysis-value">${draft.ctaChange}</span>
                </div>
              ` : ''}
              ${draft.lengthChange ? `
                <div class="analysis-item">
                  <span class="analysis-label">Length:</span>
                  <span class="analysis-value">${draft.lengthChange}</span>
                </div>
              ` : ''}
            </div>
            ${draft.summary ? `
              <div class="draft-summary">${draft.summary}</div>
            ` : ''}
          </div>
        ` : '<div class="draft-pending">Analysis pending...</div>'}
      </div>
    `;
  }).join('');
}

function getEditSeverity(percentage) {
  if (percentage < 25) return { class: 'severity-minimal', label: 'Minimal' };
  if (percentage <= 50) return { class: 'severity-moderate', label: 'Moderate' };
  return { class: 'severity-heavy', label: 'Heavy' };
}

function truncateText(text, maxLength) {
  if (!text) return 'No text available';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function clearAllData() {
  // Double check they really want to do this
  if (!confirm('Are you sure you want to clear all draft data? This cannot be undone.')) {
    return;
  }

  // Wipe everything and refresh the dashboard
  chrome.storage.local.remove('drafts', () => {
    showStatus('All data cleared ✓', '#059669');
    loadAnalytics(); // Refresh to show empty state
  });
}
