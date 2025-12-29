# Friday Draft Edit Analyzer

An internal analytics tool that tracks how users edit Friday AI-generated email drafts in Gmail.

## Quick Start

1. **Install Extension**
   - Open Chrome and go to `chrome://extensions`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked" and select the `email-quality-analyzer` folder

2. **Configure OpenAI API Key**
   - Click the extension icon in Chrome toolbar
   - Enter your OpenAI API key (starts with `sk-...`)
   - Click "Save API Key"

3. **Use Friday in Gmail**
   - Compose a new email or reply to an existing one
   - Paste Friday-generated draft (30+ words)
   - Make edits as needed
   - Wait 3 seconds after stopping typing for analysis

4. **View Analytics**
   - Click the extension icon to see dashboard
   - Scroll through individual draft cards
   - See what changed: tone, CTA, length

## How It Works

**Detection**
- Works in compose windows, replies, and forwards
- Automatically detects Friday drafts when 30+ words and 100+ characters appear within 2 seconds (paste pattern)
- Captures the original text and timestamp
- Tracks all subsequent edits in real-time

**Analysis**
- Waits 3 seconds after you stop typing to avoid spam
- Calculates edit percentage using Levenshtein distance
- Uses OpenAI GPT-4o-mini to classify changes:
  - **Tone**: More formal, more casual, or no change
  - **CTA**: Vague → specific, added, removed, or no change
  - **Length**: Shortened, expanded, or no change
- Generates a 1-sentence summary of the most significant change

**Storage**
- Stores all drafts in Chrome's local storage (persists across sessions)
- Data stays on your machine, never sent to external servers (except OpenAI for analysis)

## Dashboard Features

**Quick Stats**
- Total drafts tracked
- Average edit percentage across all drafts

**Individual Draft Cards** (scrollable)
- Draft number and timestamp
- Color-coded severity badge (green <25%, orange 25-50%, red >50%)
- Original draft preview (first 150 characters)
- Final draft preview (if edited)
- Tone/CTA/Length analysis results
- AI-generated summary of changes

**Settings**
- Save/update OpenAI API key
- Clear all data (with confirmation)

## Cost

- ~$0.002 per analysis (OpenAI GPT-4o-mini)
- Only analyzes when edits are ≥10% different from original

## Files

- `manifest.json` - Chrome extension configuration
- `content.js` - Main detection and tracking logic (runs on Gmail)
- `popup.html` - Dashboard UI
- `popup.js` - Dashboard logic
- `popup-styles.css` - Dashboard styles
