import React, { useState } from 'react';
import './Gerenciar.css';
import { Search, Link as LinkIcon, Package, Box, Car, FileText, Users, UserCog, ArrowLeft, CreditCard, MapPin, Save, MessageSquare, Image as ImageIcon, Trash2 } from 'lucide-react';

const normalizeMapDeviceLabelMode = (value) => {
  if (value === 'cliente') return 'nome';
  if (value === 'placa') return 'placa';
  if (value === 'nome' || value === 'nome_placa') return value;
  return 'nome_placa';
};

const Gerenciar = ({ onNavigate }) => {
  const [currentView, setCurrentView] = useState('main'); // main, integracoes, asaas, gmaps
  
  // States for forms
  const [gmapsKey, setGmapsKey] = useState(() => localStorage.getItem('gmapsKey') || '');
  const [mapDeviceLabelMode, setMapDeviceLabelMode] = useState(() => normalizeMapDeviceLabelMode(localStorage.getItem('mapDeviceLabelMode')));
  const [asaasToken, setAsaasToken] = useState(() => localStorage.getItem('asaasToken') || '');
  const [asaasEnv, setAsaasEnv] = useState(() => localStorage.getItem('asaasEnv') || 'sandbox'); // sandbox or production
  


  const [smsmarketLogin, setSmsmarketLogin] = useState(() => localStorage.getItem('smsmarketLogin') || '');
  const [smsmarketToken, setSmsmarketToken] = useState(() => localStorage.getItem('smsmarketToken') || '');
  
  // States for icons
  const [vehicleIcons, setVehicleIcons] = useState([]);
  const [newIconName, setNewIconName] = useState('');
  const [newIconUrl, setNewIconUrl] = useState('');

  const fetchIcons = async () => {
    try {
      const res = await fetch('/api/vehicle-icons/');
      if (res.ok) {
        const data = await res.json();
        setVehicleIcons(data);
      }
    } catch (error) {
      console.error('Erro ao buscar ícones:', error);
    }
  };

  const handleAddIcon = async () => {
    if (!newIconName || !newIconUrl) {
      alert('Nome e URL são obrigatórios.');
      return;
    }
    try {
      const res = await fetch('/api/vehicle-icons/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newIconName, image_url: newIconUrl })
      });
      if (res.ok) {
        setNewIconName('');
        setNewIconUrl('');
        fetchIcons();
        alert('Ícone salvo com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao salvar ícone:', error);
    }
  };

  const handleDeleteIcon = async (id) => {
    if (!window.confirm('Excluir este ícone?')) return;
    try {
      const res = await fetch(`/api/vehicle-icons/${id}/`, { method: 'DELETE' });
      if (res.ok) {
        fetchIcons();
      }
    } catch (error) {
      console.error('Erro ao excluir ícone:', error);
    }
  };

  const handleSaveGmaps = () => {
    if (!gmapsKey) {
      alert('Por favor, insira a chave de API.');
      return;
    }
    localStorage.setItem('gmapsKey', gmapsKey);
    localStorage.setItem('mapDeviceLabelMode', mapDeviceLabelMode);
    alert('Chave de API do Google Maps salva com sucesso!');
  };

  const handleSaveSmsGateway = async (provider) => {
    let login = '';
    let token = '';
    let providerName = '';

    if (provider === 'smsmarket') {
      if (!smsmarketLogin || !smsmarketToken) {
        alert('Por favor, insira o Usuário e Senha do SMS Market.');
        return;
      }
      login = smsmarketLogin;
      token = smsmarketToken;
      providerName = 'SMS Market';
      localStorage.setItem('smsmarketLogin', smsmarketLogin);
      localStorage.setItem('smsmarketToken', smsmarketToken);
    }

    // Salvar configuração direto no servidor via API para o Traccar
    try {
      const response = await fetch('/api/config/smsgateway/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, login, token })
      });
      if (response.ok) {
        alert(`Configuração do ${providerName} salva! O Traccar foi atualizado com sucesso.`);
      } else {
        alert(`Configuração salva localmente, mas falha ao atualizar o Traccar no servidor.`);
      }
    } catch (err) {
      console.error(err);
      alert('Configuração salva localmente. Sem conexão com o backend.');
    }
  };

  const handleSaveAsaas = () => {
    if (!asaasToken) {
      alert('Por favor, insira o Token do Asaas.');
      return;
    }
    localStorage.setItem('asaasToken', asaasToken);
    localStorage.setItem('asaasEnv', asaasEnv);
    alert(`Integração Asaas (${asaasEnv === 'sandbox' ? 'Modo Debug' : 'Produção'}) configurada com sucesso!`);
  };

  return (
    <div className="gerenciar-page">
      
      {currentView === 'main' && (
        <>
          {/* SEÇÃO OPERAÇÕES */}
          <div className="section-block">
            <h2>Operações</h2>
            <div className="grid-cards">
              
              <div className="action-card" onClick={() => setCurrentView('integracoes')}>
                <LinkIcon size={32} className="action-icon" />
                <span>Integrações</span>
              </div>

              <div className="action-card">
                <Package size={32} className="action-icon" />
                <span>Estoque</span>
              </div>

              <div className="action-card">
                <Box size={32} className="action-icon" />
                <span>Produtos</span>
              </div>

              <div className="action-card">
                <Car size={32} className="action-icon" />
                <span>Pronta Resposta</span>
              </div>

            </div>
          </div>

          {/* SEÇÃO GERENCIAMENTO */}
          <div className="section-block">
            <h2>Gerenciamento</h2>
            <div className="grid-cards">
              
              <div className="action-card">
                <FileText size={32} className="action-icon" />
                <span>Contrato</span>
              </div>

              <div className="action-card">
                <Users size={32} className="action-icon" />
                <span>Motoristas</span>
              </div>

              <div className="action-card" onClick={() => onNavigate && onNavigate('Técnicos')}>
                <UserCog size={32} className="action-icon" />
                <span>Técnico</span>
              </div>

              <div className="action-card" onClick={() => { setCurrentView('icones'); fetchIcons(); }}>
                <ImageIcon size={32} className="action-icon" />
                <span>Ícones</span>
              </div>

            </div>
          </div>
        </>
      )}

      {currentView === 'integracoes' && (
        <>
          <div className="section-block">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <button 
                onClick={() => setCurrentView('main')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#4B5563' }}
              >
                <ArrowLeft size={24} />
              </button>
              <h2 style={{ margin: 0 }}>Integrações</h2>
            </div>
            
            <div className="grid-cards">
              <div className="action-card" onClick={() => setCurrentView('asaas')}>
                <CreditCard size={32} className="action-icon" />
                <span>Asaas</span>
              </div>

              <div className="action-card" onClick={() => setCurrentView('gmaps')}>
                <MapPin size={32} className="action-icon" />
                <span>Google Maps</span>
              </div>



              <div className="action-card" onClick={() => setCurrentView('smsmarket')}>
                <MessageSquare size={32} className="action-icon" />
                <span>SMS Market</span>
              </div>
            </div>
          </div>
        </>
      )}

      {currentView === 'gmaps' && (
        <>
          <div className="section-block">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <button 
                onClick={() => setCurrentView('integracoes')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#4B5563' }}
              >
                <ArrowLeft size={24} />
              </button>
              <h2 style={{ margin: 0 }}>Integração Google Maps</h2>
            </div>
            
            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', maxWidth: '600px' }}>
              <p style={{ color: '#4B5563', fontSize: '14px', marginBottom: '20px' }}>
                Insira sua chave de API do Google Maps. Essa chave permitirá que seus clientes visualizem os veículos em diferentes modos de mapa (Satélite, Relevo, Padrão) com alta precisão.
              </p>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Chave de API (API Key)</label>
                <input 
                  type="text" 
                  value={gmapsKey}
                  onChange={(e) => setGmapsKey(e.target.value)}
                  placeholder="AIzaSyA..." 
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px' }}
                />
              </div>

              <div style={{ marginBottom: '24px', padding: '16px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '12px' }}>
                  Visualização dos carros no mapa
                </label>
                <div style={{ display: 'flex', gap: '16px', flexDirection: 'column' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', color: '#4B5563' }}>
                    <input
                      type="radio"
                      value="nome_placa"
                      checked={mapDeviceLabelMode === 'nome_placa'}
                      onChange={() => setMapDeviceLabelMode('nome_placa')}
                      style={{ cursor: 'pointer' }}
                    />
                    Nome + placa
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', color: '#4B5563' }}>
                    <input
                      type="radio"
                      value="nome"
                      checked={mapDeviceLabelMode === 'nome'}
                      onChange={() => setMapDeviceLabelMode('nome')}
                      style={{ cursor: 'pointer' }}
                    />
                    Apenas nome
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', color: '#4B5563' }}>
                    <input
                      type="radio"
                      value="placa"
                      checked={mapDeviceLabelMode === 'placa'}
                      onChange={() => setMapDeviceLabelMode('placa')}
                      style={{ cursor: 'pointer' }}
                    />
                    Apenas placa
                  </label>
                </div>
              </div>

              <button 
                onClick={handleSaveGmaps}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3B82F6', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
              >
                <Save size={18} /> Salvar Configuração
              </button>
            </div>
          </div>
        </>
      )}

      {currentView === 'asaas' && (
        <>
          <div className="section-block">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <button 
                onClick={() => setCurrentView('integracoes')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#4B5563' }}
              >
                <ArrowLeft size={24} />
              </button>
              <h2 style={{ margin: 0 }}>Integração Asaas (Financeiro)</h2>
            </div>
            
            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', maxWidth: '600px' }}>
              <p style={{ color: '#4B5563', fontSize: '14px', marginBottom: '20px' }}>
                Configure o token da sua conta Asaas. Esta integração automatiza a criação de clientes, emissão de faturas, cobranças recorrentes e gestão financeira geral diretamente pela plataforma BL Rastreamento.
              </p>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Ambiente de Integração</label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      value="sandbox" 
                      checked={asaasEnv === 'sandbox'} 
                      onChange={() => setAsaasEnv('sandbox')} 
                      style={{ cursor: 'pointer' }}
                    />
                    Modo Debug (Sandbox)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      value="production" 
                      checked={asaasEnv === 'production'} 
                      onChange={() => setAsaasEnv('production')}
                      style={{ cursor: 'pointer' }}
                    />
                    Produção
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Token de Acesso (API Token)</label>
                <input 
                  type="password" 
                  value={asaasToken}
                  onChange={(e) => setAsaasToken(e.target.value)}
                  placeholder={`Insira seu Access Token do Asaas (${asaasEnv === 'sandbox' ? 'Sandbox' : 'Produção'})`}
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px' }}
                />
              </div>

              <div style={{ marginBottom: '24px', padding: '16px', background: '#F3F4F6', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '14px', color: '#1F2937', marginBottom: '8px', marginTop: 0 }}>Recursos ativados com essa integração:</h4>
                <ul style={{ fontSize: '13px', color: '#4B5563', paddingLeft: '20px', margin: 0 }}>
                  <li>Sincronização automática de clientes</li>
                  <li>Geração de faturas e carnês</li>
                  <li>Notificações automáticas de cobrança</li>
                  <li>Reconciliação bancária</li>
                </ul>
              </div>

              <button 
                onClick={handleSaveAsaas}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3B82F6', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
              >
                <Save size={18} /> Conectar ao Asaas
              </button>
            </div>
          </div>
        </>
      )}



      {currentView === 'smsmarket' && (
        <>
          <div className="section-block">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <button 
                onClick={() => setCurrentView('integracoes')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#4B5563' }}
              >
                <ArrowLeft size={24} />
              </button>
              <h2 style={{ margin: 0 }}>Integração SMS Market</h2>
            </div>
            
            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', maxWidth: '600px' }}>
              <p style={{ color: '#4B5563', fontSize: '14px', marginBottom: '20px' }}>
                Configure a sua conta SMS Market para habilitar o envio de SMS a partir do servidor. Ao salvar, as configurações do Traccar serão atualizadas automaticamente para utilizar este Gateway SMS.
              </p>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Usuário SMS Market</label>
                <input 
                  type="text" 
                  value={smsmarketLogin}
                  onChange={(e) => setSmsmarketLogin(e.target.value)}
                  placeholder="Seu usuário da SMS Market" 
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px' }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Senha SMS Market</label>
                <input 
                  type="password" 
                  value={smsmarketToken}
                  onChange={(e) => setSmsmarketToken(e.target.value)}
                  placeholder="Sua senha da SMS Market" 
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px' }}
                />
              </div>

              <button 
                onClick={() => handleSaveSmsGateway('smsmarket')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3B82F6', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
              >
                <Save size={18} /> Salvar Integração SMS Market
              </button>
            </div>
          </div>
        </>
      )}

      {currentView === 'icones' && (
        <>
          <div className="section-block">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <button 
                onClick={() => setCurrentView('main')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#4B5563' }}
              >
                <ArrowLeft size={24} />
              </button>
              <h2 style={{ margin: 0 }}>Gerenciar Ícones de Veículos</h2>
            </div>
            
            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', maxWidth: '800px' }}>
              <p style={{ color: '#4B5563', fontSize: '14px', marginBottom: '20px' }}>
                Adicione ícones personalizados usando o link (URL) da imagem. Estes ícones poderão ser selecionados no cadastro de veículos para aparecerem no mapa em vez do pino padrão.
              </p>
              
              <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Nome do Ícone (ex: Moto Honda)</label>
                  <input 
                    type="text" 
                    value={newIconName}
                    onChange={(e) => setNewIconName(e.target.value)}
                    placeholder="Nome" 
                    style={{ width: '100%', padding: '10px 16px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>
                <div style={{ flex: 2 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>URL da Imagem</label>
                  <input 
                    type="text" 
                    value={newIconUrl}
                    onChange={(e) => setNewIconUrl(e.target.value)}
                    placeholder="https://exemplo.com/imagem.png" 
                    style={{ width: '100%', padding: '10px 16px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px' }}
                  />
                </div>
                <button 
                  onClick={handleAddIcon}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--accent-gold, #D4AF37)', color: '#111827', padding: '10px 20px', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', height: '42px' }}
                >
                  <Save size={18} /> Adicionar
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px' }}>
                {vehicleIcons.map(icon => (
                  <div key={icon.id} style={{ border: '1px solid #E5E7EB', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                    <button 
                      onClick={() => handleDeleteIcon(icon.id)}
                      style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                    <img src={icon.image_url} alt={icon.name} style={{ width: '60px', height: '60px', objectFit: 'contain', marginBottom: '8px' }} />
                    <span style={{ fontSize: '13px', fontWeight: '500', textAlign: 'center', color: '#374151', wordBreak: 'break-word' }}>{icon.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default Gerenciar;
