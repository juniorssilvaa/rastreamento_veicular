import React, { useState, useEffect } from 'react';
import './Perfil.css';
import { Camera, Upload, User, Shield, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import * as OTPAuth from 'otpauth';

const Perfil = () => {
  const [perfilData, setPerfilData] = useState({
    nome: '',
    username: '',
    email: '',
    senha: '',
    foto: null
  });

  const [twoFaData, setTwoFaData] = useState(() => {
    const isAtivo = localStorage.getItem('2fa_active') === 'true';
    const savedSecret = localStorage.getItem('2fa_secret') || '';
    return {
      ativo: isAtivo,
      otpSecret: savedSecret,
      dataCadastro: isAtivo ? '20/05/2026 17:38:13' : '',
      dataAlteracao: isAtivo ? '20/05/2026 17:39:47' : ''
    };
  });

  // Carrega os dados reais do usuário logado
  useEffect(() => {
    const customerId = localStorage.getItem('customer_id');
    if (customerId) {
      fetch(`/api/auth/users/${customerId}/profile/`)
        .then(res => res.json())
        .then(data => {
          setPerfilData(prev => ({
            ...prev,
            nome: data.name || '',
            username: data.username || '',
            email: data.email || ''
          }));
          // Atualiza 2FA com dados do banco
          if (data.otp_secret && data.otp_secret !== '-') {
            setTwoFaData(prev => ({
              ...prev,
              ativo: true,
              otpSecret: data.otp_secret
            }));
          } else {
            setTwoFaData(prev => ({ ...prev, ativo: false, otpSecret: '' }));
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleFotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setPerfilData(prev => ({ ...prev, foto: imageUrl }));
      toast.success('Foto de perfil atualizada!');
    }
  };

  const handleSavePerfil = async () => {
    const customerId = localStorage.getItem('customer_id');
    if (!customerId) {
      toast.error('Sessão inválida. Faça login novamente.');
      return;
    }

    try {
      const body = {};
      if (perfilData.username) body.username = perfilData.username;
      if (perfilData.senha) body.password = perfilData.senha;

      const response = await fetch(`/api/auth/users/${customerId}/update-profile/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Dados do perfil salvos com sucesso!');
        setPerfilData(prev => ({ ...prev, senha: '' }));
      } else {
        toast.error(data.error || 'Erro ao salvar dados');
      }
    } catch (err) {
      toast.error('Erro de conexão com o servidor');
    }
  };

  const handleSave2FA = async () => {
    const now = new Date().toLocaleString('pt-BR');
    const customerId = localStorage.getItem('customer_id');

    let currentSecret = twoFaData.otpSecret;
    
    if (twoFaData.ativo) {
      if (!currentSecret || currentSecret === '-') {
        currentSecret = new OTPAuth.Secret().base32;
      }
      setTwoFaData(prev => ({ 
        ...prev, 
        otpSecret: currentSecret,
        dataCadastro: prev.dataCadastro || now, 
        dataAlteracao: now 
      }));
      localStorage.setItem('2fa_active', 'true');
      localStorage.setItem('2fa_secret', currentSecret);
    } else {
      currentSecret = null;
      setTwoFaData(prev => ({ 
        ...prev, 
        otpSecret: '-',
        dataCadastro: '', 
        dataAlteracao: '' 
      }));
      localStorage.setItem('2fa_active', 'false');
      localStorage.removeItem('2fa_secret');
    }

    if (customerId) {
      try {
        await fetch(`/api/auth/users/${customerId}/update-2fa/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ otp_secret: currentSecret })
        });
      } catch (err) {
        console.error('Erro ao salvar no banco', err);
      }
    }

    toast.success('Configurações de 2FA atualizadas!');
  };

  const handleRecriarChave = () => {
    const now = new Date().toLocaleString('pt-BR');
    const newSecret = new OTPAuth.Secret().base32;
    setTwoFaData(prev => ({ 
      ...prev, 
      otpSecret: newSecret, 
      dataAlteracao: now 
    }));
    localStorage.setItem('2fa_secret', newSecret);
    toast.success('Nova chave gerada!');
  };

  return (
    <div className="perfil-container">
      <h1 className="perfil-title">Meu Perfil</h1>

      <div className="perfil-grid">
        
        {/* SEÇÃO GERAL (FOTO E SENHA) */}
        <section className="perfil-section">
          <div className="section-header">
            Informações da Conta
          </div>
          <div className="section-content">
            <div className="foto-row">
              <div className="foto-preview">
                {perfilData.foto ? (
                  <img src={perfilData.foto} alt="Perfil" />
                ) : (
                  <User size={40} color="#9ca3af" />
                )}
              </div>
              <div>
                <label className="btn-upload-foto">
                  <Upload size={16} />
                  Escolher nova foto
                  <input type="file" accept="image/*" onChange={handleFotoUpload} hidden />
                </label>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                  Tamanho recomendado: 256x256px
                </p>
              </div>
            </div>

            <div className="form-row">
              <div className="input-group-p">
                <label>Nome de Usuário (login)</label>
                <input 
                  type="text" 
                  value={perfilData.username} 
                  onChange={(e) => setPerfilData({...perfilData, username: e.target.value})}
                  placeholder="Seu nome de usuário"
                />
              </div>
              <div className="input-group-p">
                <label>Nova Senha (deixe em branco para manter)</label>
                <input 
                  type="password" 
                  placeholder="Digite a nova senha"
                  value={perfilData.senha} 
                  onChange={(e) => setPerfilData({...perfilData, senha: e.target.value})} 
                />
              </div>
            </div>

            <div>
              <button className="btn-success" onClick={handleSavePerfil}>Salvar Alterações</button>
            </div>
          </div>
        </section>

        {/* SEÇÃO 2FA - CONFORME SCREENSHOT */}
        <div className="two-fa-grid">
          
          {/* PANEL ESQUERDO: DADOS */}
          <div className="two-fa-panel">
            <div className="two-fa-header">Dados</div>
            <div className="two-fa-body">
              <div className="dados-list">
                <div className="dado-row">
                  <div className="dado-label">Usuário:</div>
                  <div className="dado-value">
                    <span className="dado-text" style={{ fontWeight: 500 }}>{perfilData.username || '-'}</span>
                  </div>
                </div>
                
                <div className="dado-row">
                  <div className="dado-label">OTP Secret:</div>
                  <div className="dado-value">
                    <span className="dado-text">
                      {twoFaData.otpSecret === '-' ? '-' : '****************' + twoFaData.otpSecret.slice(-2)}
                    </span>
                  </div>
                </div>
                
                <div className="dado-row">
                  <div className="dado-label">Cadastrado:</div>
                  <div className="dado-value">
                    <span className="dado-text">{twoFaData.dataCadastro || '-'}</span>
                  </div>
                </div>
                
                <div className="dado-row">
                  <div className="dado-label">Alterado:</div>
                  <div className="dado-value">
                    <span className="dado-text">{twoFaData.dataAlteracao || '-'}</span>
                  </div>
                </div>
                
                <div className="dado-row" style={{ marginTop: '4px' }}>
                  <div className="dado-label">Ativo:</div>
                  <div className="dado-value">
                    <input 
                      type="checkbox" 
                      checked={twoFaData.ativo}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        if (isChecked && (!twoFaData.otpSecret || twoFaData.otpSecret === '-')) {
                          setTwoFaData({
                            ...twoFaData, 
                            ativo: true, 
                            otpSecret: new OTPAuth.Secret().base32
                          });
                        } else {
                          setTwoFaData({...twoFaData, ativo: isChecked});
                        }
                      }}
                    />
                  </div>
                </div>

                {!twoFaData.ativo && (
                  <div className="dado-row" style={{ marginTop: '12px', alignItems: 'flex-start' }}>
                    <div className="dado-label" style={{ marginTop: '6px' }}>Senha OTP:</div>
                    <div className="dado-value">
                      <input 
                        type="text" 
                        className="dado-input"
                        placeholder=""
                      />
                      <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '4px' }}>
                        Para habilitar o 2FA, é necessário confirmar a Senha OTP gerada no aplicativo.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="qrcode-box">
                {twoFaData.ativo && twoFaData.otpSecret && twoFaData.otpSecret !== '-' ? (
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=otpauth://totp/BLRastreamento:${encodeURIComponent(perfilData.username || 'usuario')}?secret=${twoFaData.otpSecret}&issuer=BLRastreamento`} alt="QR Code 2FA" />
                ) : (
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=otpauth://totp/BLRastreamento:${encodeURIComponent(perfilData.username || 'usuario')}?secret=JBSWY3DPEHPK3PXP&issuer=BLRastreamento`} alt="QR Code Placeholder" />
                )}
              </div>
            </div>
            <div className="panel-footer">
              <button className="btn-success" onClick={handleSave2FA}>Salvar</button>
              {!twoFaData.ativo && (
                <button className="btn-warning" onClick={handleRecriarChave}>Recriar Chave</button>
              )}
            </div>
          </div>

          {/* PANEL DIREITO: APLICATIVOS */}
          <div className="two-fa-panel">
            <div className="two-fa-header">Aplicativos Recomendados</div>
            <div className="two-fa-body">

              <div className="app-list">
                {[
                  { name: 'Google Authenticator', icon: '/badges/googleotp.webp' },
                  { name: 'Microsoft Authenticator', icon: '/badges/microsoftotp.webp' },
                  { name: 'FreeOTP Authenticator', icon: '/badges/freeotp.webp' },
                  { name: 'Authy Authenticator', icon: '/badges/authyotp.webp' }
                ].map((app, idx) => (
                  <div className="app-item" key={idx}>
                    <div className="app-icon">
                      <img src={app.icon} alt={app.name} />
                    </div>
                    <div className="app-name">{app.name}</div>
                    <div className="app-badges">
                      <img src="/badges/appstore-badge.png" alt="App Store" className="badge-img" />
                      <img src="/badges/play-badge.png" alt="Google Play" className="badge-img" />
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Perfil;
