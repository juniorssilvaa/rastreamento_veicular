import React from 'react';
import './Header.css';
import { LogOut, Sun, Moon } from 'lucide-react';

const Header = ({ onLogout, theme, toggleTheme }) => {
  return (
    <header className="top-header">
      <div className="header-spacer" aria-hidden />

      <div className="header-actions">
        <button
          className="btn-header-action btn-theme"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span>{theme === 'dark' ? 'Claro' : 'Escuro'}</span>
        </button>
        <button className="btn-header-action btn-logout" onClick={onLogout}>
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
