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
  Car,
  UserCog
} from 'lucide-react';

const Sidebar = ({ activeItem, setActiveItem }) => {
  const menuItemsMonitoramento = [
    { name: 'Alertas', icon: <Bell size={20} /> },
    { name: 'Cercas Virtuais', icon: <Map size={20} /> },
    { name: 'Comando', icon: <SendHorizontal size={20} /> },
    { name: 'Gestão de alertas', icon: <ShieldAlert size={20} /> },
    { name: 'Manutenção', icon: <Wrench size={20} /> },
    { name: 'Mapa', icon: <MapPin size={20} /> },
    { name: 'Relatórios', icon: <FileText size={20} /> },
    { name: 'SmartCam', icon: <Video size={20} /> },
  ];

  const menuItemsAdministrativo = [
    { name: 'Clientes', icon: <Users size={20} /> },
    { name: 'Veículos', icon: <Car size={20} /> },
    { name: 'Gerenciar', icon: <Settings size={20} /> },
  ];

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {/* DASHBOARD - Botão Principal solicitado pelo usuário */}
        <ul className="nav-group top-item">
          <li 
            className={`nav-item ${activeItem === 'Dashboard' ? 'active' : ''}`}
            onClick={() => setActiveItem('Dashboard')}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </li>
        </ul>

        {/* MONITORAMENTO */}
        <div className="nav-section">
          <h3 className="nav-section-title">MONITORAMENTO</h3>
          <ul className="nav-group">
            {menuItemsMonitoramento.map((item) => (
              <li 
                key={item.name} 
                className={`nav-item ${activeItem === item.name ? 'active' : ''}`}
                onClick={() => setActiveItem(item.name)}
              >
                {item.icon}
                <span>{item.name}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ADMINISTRATIVO */}
        <div className="nav-section">
          <h3 className="nav-section-title">ADMINISTRATIVO</h3>
          <ul className="nav-group">
            {menuItemsAdministrativo.map((item) => (
              <li 
                key={item.name} 
                className={`nav-item ${activeItem === item.name ? 'active' : ''}`}
                onClick={() => setActiveItem(item.name)}
              >
                {item.icon}
                <span>{item.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
