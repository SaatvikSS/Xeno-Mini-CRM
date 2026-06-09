import { useState, useEffect, useRef } from 'react';
import { getCustomers, getCities, getTags, uploadCustomers } from '../services/api';
import { Search, Filter, ChevronLeft, ChevronRight, MapPin, Tag, ShoppingBag, Upload } from 'lucide-react';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [tag, setTag] = useState('');
  const [cities, setCities] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await uploadCustomers(formData);
      alert(`Success! Imported ${res.data.inserted} customers.`);
      fetchCustomers();
      // Refresh filter dropdowns too
      getCities().then(r => setCities(r.data)).catch(() => {});
      getTags().then(r => setTags(r.data)).catch(() => {});
    } catch (err) {
      alert(`Error uploading CSV: ${err.response?.data?.error || err.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const fetchCustomers = (page = 1) => {
    setLoading(true);
    getCustomers({ page, limit: 20, search, city, tag })
      .then(res => { setCustomers(res.data.customers); setPagination(res.data.pagination); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCustomers(); }, [search, city, tag]);
  useEffect(() => {
    getCities().then(r => setCities(r.data)).catch(() => {});
    getTags().then(r => setTags(r.data)).catch(() => {});
  }, []);

  return (
    <>
      <div className="page-header flex items-center justify-between">
        <div>
          <h2>Customers</h2>
          <p>{pagination.total.toLocaleString()} shoppers in your database</p>
        </div>
        <div>
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} style={{display: 'none'}} />
          <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <span className="spinner" style={{width: 14, height: 14, borderColor: 'var(--bg-primary)', borderTopColor: 'var(--text-primary)'}}></span> : <Upload size={16} />}
            {uploading ? 'Uploading...' : 'Import CSV'}
          </button>
        </div>
      </div>
      <div className="page-body">
        {/* Filters */}
        <div className="flex items-center gap-16 mb-16" style={{flexWrap:'wrap'}}>
          <div style={{position:'relative', flex:1, minWidth:240}}>
            <Search size={16} style={{position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)'}} />
            <input className="input" placeholder="Search by name, email, or phone..." value={search} onChange={e => setSearch(e.target.value)} style={{paddingLeft:36}} />
          </div>
          <select className="select" style={{width:160}} value={city} onChange={e => setCity(e.target.value)}>
            <option value="">All Cities</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="select" style={{width:160}} value={tag} onChange={e => setTag(e.target.value)}>
            <option value="">All Tags</option>
            {tags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>City</th><th>Spend</th><th>Orders</th><th>Tags</th><th>Last Order</th></tr>
            </thead>
            <tbody>
              {loading ? (
                Array(10).fill(0).map((_, i) => (
                  <tr key={i}>{Array(7).fill(0).map((_, j) => <td key={j}><div className="skeleton" style={{height:16, width:'80%'}} /></td>)}</tr>
                ))
              ) : customers.length === 0 ? (
                <tr><td colSpan={7} className="text-center" style={{padding:40, color:'var(--text-muted)'}}>No customers found</td></tr>
              ) : customers.map(c => (
                <tr key={c._id} onClick={() => setSelected(c)} style={{cursor:'pointer'}}>
                  <td style={{fontWeight:600}}>{c.name}</td>
                  <td style={{color:'var(--text-secondary)'}}>{c.email}</td>
                  <td><span className="flex items-center gap-8"><MapPin size={12} />{c.city}</span></td>
                  <td style={{fontWeight:600}}>₹{c.total_spend?.toLocaleString()}</td>
                  <td>{c.total_orders}</td>
                  <td>
                    <div className="flex gap-8" style={{flexWrap:'wrap'}}>
                      {(c.tags || []).slice(0, 3).map(t => (
                        <span key={t} className="badge badge-accent" style={{fontSize:10}}>{t}</span>
                      ))}
                      {(c.tags || []).length > 3 && <span className="badge" style={{fontSize:10}}>+{c.tags.length-3}</span>}
                    </div>
                  </td>
                  <td style={{color:'var(--text-muted)', fontSize:12}}>
                    {c.last_order_date ? new Date(c.last_order_date).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-16">
          <span style={{fontSize:12, color:'var(--text-muted)'}}>
            Page {pagination.page} of {pagination.pages} ({pagination.total} total)
          </span>
          <div className="flex gap-8">
            <button className="btn btn-secondary btn-sm" disabled={pagination.page <= 1} onClick={() => fetchCustomers(pagination.page - 1)}>
              <ChevronLeft size={14} /> Prev
            </button>
            <button className="btn btn-secondary btn-sm" disabled={pagination.page >= pagination.pages} onClick={() => fetchCustomers(pagination.page + 1)}>
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Customer Detail Modal */}
        {selected && (
          <div className="modal-overlay" onClick={() => setSelected(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:500}}>
              <div className="modal-header">
                <h3>{selected.name}</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="grid-2 mb-16">
                  <div><label style={{fontSize:11, color:'var(--text-muted)'}}>Email</label><p style={{fontSize:13}}>{selected.email}</p></div>
                  <div><label style={{fontSize:11, color:'var(--text-muted)'}}>Phone</label><p style={{fontSize:13}}>{selected.phone}</p></div>
                  <div><label style={{fontSize:11, color:'var(--text-muted)'}}>City</label><p style={{fontSize:13}}>{selected.city}</p></div>
                  <div><label style={{fontSize:11, color:'var(--text-muted)'}}>Age Group</label><p style={{fontSize:13}}>{selected.age_group || '—'}</p></div>
                </div>
                <div className="grid-2 mb-16">
                  <div className="stat-card"><div className="stat-label">Total Spend</div><div className="stat-value" style={{fontSize:22}}>₹{selected.total_spend?.toLocaleString()}</div></div>
                  <div className="stat-card warm"><div className="stat-label">Total Orders</div><div className="stat-value" style={{fontSize:22}}>{selected.total_orders}</div></div>
                </div>
                <div>
                  <label style={{fontSize:11, color:'var(--text-muted)', display:'block', marginBottom:6}}>Tags</label>
                  <div className="flex gap-8" style={{flexWrap:'wrap'}}>
                    {(selected.tags || []).map(t => <span key={t} className="badge badge-accent">{t}</span>)}
                    {(!selected.tags || selected.tags.length === 0) && <span style={{color:'var(--text-muted)', fontSize:12}}>No tags</span>}
                  </div>
                </div>
                <div className="mt-16">
                  <label style={{fontSize:11, color:'var(--text-muted)', display:'block', marginBottom:6}}>Preferred Channels</label>
                  <div className="flex gap-8" style={{flexWrap:'wrap'}}>
                    {(selected.channel_preferences || []).map(c => <span key={c} className="badge badge-info">{c}</span>)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
