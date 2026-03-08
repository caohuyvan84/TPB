import { Route, Routes, Link } from 'react-router-dom';
import styles from './app.module.css';

export function App() {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1>TPB CRM - Admin Module</h1>
        <p>System Configuration & Management</p>
      </header>

      <nav className={styles.nav}>
        <ul>
          <li>
            <Link to="/">Dashboard</Link>
          </li>
          <li>
            <Link to="/schema">Schema Management</Link>
          </li>
          <li>
            <Link to="/users">User Management</Link>
          </li>
          <li>
            <Link to="/settings">Settings</Link>
          </li>
        </ul>
      </nav>

      <main className={styles.main}>
        <Routes>
          <Route
            path="/"
            element={
              <div>
                <h2>Admin Dashboard</h2>
                <p>Welcome to the TPB CRM Admin Module</p>
                <p>This is a skeleton application that will be developed in Phase 1.</p>
              </div>
            }
          />
          <Route
            path="/schema"
            element={
              <div>
                <h2>Schema Management</h2>
                <p>Dynamic schema configuration will be implemented here.</p>
              </div>
            }
          />
          <Route
            path="/users"
            element={
              <div>
                <h2>User Management</h2>
                <p>User and role management will be implemented here.</p>
              </div>
            }
          />
          <Route
            path="/settings"
            element={
              <div>
                <h2>System Settings</h2>
                <p>System configuration will be implemented here.</p>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
