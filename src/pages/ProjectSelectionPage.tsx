import { Link } from 'react-router-dom';
import { Coffee, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const PROJECTS = [
  {
    id: 'barrista',
    path: '/barrista',
    name: 'Barrista',
    description: 'Coffee recipes, drinks, categories, brew methods, translations.',
    icon: Coffee,
  },
  // Add more projects here later
];

export function ProjectSelectionPage() {
  const { logout } = useAuth();

  return (
    <div className="app">
      <header className="app-header app-header-minimal">
        <h1 className="app-header-title-plain">Admin</h1>
        <nav className="app-nav">
          <button type="button" onClick={logout} className="nav-link nav-logout" title="Sign out">
            <LogOut size={18} />
          </button>
        </nav>
      </header>
      <main className="app-main">
        <div className="page-content page-projects">
          <h2>Choose project</h2>
          <p className="form-hint">Select a project to open its admin panel.</p>
          <div className="projects-grid">
        {PROJECTS.map((p) => {
          const Icon = p.icon;
          return (
            <Link key={p.id} to={p.path} className="project-card">
              <Icon size={40} className="project-card-icon" />
              <h3 className="project-card-name">{p.name}</h3>
              <p className="project-card-desc">{p.description}</p>
            </Link>
          );
        })}
          </div>
        </div>
      </main>
    </div>
  );
}
