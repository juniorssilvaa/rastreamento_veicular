import React, { useState, useEffect } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Gerenciar from './pages/Gerenciar';
import Mapa from './pages/Mapa';
import Comando from './pages/Comando';
import Alertas from './pages/Alertas';
import Veiculos from './pages/Veiculos';
import CercasVirtuais from './pages/CercasVirtuais';
import Login from './pages/Login';
import Clientes from './pages/Clientes';
import ClienteApp from './pages/cliente/ClienteApp';
import { Toaster } from 'react-hot-toast';

function App() {
  const [activeItem, setActiveItem] = useState(() => {
    return localStorage.getItem('activeItem') || 'Gerenciar';
  }); 

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });

  const [userRole, setUserRole] = useState(() => {
    return localStorage.getItem('userRole') || '';
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleLogin = (role = 'admin') => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userRole', role);
    setIsAuthenticated(true);
    setUserRole(role);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userRole');
    setIsAuthenticated(false);
    setUserRole('');
  };

  const formatRoute = (str) => {
    return '/' + str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
  };

  useEffect(() => {
    if (isAuthenticated && userRole === 'admin') {
      window.history.replaceState(null, '', formatRoute(activeItem));
    }
  }, [activeItem, isAuthenticated, userRole]);

  const handlePageChange = (page) => {
    localStorage.setItem('activeItem', page);
    setActiveItem(page);
    window.history.pushState(null, '', formatRoute(page));
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // Se o role for cliente, renderiza a árvore inteira do ClienteApp
  if (userRole === 'cliente') {
    return (
      <div className="app-container">
        <Toaster position="top-right" />
        <ClienteApp onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
      </div>
    );
  }

  // Senão, continua sendo a árvore normal do Admin
  return (
    <div className="app-container">
      <Toaster position="top-right" />
      <Header onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
      <div className="app-body">
        <Sidebar activeItem={activeItem} setActiveItem={handlePageChange} />
        <div className={`main-content ${activeItem === 'Mapa' ? 'main-content--mapa' : ''}`}>
          {activeItem === 'Dashboard' && <Dashboard />}
          {activeItem === 'Gerenciar' && <Gerenciar />}
          {activeItem === 'Mapa' && <Mapa />}
          {activeItem === 'Comando' && <Comando />}
          {activeItem === 'Alertas' && <Alertas />}
          {activeItem === 'Veículos' && <Veiculos />}
          {activeItem === 'Cercas Virtuais' && <CercasVirtuais />}
          {activeItem === 'Clientes' && <Clientes />}
          {activeItem !== 'Dashboard' && 
           activeItem !== 'Gerenciar' && 
           activeItem !== 'Mapa' && 
           activeItem !== 'Comando' &&
           activeItem !== 'Alertas' && 
           activeItem !== 'Veículos' &&
           activeItem !== 'Cercas Virtuais' &&
           activeItem !== 'Clientes' && (
             <div style={{padding: '40px'}}>
               <h2>{activeItem}</h2>
               <p style={{color: '#6B7280', marginTop: '12px'}}>Página em construção...</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
