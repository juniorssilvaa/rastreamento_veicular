import React from 'react';
import './Header.css';
import { LogOut, Sun, Moon } from 'lucide-react';

const Header = ({ onLogout, theme, toggleTheme, hideSearch }) => {
  return (
    <header className="top-header">
      
      {/* AREA DA LOGO */}
      <div className="header-logo-area">
        <img src="/logo.jpg" alt="BL Rastreamento" className="header-logo-img" />
      </div>

      {/* AREA DE BUSCA CENTRAL (COMPLEXA) */}
      {!hideSearch && (
        <div className="header-search-area">
          <div className="search-widget">
          <input 
            type="text" 
            placeholder="Consultar Cliente" 
            className="widget-input"
          />
          
          <div className="widget-divider"></div>

          <label className="widget-select-label">Tipo</label>
          <select className="widget-select">
            <option>ID Contrato</option>
            <option>ID Cliente</option>
            <option>Nome/Razão Social</option>
            <option>CPF/CNPJ</option>
            <option>Telefone</option>
            <option>Email</option>
            <option>Placa</option>
          </select>
        </div>
      </div>
      )}

      {/* AREA DA DIREITA (TEMAS, PERFIL, SAIR) */}
      <div className="header-actions">
        <button className="btn-header-action btn-theme" onClick={toggleTheme} title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}>
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
