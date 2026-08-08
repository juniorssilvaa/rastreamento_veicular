import React from 'react';
import './Sidebar.css';
import {
  LayoutDashboard,
  Bell,
  Map,
  SendHorizontal,
  ShieldAlert,
  Wrench,
  MapPin,
  FileText,
  Video,
  Users,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import CarIcon from './CarIcon';

const Sidebar = ({ activeItem, setActiveItem, collapsed, onToggleCollapse }) => {
  const menuItemsMonitoramento = [
    { name: 'Mapa', icon: <MapPin size={20} /> },
    { name: 'Cercas Virtuais', icon: <Map size={20} /> },
    { name: 'Alertas', icon: <Bell size={20} /> },
    { name: 'Comando', icon: <SendHorizontal size={20} /> },
    { name: 'Gestão de alertas', icon: <ShieldAlert size={20} /> },
    { name: 'Manutenção', icon: <Wrench size={20} /> },
    { name: 'Relatórios', icon: <FileText size={20} /> },
    { name: 'SmartCam', icon: <Video size={20} /> },
  ];

  const menuItemsAdministrativo = [
    { name: 'Clientes', icon: <Users size={20} /> },
    { name: 'Veículos', icon: <CarIcon size={20} /> },
    { name: 'Criar Comandos', icon: <SendHorizontal size={20} /> },
    { name: 'Gerenciar', icon: <Settings size={20} /> },
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar-brand">
        <div className="sidebar-brand__logo">
          <img src="/logo.jpg" alt="BL Rastreamento" />
          {!collapsed && <strong>BL RASTREAMENTO</strong>}
        </div>
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        <ul className="nav-group top-item">
          <li
            className={`nav-item ${activeItem === 'Dashboard' ? 'active' : ''}`}
            onClick={() => setActiveItem('Dashboard')}
            title="Dashboard"
          >
            <LayoutDashboard size={20} />
            {!collapsed && <span>Dashboard</span>}
          </li>
        </ul>

        <div className="nav-section">
          {!collapsed && <h3 className="nav-section-title">MONITORAMENTO</h3>}
          <ul className="nav-group">
            {menuItemsMonitoramento.map((item) => (
              <li
                key={item.name}
                className={`nav-item ${activeItem === item.name ? 'active' : ''}`}
                onClick={() => setActiveItem(item.name)}
                title={item.name}
              >
                {item.icon}
                {!collapsed && <span>{item.name}</span>}
              </li>
            ))}
          </ul>
        </div>

        <div className="nav-section">
          {!collapsed && <h3 className="nav-section-title">ADMINISTRATIVO</h3>}
          <ul className="nav-group">
            {menuItemsAdministrativo.map((item) => (
              <li
                key={item.name}
                className={`nav-item ${activeItem === item.name ? 'active' : ''}`}
                onClick={() => setActiveItem(item.name)}
                title={item.name}
              >
                {item.icon}
                {!collapsed && <span>{item.name}</span>}
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
