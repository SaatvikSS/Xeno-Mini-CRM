import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { LayoutDashboard, Users, Target, Megaphone, BarChart3, Sparkles } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Audiences from './pages/Audiences';
import Campaigns from './pages/Campaigns';
import Analytics from './pages/Analytics';
import Copilot from './components/Copilot';
import './index.css';

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/customers', icon: Users, label: 'Customers' },
  { path: '/audiences', icon: Target, label: 'Audiences' },
  { path: '/campaigns', icon: Megaphone, label: 'Campaigns' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
];

export default function App() {
  const [copilotOpen, setCopilotOpen] = useState(false);

  return (
    <Router>
      <div className="app-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-icon">X</div>
            <div>
              <h1>Xeno CRM</h1>
              <span>Brew & Co.</span>
            </div>
          </div>
          <nav className="sidebar-nav">
            {NAV_ITEMS.map(({ path, icon: Icon, label }) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/'}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon className="nav-icon" size={20} />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="main-content" style={copilotOpen ? { marginRight: 400 } : {}}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/audiences" element={<Audiences />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/analytics" element={<Analytics />} />
          </Routes>
        </main>

        {/* AI Copilot */}
        <button className="copilot-toggle" onClick={() => setCopilotOpen(!copilotOpen)} title="AI Copilot">
          <Sparkles size={24} />
        </button>
        {copilotOpen && <Copilot onClose={() => setCopilotOpen(false)} />}
      </div>
    </Router>
  );
}
