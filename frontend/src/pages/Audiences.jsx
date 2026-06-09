import { useState, useEffect } from 'react';
import { getSegments, createSegment, deleteSegment, previewSegment, aiSegmentFromText } from '../services/api';
import { Plus, Trash2, Sparkles, Eye, Users, X } from 'lucide-react';

const FIELDS = [
  { value: 'total_spend', label: 'Total Spend (₹)', type: 'number' },
  { value: 'total_orders', label: 'Total Orders', type: 'number' },
  { value: 'days_since_last_order', label: 'Days Since Last Order', type: 'number' },
  { value: 'city', label: 'City', type: 'string' },
  { value: 'age_group', label: 'Age Group', type: 'select', options: ['18-24','25-34','35-44','45-54','55+'] },
  { value: 'gender', label: 'Gender', type: 'select', options: ['male','female','non-binary'] },
  { value: 'tags', label: 'Tags', type: 'array' },
  { value: 'channel_preferences', label: 'Channel Preference', type: 'array' },
];

const OPERATORS = {
  number: ['gt','gte','lt','lte','eq','between'],
  string: ['eq','neq','contains','not_contains'],
  select: ['eq','neq','in'],
  array: ['contains','not_contains'],
};

const OP_LABELS = { gt:'>',gte:'≥',lt:'<',lte:'≤',eq:'=',neq:'≠',contains:'contains',not_contains:'not contains',between:'between',in:'in' };

export default function Audiences() {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ruleOperator, setRuleOperator] = useState('AND');
  const [conditions, setConditions] = useState([{ field: 'total_spend', operator: 'gt', value: '' }]);
  const [previewCount, setPreviewCount] = useState(null);
  const [previewCustomers, setPreviewCustomers] = useState([]);
  const [saving, setSaving] = useState(false);

  const fetchSegments = () => {
    setLoading(true);
    getSegments().then(r => setSegments(r.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchSegments(); }, []);

  const addCondition = () => setConditions([...conditions, { field: 'total_spend', operator: 'gt', value: '' }]);
  const removeCondition = (i) => setConditions(conditions.filter((_, idx) => idx !== i));
  const updateCondition = (i, key, val) => {
    const updated = [...conditions];
    updated[i] = { ...updated[i], [key]: val };
    if (key === 'field') {
      const fieldType = FIELDS.find(f => f.value === val)?.type || 'string';
      updated[i].operator = OPERATORS[fieldType][0];
      updated[i].value = '';
    }
    setConditions(updated);
  };

  const handlePreview = async () => {
    const rules = { operator: ruleOperator, conditions: conditions.filter(c => c.value !== '') };
    try {
      const res = await previewSegment({ rules, limit: 5 });
      setPreviewCount(res.data.count);
      setPreviewCustomers(res.data.customers);
    } catch (err) { console.error(err); }
  };

  const handleSave = async (aiRules = null) => {
    setSaving(true);
    try {
      const rules = aiRules || { operator: ruleOperator, conditions: conditions.filter(c => c.value !== '') };
      await createSegment({ name, description, rules, ai_generated: !!aiRules, natural_language_query: aiRules ? aiQuery : '' });
      setShowBuilder(false);
      setShowAI(false);
      resetForm();
      fetchSegments();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const resetForm = () => {
    setName(''); setDescription(''); setRuleOperator('AND');
    setConditions([{ field: 'total_spend', operator: 'gt', value: '' }]);
    setPreviewCount(null); setPreviewCustomers([]);
  };

  const handleAISegment = async () => {
    setAiLoading(true);
    try {
      const res = await aiSegmentFromText(aiQuery);
      if (res.data.parsed?.rules) {
        const p = res.data.parsed;
        setName(p.name || '');
        setDescription(p.description || '');
        setConditions(p.rules.conditions || []);
        setRuleOperator(p.rules.operator || 'AND');
        setPreviewCount(p.preview_count ?? null);
        setShowAI(false);
        setShowBuilder(true);
      }
    } catch (err) { console.error(err); }
    setAiLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this audience?')) return;
    await deleteSegment(id);
    fetchSegments();
  };

  return (
    <>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div><h2>Audiences</h2><p>Create and manage customer segments</p></div>
          <div className="flex gap-8">
            <button className="btn btn-secondary" onClick={() => { resetForm(); setShowAI(true); }}>
              <Sparkles size={16} /> AI Segment
            </button>
            <button className="btn btn-primary" onClick={() => { resetForm(); setShowBuilder(true); }}>
              <Plus size={16} /> Build Audience
            </button>
          </div>
        </div>
      </div>
      <div className="page-body">
        {/* Segment List */}
        {loading ? (
          <div className="stats-grid">{[1,2,3].map(i => <div key={i} className="skeleton" style={{height:120}} />)}</div>
        ) : segments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎯</div>
            <h3>No audiences yet</h3>
            <p>Create your first audience segment to start targeting customers</p>
            <button className="btn btn-primary" onClick={() => setShowBuilder(true)}><Plus size={16} /> Build Audience</button>
          </div>
        ) : (
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:16}}>
            {segments.map(seg => (
              <div key={seg._id} className="card" style={{position:'relative'}}>
                <div className="flex items-center justify-between mb-16">
                  <h4 style={{fontSize:15, fontWeight:700}}>{seg.name}</h4>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(seg._id)}><Trash2 size={14} /></button>
                </div>
                <p style={{fontSize:12, color:'var(--text-muted)', marginBottom:12}}>{seg.description || 'No description'}</p>
                <div className="flex items-center gap-8">
                  <span className="badge badge-accent"><Users size={12} style={{marginRight:4}} />{seg.customer_count} customers</span>
                  {seg.ai_generated && <span className="badge badge-info"><Sparkles size={10} style={{marginRight:4}} />AI</span>}
                </div>
                <div style={{marginTop:12, display:'flex', flexWrap:'wrap', gap:6}}>
                  {seg.rules?.conditions?.map((c, i) => (
                    <span key={i} className="badge" style={{fontSize:10}}>
                      {FIELDS.find(f => f.value === c.field)?.label || c.field} {OP_LABELS[c.operator] || c.operator} {String(c.value)}
                    </span>
                  ))}
                </div>
                {seg.natural_language_query && (
                  <p style={{marginTop:8, fontSize:11, color:'var(--text-muted)', fontStyle:'italic'}}>"{seg.natural_language_query}"</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* AI Segment Modal */}
        {showAI && (
          <div className="modal-overlay" onClick={() => setShowAI(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3><Sparkles size={18} style={{marginRight:8}} />AI Audience Builder</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAI(false)}>✕</button>
              </div>
              <div className="modal-body">
                <p style={{fontSize:13, color:'var(--text-secondary)', marginBottom:16}}>
                  Describe your target audience in natural language and AI will create the segment rules for you.
                </p>
                <textarea className="textarea" placeholder="e.g. VIP customers from Mumbai who have not ordered in 30 days" value={aiQuery} onChange={e => setAiQuery(e.target.value)} rows={3} />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowAI(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleAISegment} disabled={!aiQuery.trim() || aiLoading}>
                  {aiLoading ? <><span className="spinner" /> Thinking...</> : <><Sparkles size={14} /> Generate Rules</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Builder Modal */}
        {showBuilder && (
          <div className="modal-overlay" onClick={() => setShowBuilder(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:700}}>
              <div className="modal-header">
                <h3>Build Audience</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowBuilder(false)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Audience Name</label>
                  <input className="input" placeholder="e.g. High-Value Mumbai Customers" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input className="input" placeholder="Brief description..." value={description} onChange={e => setDescription(e.target.value)} />
                </div>

                <div className="form-group">
                  <label>Match</label>
                  <select className="select" style={{width:120}} value={ruleOperator} onChange={e => setRuleOperator(e.target.value)}>
                    <option value="AND">ALL (AND)</option>
                    <option value="OR">ANY (OR)</option>
                  </select>
                </div>

                {conditions.map((cond, i) => {
                  const fieldDef = FIELDS.find(f => f.value === cond.field);
                  const fieldType = fieldDef?.type || 'string';
                  return (
                    <div key={i} className="flex items-center gap-8 mb-16" style={{flexWrap:'wrap'}}>
                      <select className="select" style={{width:180}} value={cond.field} onChange={e => updateCondition(i, 'field', e.target.value)}>
                        {FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                      <select className="select" style={{width:140}} value={cond.operator} onChange={e => updateCondition(i, 'operator', e.target.value)}>
                        {(OPERATORS[fieldType] || OPERATORS.string).map(op => <option key={op} value={op}>{OP_LABELS[op]}</option>)}
                      </select>
                      {fieldDef?.options ? (
                        <select className="select" style={{flex:1}} value={cond.value} onChange={e => updateCondition(i, 'value', e.target.value)}>
                          <option value="">Select...</option>
                          {fieldDef.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input className="input" style={{flex:1}} placeholder="Value" value={cond.value} onChange={e => updateCondition(i, 'value', e.target.value)} />
                      )}
                      {conditions.length > 1 && (
                        <button className="btn btn-ghost btn-sm" onClick={() => removeCondition(i)}><X size={14} /></button>
                      )}
                    </div>
                  );
                })}

                <button className="btn btn-ghost btn-sm" onClick={addCondition}><Plus size={14} /> Add Condition</button>

                {/* Preview */}
                <div className="mt-24">
                  <button className="btn btn-secondary" onClick={handlePreview}><Eye size={14} /> Preview Audience</button>
                  {previewCount !== null && (
                    <div className="card mt-16">
                      <span className="badge badge-success" style={{fontSize:13, padding:'6px 14px'}}>
                        <Users size={14} style={{marginRight:6}} />{previewCount} customers match
                      </span>
                      {previewCustomers.length > 0 && (
                        <div style={{marginTop:12, fontSize:12, color:'var(--text-secondary)'}}>
                          Sample: {previewCustomers.map(c => c.name).join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowBuilder(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={() => handleSave()} disabled={!name.trim() || saving}>
                  {saving ? 'Saving...' : 'Save Audience'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
