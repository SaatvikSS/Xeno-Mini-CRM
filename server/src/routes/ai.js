const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');
const Customer = require('../models/Customer');
const Campaign = require('../models/Campaign');
const CommunicationLog = require('../models/CommunicationLog');
const Segment = require('../models/Segment');
const { getSegmentCount } = require('../services/segmentEngine');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// System prompt for the AI copilot
const SYSTEM_PROMPT = `You are an AI copilot for "Brew & Co.", a premium D2C coffee brand's CRM platform called Xeno CRM. 
You help marketers create audience segments, draft campaign messages, and analyze performance.

Available segment fields and their types:
- total_spend (number, in INR) — customer's total purchase value
- total_orders (number) — count of orders placed
- last_order_date (date) — date of most recent order
- first_order_date (date) — date of first order
- city (string) — customer's city
- tags (array of strings) — behavioral tags like: vip, high-value, loyal, one-time, churning, dormant, recent, gen-z, millennial
- channel_preferences (array of strings) — preferred channels: whatsapp, sms, email, rcs
- age_group (string) — one of: 18-24, 25-34, 35-44, 45-54, 55+
- gender (string) — male, female, non-binary, prefer_not_to_say
- days_since_last_order (computed, number) — days since their last purchase

Available operators: eq, neq, gt, gte, lt, lte, contains, not_contains, in, not_in, between
Rule groups use: AND, OR

When creating segments, output ONLY valid JSON in this exact format:
{
  "action": "create_segment",
  "name": "Segment Name",
  "description": "Description of the segment",
  "rules": {
    "operator": "AND",
    "conditions": [
      { "field": "field_name", "operator": "operator", "value": value }
    ]
  }
}

When drafting messages, output:
{
  "action": "draft_message",
  "channel": "whatsapp|sms|email|rcs",
  "subject": "Email subject (if email)",
  "message": "The message with {{name}}, {{first_name}}, {{city}} placeholders"
}

When giving insights or analysis, output:
{
  "action": "insight",
  "text": "Your analysis text in markdown"
}

Today's date is ${new Date().toISOString().split('T')[0]}.
Always be concise, actionable, and marketing-savvy.`;

// POST /api/ai/chat — main copilot endpoint
router.post('/chat', async (req, res, next) => {
  try {
    const { message, context } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    // Build context about current data
    let dataContext = '';
    try {
      const [customerCount, segmentCount, campaignCount] = await Promise.all([
        Customer.countDocuments(),
        Segment.countDocuments(),
        Campaign.countDocuments(),
      ]);
      const cities = await Customer.distinct('city');
      const tags = await Customer.distinct('tags');
      
      dataContext = `\nCurrent data: ${customerCount} customers across cities: ${cities.join(', ')}. Tags in use: ${tags.join(', ')}. ${segmentCount} segments, ${campaignCount} campaigns.`;
    } catch (e) {
      dataContext = '';
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `${SYSTEM_PROMPT}${dataContext}\n\nUser: ${message}${context ? `\nContext: ${JSON.stringify(context)}` : ''}`,
    });

    const text = response.text;

    // Try to parse as JSON action
    let parsed = null;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Not JSON, treat as plain text insight
    }

    res.json({
      raw: text,
      parsed,
      type: parsed?.action || 'insight',
    });
  } catch (err) { next(err); }
});

// POST /api/ai/generate-message — generate a campaign message
router.post('/generate-message', async (req, res, next) => {
  try {
    const { channel, audience_description, tone, goal } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const prompt = `${SYSTEM_PROMPT}

Generate a ${channel} marketing message for Brew & Co. coffee brand.
Audience: ${audience_description}
Tone: ${tone || 'friendly and engaging'}
Goal: ${goal || 'drive engagement'}
Channel: ${channel}

${channel === 'sms' ? 'Keep it under 160 characters.' : ''}
${channel === 'whatsapp' ? 'Use emojis naturally. Keep it conversational.' : ''}
${channel === 'email' ? 'Include a compelling subject line.' : ''}

Use {{name}} and {{first_name}} for personalization.

Respond with ONLY JSON:
{
  "action": "draft_message",
  "channel": "${channel}",
  "subject": "subject line if email",
  "message": "the message"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const text = response.text;
    let parsed = null;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch (e) { /* fallback to raw text */ }

    res.json({ raw: text, parsed });
  } catch (err) { next(err); }
});

// POST /api/ai/segment-from-text — convert natural language to segment rules
router.post('/segment-from-text', async (req, res, next) => {
  try {
    const { query } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const prompt = `${SYSTEM_PROMPT}

Convert this natural language description into segment rules.
Query: "${query}"

Respond with ONLY valid JSON:
{
  "action": "create_segment",
  "name": "Descriptive Segment Name",
  "description": "What this segment represents",
  "rules": {
    "operator": "AND or OR",
    "conditions": [
      { "field": "valid_field", "operator": "valid_operator", "value": "value" }
    ]
  }
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const text = response.text;
    let parsed = null;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch (e) { /* fallback */ }

    // If we got valid rules, also get the count
    if (parsed?.rules) {
      const count = await getSegmentCount(parsed.rules);
      parsed.preview_count = count;
    }

    res.json({ raw: text, parsed });
  } catch (err) { next(err); }
});

// POST /api/ai/campaign-insights — analyze a campaign
router.post('/campaign-insights', async (req, res, next) => {
  try {
    const { campaign_id } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const campaign = await Campaign.findById(campaign_id).populate('segment_id').lean();
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const prompt = `${SYSTEM_PROMPT}

Analyze this campaign performance and provide actionable insights:
Campaign: "${campaign.name}"
Channel: ${campaign.channel}
Audience: ${campaign.segment_id?.name || 'Unknown'} (${campaign.stats.total} customers)
Stats:
- Sent: ${campaign.stats.sent}
- Delivered: ${campaign.stats.delivered} (${campaign.stats.total ? ((campaign.stats.delivered / campaign.stats.total) * 100).toFixed(1) : 0}%)
- Failed: ${campaign.stats.failed}
- Opened: ${campaign.stats.opened} (${campaign.stats.delivered ? ((campaign.stats.opened / campaign.stats.delivered) * 100).toFixed(1) : 0}%)
- Read: ${campaign.stats.read}
- Clicked: ${campaign.stats.clicked} (${campaign.stats.delivered ? ((campaign.stats.clicked / campaign.stats.delivered) * 100).toFixed(1) : 0}%)

Provide a concise analysis with:
1. Performance summary
2. What worked well
3. Areas for improvement
4. Recommended next steps

Respond with JSON: { "action": "insight", "text": "your markdown analysis" }`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const text = response.text;
    let parsed = null;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch (e) { /* fallback */ }

    res.json({ raw: text, parsed });
  } catch (err) { next(err); }
});

module.exports = router;
