import { useState, useRef, useEffect } from 'react';
import { aiChat } from '../services/api';
import { X, Send, Sparkles, Bot, User } from 'lucide-react';

export default function Copilot({ onClose }) {
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Hey! 👋 I\'m your AI copilot. I can help you:\n\n• Create audience segments from natural language\n• Draft campaign messages for any channel\n• Analyze campaign performance\n• Answer questions about your customer data\n\nTry: "Find customers who spent over ₹5000 but haven\'t ordered in 60 days"' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEnd = useRef(null);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await aiChat(userMsg);
      const data = res.data;
      let aiContent = '';

      if (data.parsed?.action === 'create_segment') {
        aiContent = `🎯 **Segment Created**\n\n**${data.parsed.name}**\n${data.parsed.description || ''}\n\nRules:\n${data.parsed.rules?.conditions?.map(c => `• ${c.field} ${c.operator} ${c.value}`).join('\n') || ''}\n\n${data.parsed.preview_count !== undefined ? `📊 **${data.parsed.preview_count} customers** match this segment` : ''}\n\n*Go to Audiences → AI Segment to save this*`;
      } else if (data.parsed?.action === 'draft_message') {
        aiContent = `✉️ **Message Draft** (${data.parsed.channel})\n\n${data.parsed.subject ? `**Subject:** ${data.parsed.subject}\n\n` : ''}${data.parsed.message}\n\n*Copy this into your campaign message template*`;
      } else if (data.parsed?.action === 'insight') {
        aiContent = data.parsed.text;
      } else {
        aiContent = data.raw || 'I couldn\'t process that request. Try asking me to create a segment or draft a message.';
      }

      setMessages(prev => [...prev, { role: 'ai', content: aiContent }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: '❌ Sorry, I encountered an error. Make sure the Gemini API key is configured.' }]);
    }
    setLoading(false);
  };

  return (
    <div className="copilot-panel">
      <div className="copilot-header">
        <h3><Sparkles size={18} /> AI Copilot</h3>
        <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
      </div>

      <div className="copilot-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`copilot-msg ${msg.role}`}>
            <div style={{whiteSpace:'pre-wrap'}}>{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div className="copilot-msg ai">
            <div className="flex items-center gap-8">
              <span className="spinner" /> Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEnd} />
      </div>

      <div className="copilot-input-area">
        <input
          className="input"
          placeholder="Ask me anything..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button className="btn btn-primary" onClick={handleSend} disabled={!input.trim() || loading}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
