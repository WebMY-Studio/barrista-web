import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { DrinksPage } from './pages/DrinksPage';
import { DishesPage } from './pages/DishesPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { LogOut } from 'lucide-react';

function AppContent() {
  const { isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <BrowserRouter>
      <div className="app">
        <header className="app-header">
          <NavLink to="/" className="app-header-title">
            <h1>☕ Barrista Admin</h1>
          </NavLink>
          <nav className="app-nav">
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Home
            </NavLink>
            <NavLink to="/drinks" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Drinks
            </NavLink>
            <NavLink to="/dishes" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Dishes
            </NavLink>
            <NavLink to="/categories" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Categories
            </NavLink>
            <button type="button" onClick={logout} className="nav-link nav-logout" title="Sign out">
              <LogOut size={18} />
            </button>
          </nav>
        </header>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/drinks" element={<DrinksPage />} />
            <Route path="/dishes" element={<DishesPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
