import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import Equipos from './pages/Equipos';
import Tiendas from './pages/Tiendas';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="layout">
        <nav className="sidebar">
          <div className="sidebar-brand">
            <span className="brand-icon">📱</span>
            <span className="brand-name">Caruso Tech</span>
          </div>
          <div className="nav-links">
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}>
              + Nuevo ingreso
            </NavLink>
            <NavLink to="/equipos" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}>
              Historial
            </NavLink>
            <NavLink to="/tiendas" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}>
              Tiendas
            </NavLink>
          </div>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/equipos" element={<Equipos />} />
            <Route path="/tiendas" element={<Tiendas />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
