import React, { useState } from 'react';
import './Gerenciar.css';
import { Search, Link, Package, Box, Car, FileText, Users, UserCog, ArrowLeft, CreditCard, MapPin, Save, MessageSquare } from 'lucide-react';

const Gerenciar = () => {
  const [currentView, setCurrentView] = useState('main'); // main, integracoes, asaas, gmaps
  
  // States for forms
  const [gmapsKey, setGmapsKey] = useState(() => localStorage.getItem('gmapsKey') || '');
  const [asaasToken, setAsaasToken] = useState(() => localStorage.getItem('asaasToken') || '');
  const [asaasEnv, setAsaasEnv] = useState(() => localStorage.getItem('asaasEnv') || 'sandbox'); // sandbox or production
  
  const [kingsmsLogin, setKingsmsLogin] = useState(() => localStorage.getItem('kingsmsLogin') || '');
  const [kingsmsToken, setKingsmsToken] = useState(() => localStorage.getItem('kingsmsToken') || '');

  const [smsmarketLogin, setSmsmarketLogin] = useState(() => localStorage.getItem('smsmarketLogin') || '');
  const [smsmarketToken, setSmsmarketToken] = useState(() => localStorage.getItem('smsmarketToken') || '');

  const handleSaveGmaps = () => {
    if (!gmapsKey) {
      alert('Por favor, insira a chave de API.');
      return;
    }
    localStorage.setItem('gmapsKey', gmapsKey);
    alert('Chave de API do Google Maps salva com sucesso!');
  };

  const handleSaveSmsGateway = async (provider) => {
    let login = '';
    let token = '';
    let providerName = '';

    if (provider === 'kingsms') {
      if (!kingsmsLogin || !kingsmsToken) {
        alert('Por favor, insira o Login e Token da KingSMS.');
        return;
      }
      login = kingsmsLogin;
      token = kingsmsToken;
      providerName = 'KingSMS';
      localStorage.setItem('kingsmsLogin', kingsmsLogin);
      localStorage.setItem('kingsmsToken', kingsmsToken);
    } else if (provider === 'smsmarket') {
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
      
      {/* BARRA DE PESQUISA */}
      <div className="search-bar-container">
        <div className="input-group">
          <Search size={18} color="#6B7280" className="search-icon" />
          <input type="text" placeholder="Digite aqui o que está buscando!" />
          <button className="btn-arrow">&rarr;</button>
        </div>
        <button className="btn-ok">OK</button>
      </div>

      {currentView === 'main' && (
        <>
          {/* SEÇÃO OPERAÇÕES */}
          <div className="section-block">
            <h2>Operações</h2>
            <div className="grid-cards">
              
              <div className="action-card" onClick={() => setCurrentView('integracoes')}>
                <Link size={32} color="#1F2937" />
                <span>Integrações</span>
              </div>

              <div className="action-card">
                <Package size={32} color="#1F2937" />
                <span>Estoque</span>
              </div>

              <div className="action-card">
                <Box size={32} color="#1F2937" />
                <span>Produtos</span>
              </div>

              <div className="action-card">
                <Car size={32} color="#1F2937" />
                <span>Pronta Resposta</span>
              </div>

            </div>
          </div>

          {/* SEÇÃO GERENCIAMENTO */}
          <div className="section-block">
            <h2>Gerenciamento</h2>
            <div className="grid-cards">
              
              <div className="action-card">
                <FileText size={32} color="#1F2937" />
                <span>Contrato</span>
              </div>

              <div className="action-card">
                <Users size={32} color="#1F2937" />
                <span>Motoristas</span>
              </div>

              <div className="action-card">
                <UserCog size={32} color="#1F2937" />
                <span>Técnico</span>
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
                <CreditCard size={32} color="#1F2937" />
                <span>Asaas</span>
              </div>

              <div className="action-card" onClick={() => setCurrentView('gmaps')}>
                <MapPin size={32} color="#1F2937" />
                <span>Google Maps</span>
              </div>

              <div className="action-card" onClick={() => setCurrentView('kingsms')}>
                <MessageSquare size={32} color="#1F2937" />
                <span>KingSMS</span>
              </div>

              <div className="action-card" onClick={() => setCurrentView('smsmarket')}>
                <MessageSquare size={32} color="#1F2937" />
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

      {currentView === 'kingsms' && (
        <>
          <div className="section-block">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <button 
                onClick={() => setCurrentView('integracoes')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#4B5563' }}
              >
                <ArrowLeft size={24} />
              </button>
              <h2 style={{ margin: 0 }}>Integração KingSMS</h2>
            </div>
            
            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', maxWidth: '600px' }}>
              <p style={{ color: '#4B5563', fontSize: '14px', marginBottom: '20px' }}>
                Configure a sua conta KingSMS para habilitar o envio de SMS a partir do servidor. Ao salvar, as configurações do Traccar serão atualizadas automaticamente para utilizar este Gateway SMS.
              </p>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Login KingSMS</label>
                <input 
                  type="text" 
                  value={kingsmsLogin}
                  onChange={(e) => setKingsmsLogin(e.target.value)}
                  placeholder="Seu login da KingSMS" 
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px' }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Token KingSMS</label>
                <input 
                  type="password" 
                  value={kingsmsToken}
                  onChange={(e) => setKingsmsToken(e.target.value)}
                  placeholder="Seu token da KingSMS" 
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '14px' }}
                />
              </div>

              <button 
                onClick={() => handleSaveSmsGateway('kingsms')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3B82F6', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
              >
                <Save size={18} /> Salvar Integração SMS
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

    </div>
  );
};

export default Gerenciar;
