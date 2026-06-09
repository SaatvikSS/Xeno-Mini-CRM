import { useState, useEffect } from 'react';
import { getCampaigns, createCampaign, sendCampaign, deleteCampaign, getCampaignStats, getSegments, aiGenerateMessage } from '../services/api';
import { Plus, Send, Trash2, Sparkles, RefreshCw, Eye } from 'lucide-react';

const CHANNELS = [
  { value: 'whatsapp', label: 'WhatsApp', emoji: '💬' },
  { value: 'sms', label: 'SMS', emoji: '📱' },
  { value: 'email', label: 'Email', emoji: '📧' },
  { value: 'rcs', label: 'RCS', emoji: '✨' },
];

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [sending, setSending] = useState(null);
  const [polling, setPolling] = useState(null);

  // Form state
  const [name, setName] = useState('');
  const [segmentId, setSegmentId] = useState('');
  const [channel, setChannel] = useState('whatsapp');
  const [messageTemplate, setMessageTemplate] = useState('');
  const [subject, setSubject] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchCampaigns = () => {
    setLoading(true);
    getCampaigns().then(r => setCampaigns(r.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCampaigns();
    getSegments().then(r => setSegments(r.data)).catch(() => {});
  }, []);

  // Poll for stats of active campaigns
  useEffect(() => {
    const active = campaigns.filter(c => c.status === 'sending' || c.status === 'sent');
    if (active.length === 0) return;
    const interval = setInterval(() => {
      active.forEach(c => {
        getCampaignStats(c._id).then(res => {
          setCampaigns(prev => prev.map(p => p._id === c._id ? { ...p, stats: res.data } : p));
        }).catch(() => {});
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [campaigns.length]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      await createCampaign({ name, segment_id: segmentId, channel, message_template: messageTemplate, subject });
      setShowCreate(false);
      resetForm();
      fetchCampaigns();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const handleSend = async (id) => {
    setSending(id);
    try {
      await sendCampaign(id);
      fetchCampaigns();
    } catch (err) { console.error(err); }
    setSending(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this campaign?')) return;
    await deleteCampaign(id);
    fetchCampaigns();
  };

  const handleAIDraft = async () => {
    const seg = segments.find(s => s._id === segmentId);
    setAiLoading(true);
    try {
      const res = await aiGenerateMessage({
        channel,
        audience_description: seg?.name || 'general customers',
        tone: 'friendly and engaging',
        goal: 'drive re-engagement and purchases',
      });
      if (res.data.parsed?.message) setMessageTemplate(res.data.parsed.message);
      if (res.data.parsed?.subject) setSubject(res.data.parsed.subject);
    } catch (err) { console.error(err); }
    setAiLoading(false);
  };

  const resetForm = () => { setName(''); setSegmentId(''); setChannel('whatsapp'); setMessageTemplate(''); setSubject(''); };

  const getStatusBadge = (status) => {
    const map = { draft: 'badge-info', sending: 'badge-warning', sent: 'badge-success', completed: 'badge-success' };
    return map[status] || '';
  };

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div><h2>Campaigns</h2><p>Create and manage marketing campaigns</p></div>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowCreate(true); }}>
            <Plus size={16} /> New Campaign
          </button>
        </div>
      </div>
      <div className="page-body">
        {loading ? (
          <div style={{display:'grid', gap:16}}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{height:100}} />)}</div>
        ) : campaigns.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📢</div>
            <h3>No campaigns yet</h3>
            <p>Create your first campaign to start reaching your shoppers</p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> New Campaign</button>
          </div>
        ) : (
          <div style={{display:'grid', gap:16}}>
            {campaigns.map(c => {
              const s = c.stats || {};
              const deliveryRate = s.total ? ((s.delivered + s.opened + s.read + s.clicked) / s.total * 100).toFixed(1) : 0;
              return (
                <div key={c._id} className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-8">
                        <h4 style={{fontSize:15, fontWeight:700}}>{c.name}</h4>
                        <span className={`badge ${getStatusBadge(c.status)}`}>{c.status}</span>
                        <span className="badge badge-accent">{CHANNELS.find(ch => ch.value === c.channel)?.emoji} {c.channel}</span>
                      </div>
                      <p style={{fontSize:12, color:'var(--text-muted)', marginTop:4}}>
                        Audience: {c.segment_id?.name || '—'} · {s.total || 0} recipients
                      </p>
                    </div>
                    <div className="flex gap-8">
                      {c.status === 'draft' && (
                        <button className="btn btn-primary btn-sm" onClick={() => handleSend(c._id)} disabled={sending === c._id}>
                          {sending === c._id ? <><span className="spinner" /> Sending...</> : <><Send size={14} /> Send</>}
                        </button>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(c._id)}><Trash2 size={14} /></button>
                    </div>
                  </div>

                  {/* Stats bar */}
                  {(c.status !== 'draft') && (
                    <div style={{marginTop:16}}>
                      <div className="flex gap-16" style={{flexWrap:'wrap'}}>
                        {[
                          { label: 'Sent', value: s.sent || 0, color: 'var(--info)' },
                          { label: 'Delivered', value: s.delivered || 0, color: 'var(--success)' },
                          { label: 'Failed', value: s.failed || 0, color: 'var(--error)' },
                          { label: 'Opened', value: s.opened || 0, color: 'var(--accent-light)' },
                          { label: 'Read', value: s.read || 0, color: '#06b6d4' },
                          { label: 'Clicked', value: s.clicked || 0, color: 'var(--warning)' },
                        ].map(st => (
                          <div key={st.label} style={{textAlign:'center', minWidth:60}}>
                            <div style={{fontSize:20, fontWeight:800, color: st.color}}>{st.value}</div>
                            <div style={{fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:0.5}}>{st.label}</div>
                          </div>
                        ))}
                      </div>
                      {/* Progress bar */}
                      <div style={{marginTop:12, height:6, background:'var(--bg-elevated)', borderRadius:3, overflow:'hidden'}}>
                        <div style={{
                          height:'100%',
                          width: `${deliveryRate}%`,
                          background: 'var(--gradient-success)',
                          borderRadius:3,
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                      <div style={{fontSize:11, color:'var(--text-muted)', marginTop:4}}>{deliveryRate}% delivery rate</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Create Campaign Modal */}
        {showCreate && (
          <div className="modal-overlay" onClick={() => setShowCreate(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:600}}>
              <div className="modal-header">
                <h3>New Campaign</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Campaign Name</label>
                  <input className="input" placeholder="e.g. Summer Re-engagement" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label>Audience</label>
                    <select className="select" value={segmentId} onChange={e => setSegmentId(e.target.value)}>
                      <option value="">Select audience...</option>
                      {segments.map(s => <option key={s._id} value={s._id}>{s.name} ({s.customer_count})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Channel</label>
                    <select className="select" value={channel} onChange={e => setChannel(e.target.value)}>
                      {CHANNELS.map(ch => <option key={ch.value} value={ch.value}>{ch.emoji} {ch.label}</option>)}
                    </select>
                  </div>
                </div>
                {channel === 'email' && (
                  <div className="form-group">
                    <label>Subject Line</label>
                    <input className="input" placeholder="Email subject..." value={subject} onChange={e => setSubject(e.target.value)} />
                  </div>
                )}
                <div className="form-group">
                  <div className="flex items-center justify-between" style={{marginBottom:6}}>
                    <label style={{margin:0}}>Message Template</label>
                    <button className="btn btn-ghost btn-sm" onClick={handleAIDraft} disabled={aiLoading || !segmentId}>
                      {aiLoading ? <><span className="spinner" /> Drafting...</> : <><Sparkles size={12} /> AI Draft</>}
                    </button>
                  </div>
                  <textarea className="textarea" placeholder="Hi {{first_name}}! ..." value={messageTemplate} onChange={e => setMessageTemplate(e.target.value)} rows={4} />
                  <p style={{fontSize:11, color:'var(--text-muted)', marginTop:4}}>Use {'{{name}}'}, {'{{first_name}}'}, {'{{city}}'} for personalization</p>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleCreate} disabled={!name || !segmentId || !messageTemplate || saving}>
                  {saving ? 'Creating...' : 'Create Campaign'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
