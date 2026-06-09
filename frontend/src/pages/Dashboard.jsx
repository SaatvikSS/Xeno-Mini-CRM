import { useState, useEffect } from 'react';
import { getDashboardStats } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, ShoppingBag, Megaphone, TrendingUp, Zap } from 'lucide-react';

const COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#8b5cf6'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page-body">
      <div className="stats-grid">
        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{height: 120}} />)}
      </div>
    </div>
  );

  const ov = stats?.overview || {};
  const formatCurrency = (val) => `₹${(val / 1000).toFixed(1)}K`;

  return (
    <>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Welcome back — here's how Brew & Co. is performing</p>
      </div>
      <div className="page-body">
        {/* KPI Cards */}
        <div className="stats-grid">
          <div className="stat-card animate-in">
            <div className="stat-label"><Users size={14} style={{display:'inline', marginRight:6}} />Total Customers</div>
            <div className="stat-value">{ov.totalCustomers?.toLocaleString() || 0}</div>
            <div className="stat-sub">Across all channels</div>
          </div>
          <div className="stat-card warm animate-in" style={{animationDelay:'0.1s'}}>
            <div className="stat-label"><ShoppingBag size={14} style={{display:'inline', marginRight:6}} />Total Orders</div>
            <div className="stat-value">{ov.totalOrders?.toLocaleString() || 0}</div>
            <div className="stat-sub">Lifetime purchases</div>
          </div>
          <div className="stat-card cool animate-in" style={{animationDelay:'0.2s'}}>
            <div className="stat-label"><TrendingUp size={14} style={{display:'inline', marginRight:6}} />Revenue</div>
            <div className="stat-value">{formatCurrency(ov.totalRevenue || 0)}</div>
            <div className="stat-sub">Completed orders</div>
          </div>
          <div className="stat-card success animate-in" style={{animationDelay:'0.3s'}}>
            <div className="stat-label"><Megaphone size={14} style={{display:'inline', marginRight:6}} />Campaigns</div>
            <div className="stat-value">{ov.totalCampaigns || 0}</div>
            <div className="stat-sub">{ov.activeCampaigns || 0} active</div>
          </div>
        </div>

        <div className="grid-2">
          {/* City Distribution */}
          <div className="card animate-in" style={{animationDelay:'0.4s'}}>
            <h3 style={{fontSize:15, fontWeight:700, marginBottom:16}}>Customers by City</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={(stats?.topCities || []).map(c => ({ name: c._id, value: c.count }))}>
                <XAxis dataKey="name" tick={{fill:'#9898b0', fontSize:11}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill:'#9898b0', fontSize:11}} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{background:'#1a1a2e', border:'1px solid #2a2a45', borderRadius:8, fontSize:12}} />
                <Bar dataKey="value" fill="#7c3aed" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tag Distribution */}
          <div className="card animate-in" style={{animationDelay:'0.5s'}}>
            <h3 style={{fontSize:15, fontWeight:700, marginBottom:16}}>Customer Tags</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={(stats?.tagDistribution || []).map(t => ({ name: t._id, value: t.count }))}
                  dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50}
                  paddingAngle={3} strokeWidth={0}>
                  {(stats?.tagDistribution || []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{background:'#1a1a2e', border:'1px solid #2a2a45', borderRadius:8, fontSize:12}} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{display:'flex', flexWrap:'wrap', gap:6, marginTop:8}}>
              {(stats?.tagDistribution || []).map((t, i) => (
                <span key={t._id} className="badge" style={{borderColor: COLORS[i % COLORS.length], color: COLORS[i % COLORS.length]}}>
                  {t._id} ({t.count})
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Channel Performance */}
        {stats?.channelPerformance?.length > 0 && (
          <div className="card mt-24 animate-in" style={{animationDelay:'0.6s'}}>
            <h3 style={{fontSize:15, fontWeight:700, marginBottom:16}}><Zap size={16} style={{display:'inline', marginRight:6}} />Channel Performance</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Channel</th><th>Total Sent</th><th>Delivered</th><th>Opened</th><th>Clicked</th><th>Delivery Rate</th></tr>
                </thead>
                <tbody>
                  {stats.channelPerformance.map(ch => (
                    <tr key={ch._id}>
                      <td><span className="badge badge-accent">{ch._id}</span></td>
                      <td>{ch.total}</td>
                      <td>{ch.delivered}</td>
                      <td>{ch.opened}</td>
                      <td>{ch.clicked}</td>
                      <td>{ch.total ? `${((ch.delivered/ch.total)*100).toFixed(1)}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Campaigns */}
        {stats?.recentCampaigns?.length > 0 && (
          <div className="card mt-24 animate-in" style={{animationDelay:'0.7s'}}>
            <h3 style={{fontSize:15, fontWeight:700, marginBottom:16}}>Recent Campaigns</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Campaign</th><th>Audience</th><th>Channel</th><th>Status</th><th>Sent</th><th>Delivered</th></tr>
                </thead>
                <tbody>
                  {stats.recentCampaigns.map(c => (
                    <tr key={c._id}>
                      <td style={{fontWeight:600}}>{c.name}</td>
                      <td>{c.segment_id?.name || '—'}</td>
                      <td><span className="badge badge-info">{c.channel}</span></td>
                      <td><span className={`badge badge-${c.status === 'completed' || c.status === 'sent' ? 'success' : c.status === 'sending' ? 'warning' : 'info'}`}>{c.status}</span></td>
                      <td>{c.stats?.sent || 0}</td>
                      <td>{c.stats?.delivered || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
