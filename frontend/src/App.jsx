import React, { useState, useEffect } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Gerenciar from './pages/Gerenciar';
import Mapa from './pages/Mapa';
import Comando from './pages/Comando';
import Alertas from './pages/Alertas';
import GestaoAlertas from './pages/GestaoAlertas';
import Veiculos from './pages/Veiculos';
import VeiculoForm from './pages/VeiculoForm';
import CercasVirtuais from './pages/CercasVirtuais';
import Login from './pages/Login';
import Clientes from './pages/Clientes';
import CriarComandos from './pages/CriarComandos';
import Tecnicos from './pages/Tecnicos';
import Relatorios from './pages/Relatorios';
import ClienteApp from './pages/cliente/ClienteApp';
import { Toaster } from 'react-hot-toast';

const parsePathname = (pathname) => {
  const path = (pathname || '/').replace(/\/+$/, '') || '/';
  const editMatch = path.match(/^\/veiculos\/editar\/(\d+)$/);
  if (path === '/veiculos/novo') {
    return { activeItem: 'Veículos', vehicleView: { mode: 'create' } };
  }
  if (editMatch) {
    return { activeItem: 'Veículos', vehicleView: { mode: 'edit', id: Number(editMatch[1]) } };
  }

  const routeMap = {
    '/dashboard': 'Dashboard',
    '/gerenciar': 'Gerenciar',
    '/mapa': 'Mapa',
    '/comando': 'Comando',
    '/alertas': 'Alertas',
    '/gestao-de-alertas': 'Gestão de alertas',
    '/veiculos': 'Veículos',
    '/cercas-virtuais': 'Cercas Virtuais',
    '/clientes': 'Clientes',
    '/criar-comandos': 'Criar Comandos',
    '/tecnicos': 'Técnicos',
    '/relatorios': 'Relatórios',
  };

  return {
    activeItem: routeMap[path] || null,
    vehicleView: null,
  };
};

function App() {
  const [activeItem, setActiveItem] = useState(() => {
    return parsePathname(window.location.pathname).activeItem
      || localStorage.getItem('activeItem')
      || 'Gerenciar';
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });

  const [userRole, setUserRole] = useState(() => {
    return localStorage.getItem('userRole') || '';
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });

  const [vehicleView, setVehicleView] = useState(() => parsePathname(window.location.pathname).vehicleView);

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

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebarCollapsed', String(next));
      // Aguarda a transição do CSS e avisa o mapa para recalcular o tamanho
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { collapsed: next } }));
        window.dispatchEvent(new Event('resize'));
      }, 220);
      return next;
    });
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
    const syncFromUrl = () => {
      const parsed = parsePathname(window.location.pathname);
      if (parsed.activeItem) {
        setActiveItem(parsed.activeItem);
        localStorage.setItem('activeItem', parsed.activeItem);
      }
      setVehicleView(parsed.vehicleView);
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || userRole !== 'admin') return;
    if (vehicleView?.mode === 'create') {
      window.history.replaceState(null, '', '/veiculos/novo');
      return;
    }
    if (vehicleView?.mode === 'edit') {
      window.history.replaceState(null, '', `/veiculos/editar/${vehicleView.id}`);
      return;
    }
    window.history.replaceState(null, '', formatRoute(activeItem));
  }, [activeItem, vehicleView, isAuthenticated, userRole]);

  const handlePageChange = (page) => {
    localStorage.setItem('activeItem', page);
    setActiveItem(page);
    setVehicleView(null);
    window.history.pushState(null, '', formatRoute(page));
  };

  const openVehicleCreate = () => {
    localStorage.setItem('activeItem', 'Veículos');
    setActiveItem('Veículos');
    setVehicleView({ mode: 'create' });
    window.history.pushState(null, '', '/veiculos/novo');
  };

  const openVehicleEdit = (id) => {
    localStorage.setItem('activeItem', 'Veículos');
    setActiveItem('Veículos');
    setVehicleView({ mode: 'edit', id });
    window.history.pushState(null, '', `/veiculos/editar/${id}`);
  };

  const closeVehicleForm = () => {
    localStorage.setItem('activeItem', 'Veículos');
    setActiveItem('Veículos');
    setVehicleView(null);
    window.history.pushState(null, '', '/veiculos');
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
    <div className={`app-container${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <Toaster position="top-right" />
      <Header onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />
      <div className="app-body">
        <Sidebar
          activeItem={activeItem}
          setActiveItem={handlePageChange}
          collapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
        <div className={`main-content ${activeItem === 'Mapa' ? 'main-content--mapa' : ''} ${activeItem === 'Clientes' ? 'main-content--clientes' : ''} ${activeItem === 'Dashboard' ? 'main-content--dashboard' : ''} ${activeItem === 'Comando' ? 'main-content--comando' : ''} ${activeItem === 'Relatórios' ? 'main-content--relatorios' : ''} ${vehicleView ? 'main-content--veiculo-form' : ''}`}>
          {activeItem === 'Dashboard' && <Dashboard />}
          {activeItem === 'Gerenciar' && <Gerenciar onNavigate={handlePageChange} />}
          {activeItem === 'Mapa' && <Mapa />}
          {activeItem === 'Comando' && <Comando />}
          {activeItem === 'Alertas' && <Alertas />}
          {activeItem === 'Gestão de alertas' && <GestaoAlertas onNavigate={handlePageChange} />}
          {activeItem === 'Veículos' && vehicleView?.mode === 'create' && (
            <VeiculoForm mode="create" onBack={closeVehicleForm} />
          )}
          {activeItem === 'Veículos' && vehicleView?.mode === 'edit' && (
            <VeiculoForm mode="edit" deviceId={vehicleView.id} onBack={closeVehicleForm} />
          )}
          {activeItem === 'Veículos' && !vehicleView && (
            <Veiculos onCreate={openVehicleCreate} onEdit={openVehicleEdit} />
          )}
          {activeItem === 'Cercas Virtuais' && <CercasVirtuais />}
          {activeItem === 'Clientes' && <Clientes />}
          {activeItem === 'Criar Comandos' && <CriarComandos />}
          {activeItem === 'Técnicos' && <Tecnicos />}
          {activeItem === 'Relatórios' && <Relatorios />}
          {activeItem !== 'Dashboard' && 
           activeItem !== 'Gerenciar' && 
           activeItem !== 'Mapa' && 
           activeItem !== 'Comando' &&
           activeItem !== 'Alertas' && 
           activeItem !== 'Gestão de alertas' &&
           activeItem !== 'Veículos' &&
           activeItem !== 'Cercas Virtuais' &&
           activeItem !== 'Clientes' && 
           activeItem !== 'Criar Comandos' &&
           activeItem !== 'Técnicos' &&
           activeItem !== 'Relatórios' && (
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
