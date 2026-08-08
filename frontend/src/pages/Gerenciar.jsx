import React, { useState } from 'react';
import './Gerenciar.css';
import {
  Search, Link as LinkIcon, Package, Box, FileText, Users, UserCog, ArrowLeft,
  CreditCard, MapPin, Save, MessageSquare, Image as ImageIcon, Trash2, IdCard,
  Eye, EyeOff,
} from 'lucide-react';
import CarIcon from '../components/CarIcon';

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
  const [placaFipeToken, setPlacaFipeToken] = useState(() => localStorage.getItem('placaFipeToken') || '');
  const [placaFipeTest, setPlacaFipeTest] = useState('');
  const [placaFipeResult, setPlacaFipeResult] = useState(null);
  const [placaFipeLoading, setPlacaFipeLoading] = useState(false);
  const [showAsaasToken, setShowAsaasToken] = useState(false);
  const [showGmapsKey, setShowGmapsKey] = useState(false);
  const [showSmsToken, setShowSmsToken] = useState(false);
  const [showPlacaToken, setShowPlacaToken] = useState(false);
  
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

  const handleSavePlacaFipe = () => {
    if (!placaFipeToken.trim()) {
      alert('Por favor, insira o token da consulta de placa.');
      return;
    }
    localStorage.setItem('placaFipeToken', placaFipeToken.trim().replace(/^["']|["']$/g, '').replace(/\s+/g, ''));
    alert('Token da consulta de placa salvo com sucesso!');
  };

  const handleTestPlacaFipe = async () => {
    const placa = placaFipeTest.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const token = (placaFipeToken.trim() || localStorage.getItem('placaFipeToken') || '').replace(/^["']|["']$/g, '').replace(/\s+/g, '');
    if (!token) {
      alert('Salve o token da consulta de placa antes de consultar.');
      return;
    }
    if (placa.length < 7) {
      alert('Informe uma placa válida para testar.');
      return;
    }
    setPlacaFipeLoading(true);
    setPlacaFipeResult(null);
    try {
      const res = await fetch('/api/placafipe/lookup/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placa, token })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Não foi possível consultar a placa.');
        return;
      }
      setPlacaFipeResult(data);
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao consultar a placa.');
    } finally {
      setPlacaFipeLoading(false);
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
                <CarIcon size={32} className="action-icon" />
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
            <div className="integration-header">
              <button type="button" className="integration-back" onClick={() => setCurrentView('main')}>
                <ArrowLeft size={24} />
              </button>
              <h2>Integrações</h2>
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

              <div className="action-card" onClick={() => setCurrentView('placafipe')}>
                <IdCard size={32} className="action-icon" />
                <span>Consulta de Placa</span>
              </div>
            </div>
          </div>
        </>
      )}

      {currentView === 'gmaps' && (
        <>
          <div className="section-block">
            <div className="integration-header">
              <button type="button" className="integration-back" onClick={() => setCurrentView('integracoes')}>
                <ArrowLeft size={24} />
              </button>
              <h2>Integração Google Maps</h2>
            </div>

            <div className="integration-card">
              <p className="integration-desc">
                Insira sua chave de API do Google Maps. Essa chave permitirá que seus clientes visualizem os veículos em diferentes modos de mapa (Satélite, Relevo, Padrão) com alta precisão.
              </p>

              <div className="integration-field">
                <label className="integration-label">Chave de API (API Key)</label>
                <div className="integration-secret">
                  <input
                    type={showGmapsKey ? 'text' : 'password'}
                    value={gmapsKey}
                    onChange={(e) => setGmapsKey(e.target.value)}
                    placeholder="AIzaSyA..."
                    className="integration-input"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="integration-secret__toggle"
                    onClick={() => setShowGmapsKey((v) => !v)}
                    title={showGmapsKey ? 'Ocultar chave' : 'Mostrar chave'}
                    aria-label={showGmapsKey ? 'Ocultar chave' : 'Mostrar chave'}
                  >
                    {showGmapsKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="integration-panel">
                <label className="integration-label">Visualização dos carros no mapa</label>
                <div className="integration-radios">
                  <label className="integration-radio">
                    <input
                      type="radio"
                      value="nome_placa"
                      checked={mapDeviceLabelMode === 'nome_placa'}
                      onChange={() => setMapDeviceLabelMode('nome_placa')}
                    />
                    Nome + placa
                  </label>
                  <label className="integration-radio">
                    <input
                      type="radio"
                      value="nome"
                      checked={mapDeviceLabelMode === 'nome'}
                      onChange={() => setMapDeviceLabelMode('nome')}
                    />
                    Apenas nome
                  </label>
                  <label className="integration-radio">
                    <input
                      type="radio"
                      value="placa"
                      checked={mapDeviceLabelMode === 'placa'}
                      onChange={() => setMapDeviceLabelMode('placa')}
                    />
                    Apenas placa
                  </label>
                </div>
              </div>

              <button type="button" className="integration-btn" onClick={handleSaveGmaps}>
                <Save size={18} /> Salvar Configuração
              </button>
            </div>
          </div>
        </>
      )}

      {currentView === 'asaas' && (
        <>
          <div className="section-block">
            <div className="integration-header">
              <button type="button" className="integration-back" onClick={() => setCurrentView('integracoes')}>
                <ArrowLeft size={24} />
              </button>
              <h2>Integração Asaas (Financeiro)</h2>
            </div>

            <div className="integration-card">
              <p className="integration-desc">
                Configure o token da sua conta Asaas. Esta integração automatiza a criação de clientes, emissão de faturas, cobranças recorrentes e gestão financeira geral diretamente pela plataforma BL Rastreamento.
              </p>

              <div className="integration-field">
                <label className="integration-label">Ambiente de Integração</label>
                <div className="integration-radios integration-radios--row">
                  <label className="integration-radio">
                    <input
                      type="radio"
                      value="sandbox"
                      checked={asaasEnv === 'sandbox'}
                      onChange={() => setAsaasEnv('sandbox')}
                    />
                    Modo Debug (Sandbox)
                  </label>
                  <label className="integration-radio">
                    <input
                      type="radio"
                      value="production"
                      checked={asaasEnv === 'production'}
                      onChange={() => setAsaasEnv('production')}
                    />
                    Produção
                  </label>
                </div>
              </div>

              <div className="integration-field">
                <label className="integration-label">Token de Acesso (API Token)</label>
                <div className="integration-secret">
                  <input
                    type={showAsaasToken ? 'text' : 'password'}
                    value={asaasToken}
                    onChange={(e) => setAsaasToken(e.target.value)}
                    placeholder={`Insira seu Access Token do Asaas (${asaasEnv === 'sandbox' ? 'Sandbox' : 'Produção'})`}
                    className="integration-input"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="integration-secret__toggle"
                    onClick={() => setShowAsaasToken((v) => !v)}
                    title={showAsaasToken ? 'Ocultar token' : 'Mostrar token'}
                    aria-label={showAsaasToken ? 'Ocultar token' : 'Mostrar token'}
                  >
                    {showAsaasToken ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="integration-panel">
                <h4 className="integration-panel__title">Recursos ativados com essa integração:</h4>
                <ul className="integration-list">
                  <li>Sincronização automática de clientes</li>
                  <li>Geração de faturas e carnês</li>
                  <li>Notificações automáticas de cobrança</li>
                  <li>Reconciliação bancária</li>
                </ul>
              </div>

              <button type="button" className="integration-btn" onClick={handleSaveAsaas}>
                <Save size={18} /> Conectar ao Asaas
              </button>
            </div>
          </div>
        </>
      )}

      {currentView === 'smsmarket' && (
        <>
          <div className="section-block">
            <div className="integration-header">
              <button type="button" className="integration-back" onClick={() => setCurrentView('integracoes')}>
                <ArrowLeft size={24} />
              </button>
              <h2>Integração SMS Market</h2>
            </div>

            <div className="integration-card">
              <p className="integration-desc">
                Configure a sua conta SMS Market para habilitar o envio de SMS a partir do servidor. Ao salvar, as configurações do Traccar serão atualizadas automaticamente para utilizar este Gateway SMS.
              </p>

              <div className="integration-field">
                <label className="integration-label">Usuário SMS Market</label>
                <input
                  type="text"
                  value={smsmarketLogin}
                  onChange={(e) => setSmsmarketLogin(e.target.value)}
                  placeholder="Seu usuário da SMS Market"
                  className="integration-input"
                  autoComplete="username"
                />
              </div>

              <div className="integration-field">
                <label className="integration-label">Senha SMS Market</label>
                <div className="integration-secret">
                  <input
                    type={showSmsToken ? 'text' : 'password'}
                    value={smsmarketToken}
                    onChange={(e) => setSmsmarketToken(e.target.value)}
                    placeholder="Sua senha da SMS Market"
                    className="integration-input"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="integration-secret__toggle"
                    onClick={() => setShowSmsToken((v) => !v)}
                    title={showSmsToken ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-label={showSmsToken ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showSmsToken ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="button" className="integration-btn" onClick={() => handleSaveSmsGateway('smsmarket')}>
                <Save size={18} /> Salvar Integração SMS Market
              </button>
            </div>
          </div>
        </>
      )}

      {currentView === 'placafipe' && (
        <>
          <div className="section-block">
            <div className="integration-header">
              <button type="button" className="integration-back" onClick={() => setCurrentView('integracoes')}>
                <ArrowLeft size={24} />
              </button>
              <h2>Integração Consulta de Placa</h2>
            </div>

            <div className="integration-card">
              <p className="integration-desc">
                Informe o token JWT da API placas.app.br. Com ele, a tela de veículo consulta a placa e preenche marca, modelo, ano, cor e demais dados automaticamente.
              </p>

              <div className="integration-field">
                <label className="integration-label">Token</label>
                <div className="integration-secret">
                  <input
                    type={showPlacaToken ? 'text' : 'password'}
                    value={placaFipeToken}
                    onChange={(e) => setPlacaFipeToken(e.target.value)}
                    placeholder="Cole o token JWT de placas.app.br"
                    className="integration-input"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="integration-secret__toggle"
                    onClick={() => setShowPlacaToken((v) => !v)}
                    title={showPlacaToken ? 'Ocultar token' : 'Mostrar token'}
                    aria-label={showPlacaToken ? 'Ocultar token' : 'Mostrar token'}
                  >
                    {showPlacaToken ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="button" className="integration-btn" onClick={handleSavePlacaFipe}>
                <Save size={18} /> Salvar token
              </button>

              <div className="integration-divider">
                <label className="integration-label">Testar consulta por placa</label>
                <div className="integration-test-row">
                  <input
                    type="text"
                    value={placaFipeTest}
                    onChange={(e) => setPlacaFipeTest(e.target.value.toUpperCase())}
                    placeholder="ABC1D23"
                    maxLength={8}
                    className="integration-input"
                  />
                  <button
                    type="button"
                    className="integration-btn integration-btn--secondary"
                    onClick={handleTestPlacaFipe}
                    disabled={placaFipeLoading}
                  >
                    <Search size={16} /> {placaFipeLoading ? 'Consultando...' : 'Pesquisar'}
                  </button>
                </div>
                {placaFipeResult && (
                  <div className="integration-result">
                    <div><strong>{placaFipeResult.marca}</strong> {placaFipeResult.modelo}</div>
                    <div>Ano: {placaFipeResult.ano} · Cor: {placaFipeResult.cor}</div>
                    <div>Combustível: {placaFipeResult.combustivel}</div>
                  </div>
                )}
              </div>
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
