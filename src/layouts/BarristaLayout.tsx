import { Outlet, NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function BarristaLayout() {
  const { logout } = useAuth();

  return (
    <div className="app">
      <header className="app-header">
        <NavLink to="/barrista" className="app-header-title">
          <h1>☕ Barrista Admin</h1>
        </NavLink>
        <nav className="app-nav">
          <NavLink to="/" className="nav-link" title="Back to project list">
            Projects
          </NavLink>
          <NavLink to="/barrista" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Home
          </NavLink>
          <NavLink to="/barrista/drinks" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Drinks
          </NavLink>
          <NavLink to="/barrista/dishes" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Dishes
          </NavLink>
          <NavLink to="/barrista/categories" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Categories
          </NavLink>
          <NavLink to="/barrista/brew-methods" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Brew methods
          </NavLink>
          <NavLink to="/barrista/translation-languages" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Translation languages
          </NavLink>
          <NavLink to="/barrista/images" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Images
          </NavLink>
          <button type="button" onClick={logout} className="nav-link nav-logout" title="Sign out">
            <LogOut size={18} />
          </button>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
