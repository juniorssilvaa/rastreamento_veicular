import React from 'react';
import './Sidebar.css'; // Podemos reaproveitar o estilo
import { 
  Map, 
  Video, 
  Bell, 
  ClipboardList, 
  ShieldAlert, 
  User, 
  Wrench, 
  SendHorizontal, 
  FileText, 
  DollarSign, 
  FileSignature,
  Settings
} from 'lucide-react';

const ClienteSidebar = ({ activeItem, setActiveItem }) => {
  const menuItemsDiretos = [
    { name: 'Mapa', icon: <Map size={20} /> },
    { name: 'Câmera', icon: <Video size={20} /> },
    { name: 'Alertas', icon: <Bell size={20} /> },
    { name: 'Eventos', icon: <ClipboardList size={20} /> },
    { name: 'Cerca Virtual', icon: <ShieldAlert size={20} /> },
  ];

  const menuItemsOperacao = [
    { name: 'Motorista', icon: <User size={20} /> },
    { name: 'Manutenção', icon: <Wrench size={20} /> },
    { name: 'Comando', icon: <SendHorizontal size={20} /> },
  ];

  const menuItemsGestao = [
    { name: 'Relatório', icon: <FileText size={20} /> },
    { name: 'Financeiro', icon: <DollarSign size={20} /> },
    { name: 'Contrato', icon: <FileSignature size={20} /> },
    { name: 'Perfil', icon: <Settings size={20} /> },
  ];

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        
        {/* ITENS DIRETOS */}
        <div className="nav-section" style={{ marginTop: '10px' }}>
          <ul className="nav-group">
            {menuItemsDiretos.map((item) => (
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

        {/* OPERAÇÃO */}
        <div className="nav-section">
          <h3 className="nav-section-title">OPERAÇÃO</h3>
          <ul className="nav-group">
            {menuItemsOperacao.map((item) => (
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

        {/* GESTÃO */}
        <div className="nav-section">
          <h3 className="nav-section-title">GESTÃO</h3>
          <ul className="nav-group">
            {menuItemsGestao.map((item) => (
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

export default ClienteSidebar;
