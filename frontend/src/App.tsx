import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import Equipos from './pages/Equipos';
import Tiendas from './pages/Tiendas';
import InstallPrompt from './components/InstallPrompt';
import './App.css';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="layout">
        <nav className="sidebar">
          <div className="sidebar-brand">
            <span className="brand-icon"><img src="/icon.svg" alt="Caruso Tech" /></span>
            <span>
              <span className="brand-name">Caruso Tech</span>
              <span className="brand-sub">OCR intake</span>
            </span>
          </div>

          <div className="nav-links">
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}>
              <span className="nav-icon">➕</span>
              <span className="nav-text">Nuevo ingreso</span>
            </NavLink>
            <NavLink to="/equipos" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}>
              <span className="nav-icon">🕘</span>
              <span className="nav-text">Historial</span>
            </NavLink>
            <NavLink to="/tiendas" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}>
              <span className="nav-icon">🏪</span>
              <span className="nav-text">Tiendas</span>
            </NavLink>
          </div>

          <div className="sidebar-footer">
            <div className="status-pill">
              <span className="status-dot" />
              Backend activo
            </div>
            <div className="user-card">
              <span className="user-avatar">CT</span>
              <span>
                <strong>Recepcion</strong>
                <small>Caruso Tech</small>
              </span>
            </div>
          </div>
        </nav>

        <header className="topbar">
          <span className="topbar-logo"><img src="/icon.svg" alt="Caruso Tech" /></span>
          <span className="topbar-name">Caruso Tech</span>
        </header>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/equipos" element={<Equipos />} />
            <Route path="/tiendas" element={<Tiendas />} />
          </Routes>
        </main>

        <InstallPrompt />
        <span className="app-version">v{__APP_VERSION__}</span>
      </div>
    </BrowserRouter>
  );
}
