import { useState, useEffect } from 'react';
import { getCampaigns, getCampaign, aiCampaignInsights } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Sparkles, TrendingUp, RefreshCw } from 'lucide-react';

export default function Analytics() {
  const [campaigns, setCampaigns] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    getCampaigns()
      .then(r => {
        const sent = r.data.filter(c => c.status !== 'draft');
        setCampaigns(sent);
        if (sent.length > 0) loadDetail(sent[0]._id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const loadDetail = async (id) => {
    setSelected(id);
    setInsight('');
    try {
      const res = await getCampaign(id);
      setDetail(res.data);
    } catch (err) { console.error(err); }
  };

  const getInsights = async () => {
    if (!selected) return;
    setInsightLoading(true);
    try {
      const res = await aiCampaignInsights(selected);
      setInsight(res.data.parsed?.text || res.data.raw || 'Unable to generate insights');
    } catch (err) { setInsight('Error generating insights'); }
    setInsightLoading(false);
  };

  if (loading) return <div className="page-body"><div className="skeleton" style={{height:400}} /></div>;

  const s = detail?.stats || {};
  const funnel = [
    { name: 'Sent', value: s.sent || 0, fill: '#3b82f6' },
    { name: 'Delivered', value: s.delivered || 0, fill: '#10b981' },
    { name: 'Opened', value: s.opened || 0, fill: '#8b5cf6' },
    { name: 'Read', value: s.read || 0, fill: '#06b6d4' },
    { name: 'Clicked', value: s.clicked || 0, fill: '#f59e0b' },
  ];

  const barData = funnel.map(f => ({ ...f, fill: undefined }));

  return (
    <>
      <div className="page-header">
        <h2>Campaign Analytics</h2>
        <p>Track and analyze campaign performance</p>
      </div>
      <div className="page-body">
        {campaigns.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>No campaign data yet</h3>
            <p>Send a campaign to see performance analytics here</p>
          </div>
        ) : (
          <>
            {/* Campaign Selector */}
            <div className="flex items-center gap-16 mb-16" style={{flexWrap:'wrap'}}>
              <select className="select" style={{maxWidth:300}} value={selected || ''} onChange={e => loadDetail(e.target.value)}>
                {campaigns.map(c => (
                  <option key={c._id} value={c._id}>{c.name} ({c.channel})</option>
                ))}
              </select>
              <button className="btn btn-secondary btn-sm" onClick={() => loadDetail(selected)}><RefreshCw size={14} /> Refresh</button>
              <button className="btn btn-primary btn-sm" onClick={getInsights} disabled={insightLoading}>
                {insightLoading ? <><span className="spinner" /> Analyzing...</> : <><Sparkles size={14} /> AI Insights</>}
              </button>
            </div>

            {detail && (
              <>
                {/* KPI Cards */}
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-label">Total Recipients</div>
                    <div className="stat-value">{s.total || 0}</div>
                  </div>
                  <div className="stat-card success">
                    <div className="stat-label">Delivery Rate</div>
                    <div className="stat-value">
                      {s.total ? (((s.delivered + s.opened + s.read + s.clicked) / s.total) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                  <div className="stat-card cool">
                    <div className="stat-label">Open Rate</div>
                    <div className="stat-value">
                      {(s.delivered + s.opened + s.read + s.clicked) ? (((s.opened + s.read + s.clicked) / (s.delivered + s.opened + s.read + s.clicked)) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                  <div className="stat-card warm">
                    <div className="stat-label">Click Rate</div>
                    <div className="stat-value">
                      {(s.delivered + s.opened + s.read + s.clicked) ? ((s.clicked / (s.delivered + s.opened + s.read + s.clicked)) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid-2">
                  <div className="card">
                    <h3 style={{fontSize:15, fontWeight:700, marginBottom:16}}>Delivery Funnel</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={funnel} layout="vertical">
                        <XAxis type="number" tick={{fill:'#9898b0', fontSize:11}} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="name" tick={{fill:'#9898b0', fontSize:11}} axisLine={false} tickLine={false} width={70} />
                        <Tooltip contentStyle={{background:'#1a1a2e', border:'1px solid #2a2a45', borderRadius:8}} />
                        <Bar dataKey="value" radius={[0,6,6,0]}>
                          {funnel.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="card">
                    <h3 style={{fontSize:15, fontWeight:700, marginBottom:16}}>Status Breakdown</h3>
                    <div style={{display:'grid', gap:12, marginTop:8}}>
                      {[
                        { label:'Sent', val: s.sent, total: s.total, color:'#3b82f6' },
                        { label:'Delivered', val: s.delivered, total: s.total, color:'#10b981' },
                        { label:'Failed', val: s.failed, total: s.total, color:'#ef4444' },
                        { label:'Opened', val: s.opened, total: s.total, color:'#8b5cf6' },
                        { label:'Read', val: s.read, total: s.total, color:'#06b6d4' },
                        { label:'Clicked', val: s.clicked, total: s.total, color:'#f59e0b' },
                      ].map(item => (
                        <div key={item.label}>
                          <div className="flex items-center justify-between" style={{marginBottom:4}}>
                            <span style={{fontSize:12, color:'var(--text-secondary)'}}>{item.label}</span>
                            <span style={{fontSize:12, fontWeight:700}}>{item.val || 0} ({item.total ? ((item.val / item.total) * 100).toFixed(1) : 0}%)</span>
                          </div>
                          <div style={{height:6, background:'var(--bg-elevated)', borderRadius:3, overflow:'hidden'}}>
                            <div style={{height:'100%', width:`${item.total ? (item.val/item.total)*100 : 0}%`, background:item.color, borderRadius:3, transition:'width 0.5s'}} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* AI Insights */}
                {insight && (
                  <div className="card mt-24" style={{borderColor:'var(--accent)', borderWidth:1}}>
                    <h3 style={{fontSize:15, fontWeight:700, marginBottom:12}}><Sparkles size={16} style={{display:'inline', marginRight:8}} />AI Campaign Insights</h3>
                    <div style={{fontSize:13, lineHeight:1.7, color:'var(--text-secondary)', whiteSpace:'pre-wrap'}}>{insight}</div>
                  </div>
                )}

                {/* Communication Logs */}
                {detail.logs?.length > 0 && (
                  <div className="card mt-24">
                    <h3 style={{fontSize:15, fontWeight:700, marginBottom:16}}>Message Log (Recent)</h3>
                    <div className="table-container">
                      <table>
                        <thead><tr><th>Customer</th><th>Channel</th><th>Status</th><th>Message</th></tr></thead>
                        <tbody>
                          {detail.logs.slice(0, 20).map(log => (
                            <tr key={log._id}>
                              <td style={{fontWeight:500}}>{log.customer_id?.name || '—'}</td>
                              <td><span className="badge badge-info">{log.channel}</span></td>
                              <td><span className={`badge badge-${log.status === 'failed' ? 'error' : log.status === 'clicked' ? 'warning' : 'success'}`}>{log.status}</span></td>
                              <td className="truncate" style={{maxWidth:300, color:'var(--text-muted)'}}>{log.personalised_message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}

