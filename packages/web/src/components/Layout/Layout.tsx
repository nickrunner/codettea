import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Layout.module.css';
import clsx from 'clsx';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <h1>Codettea</h1>
          <span className={styles.tagline}>Multi-Agent Development Engine</span>
        </div>
      </header>

      <div className={styles.main}>
        <nav className={styles.sidebar}>
          <ul className={styles.navList}>
            <li>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  clsx(styles.navLink, isActive && styles.active)
                }
              >
                <span className={styles.navIcon}>📊</span>
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/features"
                className={({ isActive }) =>
                  clsx(styles.navLink, isActive && styles.active)
                }
              >
                <span className={styles.navIcon}>🚀</span>
                Features
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/projects"
                className={({ isActive }) =>
                  clsx(styles.navLink, isActive && styles.active)
                }
              >
                <span className={styles.navIcon}>📁</span>
                Projects
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  clsx(styles.navLink, isActive && styles.active)
                }
              >
                <span className={styles.navIcon}>⚙️</span>
                Settings
              </NavLink>
            </li>
          </ul>
        </nav>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
};