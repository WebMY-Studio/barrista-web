import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { ProjectSelectionPage } from './pages/ProjectSelectionPage';
import { BarristaLayout } from './layouts/BarristaLayout';
import { Dashboard } from './pages/Dashboard';
import { DrinksPage } from './pages/DrinksPage';
import { DishesPage } from './pages/DishesPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { BrewMethodsPage } from './pages/BrewMethodsPage';
import { TranslationLanguagesPage } from './pages/TranslationLanguagesPage';
import { ImagesPage } from './pages/ImagesPage';

function AppContent() {
  const { isAuthenticated } = useAuth();

  return (
    <BrowserRouter>
      {!isAuthenticated ? (
        <LoginPage />
      ) : (
        <Routes>
          <Route path="/" element={<ProjectSelectionPage />} />
          <Route path="/barrista" element={<BarristaLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="drinks" element={<DrinksPage />} />
            <Route path="dishes" element={<DishesPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="brew-methods" element={<BrewMethodsPage />} />
            <Route path="translation-languages" element={<TranslationLanguagesPage />} />
            <Route path="images" element={<ImagesPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
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
