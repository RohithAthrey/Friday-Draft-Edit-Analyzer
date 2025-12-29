# Quick Start Guide - Friday Email Quality Analyzer

## 5-Minute Setup

### Step 1: Get OpenAI API Key (2 minutes)
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-`)
4. Keep it handy for Step 3

### Step 2: Install Extension (1 minute)
1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top-right toggle)
4. Click "Load unpacked"
5. Select the `email-quality-analyzer` folder
6. Extension installed!

### Step 3: Configure API Key (1 minute)
1. Click the Friday extension icon in Chrome toolbar
2. Paste your OpenAI API key
3. Click "Save Settings"
4. Done!

### Step 4: Test It Out (1 minute)
1. Open Gmail (mail.google.com)
2. Click "Compose" to start a new email
3. Look for the "📊 Email Quality Score" panel on the right
4. Write a quick test email
5. Click "Analyze Draft"
6. See your results!

## What You'll See

- **Overall Score**: 1-10 rating with color coding
- **4 Metric Scores**: Tone, Clarity, CTA, Length
- **Issues**: Specific problems identified
- **Top 3 Suggestions**: Prioritized improvements
- **Strengths**: What you're doing well

## Sample Test Email

Try analyzing this:

```
Hey there,

Just wanted to reach out about that project we discussed.
Let me know what you think.

Thanks!
```

Expected result: Score around 4-5/10 with suggestions to:
- Be more specific about "that project"
- Add a clear call-to-action
- Increase length with more context
- Clarify the tone for professional context

## Tips for Best Results

1. **Write first, analyze second**: Complete your draft before analyzing
2. **Multiple iterations**: Analyze, improve, analyze again
3. **Learn patterns**: Notice which suggestions appear frequently
4. **Trust the scores**: 8+ is excellent, below 6 needs revision
5. **Focus on top 3**: Don't try to fix everything at once

## Troubleshooting

**Panel not showing?**
- Refresh Gmail page
- Check extension is enabled in chrome://extensions/

**Analysis failing?**
- Verify API key is saved (click extension icon)
- Check you have OpenAI credits
- Open DevTools (F12) and check Console for errors

**Scores seem off?**
- Email type detection may be wrong (check console logs)
- Try being more explicit in your subject line

## Need Help?

Check the full [README.md](README.md) for detailed documentation.

## Cost

Each analysis costs approximately **$0.002** (less than 1 cent).
100 analyses = about $0.20

---

**You're all set! Start writing better emails.** 📧✨
