import React, { useState } from 'react';
import { User, Key } from 'lucide-react';
import LoginMapBackground from './LoginMapBackground';
import * as OTPAuth from 'otpauth';
import './Login.css';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // Estados para 2FA
  const [step, setStep] = useState('credentials');
  const [twoFaCode, setTwoFaCode] = useState('');
  const [pendingRole, setPendingRole] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (step === 'credentials') {
      const formattedEmail = email.trim().toLowerCase();
      
      try {
        const response = await fetch('http://localhost:8000/api/auth/login/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formattedEmail, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          setError('');
          if (data.requires_2fa) {
            setPendingRole(data.role);
            localStorage.setItem('2fa_secret_temp', data.otp_secret);
            if (data.customer_id) localStorage.setItem('customer_id', data.customer_id);
            setStep('2fa');
          } else {
            if (data.customer_id) localStorage.setItem('customer_id', data.customer_id);
            onLogin(data.role);
          }
        } else {
          setError(data.error || 'Usuário ou senha inválidos. Tente novamente.');
        }
      } catch (err) {
        setError('Erro de conexão com o servidor.');
      }
    } else if (step === '2fa') {
      // Validação do código de 6 dígitos REAL com otplib
      const code = twoFaCode.replace(/\D/g, '');
      const secret = localStorage.getItem('2fa_secret_temp');

      if (code.length === 6) {
        if (!secret) {
          setError('Erro fatal: Chave secreta 2FA não encontrada.');
          return;
        }

        const totp = new OTPAuth.TOTP({
          issuer: 'BLRastreamento',
          label: 'Junior',
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          secret: secret
        });

        // validate returns the delta (integer) if valid, or null if invalid
        // Usamos window: 5 (±2.5 minutos) para tolerar relógios desregulados no PC do usuário
        const isValid = totp.validate({ token: code, window: 5 }) !== null;
        
        if (isValid) {
          setError('');
          onLogin(pendingRole);
        } else {
          setError('Código inválido. Verifique o aplicativo Authenticator e tente novamente.');
        }
      } else {
        setError('O código precisa ter 6 números.');
      }
    }
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="login-left-content">
          <div className="login-header">
            <div className="login-logo-wrapper">
              <img src="/logo.jpg" alt="BL Rastreamento Logo" className="login-logo-img" />
            </div>
          </div>

          {error && (
            <div className="login-error">
              <span>{error}</span>
            </div>
          )}

          <form className="login-form-styled" onSubmit={handleSubmit}>
            
            {step === 'credentials' ? (
              <>
                <div className="input-styled-wrapper">
                  <User size={18} className="input-styled-icon" />
                  <input
                    type="text"
                    placeholder="Usuário"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="input-styled-wrapper">
                  <Key size={18} className="input-styled-icon" />
                  <input
                    type="password"
                    placeholder="Senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="btn-acessar">
                  ACESSAR
                </button>
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: '24px', color: '#111827' }}>
                  <p style={{ fontSize: '15px', fontWeight: '500' }}>Verificação em Duas Etapas</p>
                  <p style={{ fontSize: '13px', color: '#4b5563', marginTop: '8px' }}>
                    Digite o código de 6 dígitos gerado pelo seu aplicativo autenticador.
                  </p>
                </div>
                
                <div className="input-styled-wrapper" style={{ justifyContent: 'center' }}>
                  <input
                    type="text"
                    placeholder="000000"
                    value={twoFaCode}
                    onChange={(e) => setTwoFaCode(e.target.value)}
                    maxLength={6}
                    style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px', paddingLeft: '24px', color: '#111827' }}
                    required
                  />
                </div>

                <button type="submit" className="btn-acessar">
                  VERIFICAR CÓDIGO
                </button>
                
                <button 
                  type="button" 
                  onClick={() => {
                    setStep('credentials');
                    setTwoFaCode('');
                    setError('');
                  }} 
                  style={{ 
                    marginTop: '16px', background: 'transparent', border: 'none', 
                    color: '#4b5563', fontSize: '14px', cursor: 'pointer', width: '100%',
                    textDecoration: 'underline'
                  }}
                >
                  Voltar para o login
                </button>
              </>
            )}

          </form>
        </div>
      </div>
      <div className="login-right">
        <LoginMapBackground />
      </div>
    </div>
  );
};

export default Login;

