import { Routes, Route, NavLink } from 'react-router-dom';
import GuestPage from './pages/GuestPage';
import OwnerPage from './pages/OwnerPage';

export default function App() {
  return (
    <div className="app">
      <nav className="nav">
        <span className="nav-brand">Запись на звонок</span>
        <div className="nav-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            Гость
          </NavLink>
          <NavLink
            to="/owner"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            Владелец
          </NavLink>
        </div>
      </nav>

      <main className="main">
        <Routes>
          <Route path="/"      element={<GuestPage />} />
          <Route path="/owner" element={<OwnerPage />} />
        </Routes>
      </main>
    </div>
  );
}
