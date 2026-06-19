import React, { useState } from 'react';
import Header from '../../components/Header';
import ClienteSidebar from '../../components/ClienteSidebar';
import Mapa from '../Mapa';
import Alertas from '../Alertas';
import CercasVirtuais from '../CercasVirtuais';
import Comando from '../Comando';
import Perfil from './Perfil';

const Placeholder = ({ title }) => (
  <div style={{ padding: '40px' }}>
    <h2>{title}</h2>
    <p style={{ color: '#6B7280', marginTop: '12px' }}>Página em construção para o painel do cliente...</p>
  </div>
);

const ClienteApp = ({ onLogout, theme, toggleTheme }) => {
  const [activeItem, setActiveItem] = useState(() => {
    return localStorage.getItem('clienteActiveItem') || 'Mapa';
  });

  const formatRoute = (str) => {
    return '/' + str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
  };

  React.useEffect(() => {
    window.history.replaceState(null, '', formatRoute(activeItem));
  }, [activeItem]);

  const handlePageChange = (page) => {
    localStorage.setItem('clienteActiveItem', page);
    setActiveItem(page);
    window.history.pushState(null, '', formatRoute(page));
  };

  return (
    <>
      <Header onLogout={onLogout} theme={theme} toggleTheme={toggleTheme} hideSearch={true} />
      <div className="app-body">
        <ClienteSidebar activeItem={activeItem} setActiveItem={handlePageChange} />
        <div className={`main-content ${activeItem === 'Mapa' ? 'main-content--mapa' : ''}`}>
          {activeItem === 'Mapa' && <Mapa />}
          {activeItem === 'Alertas' && <Alertas />}
          {activeItem === 'Cerca Virtual' && <CercasVirtuais />}
          {activeItem === 'Comando' && <Comando />}
          {activeItem === 'Perfil' && <Perfil />}
          
          {/* Placeholders para páginas não implementadas */}
          {['Câmera', 'Eventos', 'Motorista', 'Manutenção', 'Relatório', 'Financeiro', 'Contrato'].includes(activeItem) && (
            <Placeholder title={activeItem} />
          )}
        </div>
      </div>
    </>
  );
};

export default ClienteApp;
