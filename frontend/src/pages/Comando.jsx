import React, { useState, useEffect } from 'react';
import './Comando.css';
import { Send, ShieldCheck, ShieldAlert } from 'lucide-react';

const Comando = () => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [commandTypes, setCommandTypes] = useState([]);
  const [savedCommands, setSavedCommands] = useState([]);
  const [selectedCommand, setSelectedCommand] = useState('');
  const [isSavedCommand, setIsSavedCommand] = useState(false);
  const [customCommandData, setCustomCommandData] = useState('');
  const [forceSms, setForceSms] = useState(false);
  const [smsGateway, setSmsGateway] = useState('kingsms');
  const [status, setStatus] = useState('');
  const [smsResponses, setSmsResponses] = useState([]);
  const [loadingInbound, setLoadingInbound] = useState(false);
  const [inboundStatus, setInboundStatus] = useState('');

  const TRACCAR_COMMAND_NAMES = {
    'custom': 'Comando Personalizado',
    'deviceIdentification': 'Identificar Dispositivo',
    'positionSingle': 'Relatório Avulso (Posição Agora)',
    'positionPeriodic': 'Configurar Atualização Periódica',
    'positionStop': 'Parar Atualização',
    'engineStop': 'Desligar Motor (Bloqueio)',
    'engineResume': 'Religar Motor (Desbloqueio)',
    'alarmArm': 'Ativar Alarme',
    'alarmDisarm': 'Desativar Alarme',
    'setSpeedLimit': 'Definir Limite de Velocidade',
    'rebootDevice': 'Reiniciar Rastreador',
    'sendSms': 'Enviar SMS Manual',
    'sendUssd': 'Enviar USSD (Créditos)',
    'sosNumber': 'Configurar Número SOS',
    'silence': 'Modo Silencioso',
    'outputControl': 'Controle de Saída',
    'factoryReset': 'Restaurar Padrão de Fábrica'
  };

  useEffect(() => {
    // Busca dispositivos e comandos salvos em paralelo
    const loadInitialData = async () => {
        try {
            const [devRes, savedRes, typesRes] = await Promise.all([
                fetch('http://localhost:8000/api/traccar/devices/'),
                fetch('http://localhost:8000/api/traccar/entity/commands/'),
                fetch('http://localhost:8000/api/traccar/command-types/') // Busca TODOS os tipos
            ]);
            setDevices(await devRes.json());
            setSavedCommands(await savedRes.json());
            setCommandTypes(await typesRes.json());
        } catch (err) {
            console.error("Erro ao carregar dados iniciais:", err);
        }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      fetch(`http://localhost:8000/api/traccar/command-types/?deviceId=${selectedDevice}`)
        .then(res => res.json())
        .then(json => {
            const hasSms = json.some(c => c.type === 'sendSms');
            if (!hasSms) json.push({ type: 'sendSms' });
            setCommandTypes(json);
        })
        .catch(err => console.error("Erro ao carregar tipos de comando:", err));
    } else {
      fetch('http://localhost:8000/api/traccar/command-types/')
        .then(res => res.json())
        .then(json => {
            const hasSms = json.some(c => c.type === 'sendSms');
            if (!hasSms) json.push({ type: 'sendSms' });
            setCommandTypes(json);
        })
        .catch(err => console.error("Erro ao carregar tipos de comando:", err));
    }
  }, [selectedDevice]);

  const supportedCommandTypes = new Set((commandTypes || []).map(c => c.type));

  const visibleSavedCommands = savedCommands.filter((command) => {
    if (!selectedDevice) return true;
    if (!command.type) return true;
    return supportedCommandTypes.has(command.type);
  });

  const quickActionsEnabled = {
    engineStop: supportedCommandTypes.has('engineStop'),
    engineResume: supportedCommandTypes.has('engineResume'),
  };

  const handleSendCommand = async (commandIdOrType) => {
    if (!selectedDevice) {
      alert("Por favor, selecione um veículo.");
      return;
    }

    setStatus('Enviando...');
    try {
      const payload = {
        deviceId: selectedDevice,
        textChannel: forceSms
      };

      if (forceSms || commandIdOrType === 'sendSms') {
          payload.smsGateway = smsGateway;
          if (smsGateway === 'kingsms') {
              payload.smsLogin = localStorage.getItem('kingsmsLogin') || '';
              payload.smsToken = localStorage.getItem('kingsmsToken') || '';
          } else {
              payload.smsLogin = localStorage.getItem('smsmarketLogin') || '';
              payload.smsToken = localStorage.getItem('smsmarketToken') || '';
          }
      }

      if (isSavedCommand) {
          payload.id = commandIdOrType; // Envia o ID do comando salvo
          const savedCmd = savedCommands.find(c => c.id.toString() === commandIdOrType);
          if (savedCmd && savedCmd.attributes && savedCmd.attributes.data) {
              payload.attributes = { data: savedCmd.attributes.data };
          }
      } else {
          if (selectedDevice && !supportedCommandTypes.has(commandIdOrType)) {
            setStatus(`Comando "${TRACCAR_COMMAND_NAMES[commandIdOrType] || commandIdOrType}" não é suportado por este rastreador.`);
            return;
          }
          payload.type = commandIdOrType; // Envia o tipo dinâmico
          
          if (commandIdOrType === 'custom') {
              if (!customCommandData.trim()) {
                  alert("Por favor, digite o comando personalizado.");
                  setStatus('');
                  return;
              }
              payload.attributes = { data: customCommandData.trim() };
          } else if (commandIdOrType === 'sendSms') {
              if (!customCommandData.trim()) {
                  alert("Por favor, digite a mensagem do SMS.");
                  setStatus('');
                  return;
              }
              payload.attributes = { message: customCommandData.trim() };
          }
      }

      const response = await fetch('http://localhost:8000/api/traccar/commands/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        let commandName = TRACCAR_COMMAND_NAMES[commandIdOrType] || commandIdOrType;
        if (isSavedCommand) {
            const savedCmd = savedCommands.find(c => c.id.toString() === commandIdOrType);
            if (savedCmd) {
                commandName = savedCmd.description;
            }
        }
        setStatus(`Comando "${commandName}" enviado com sucesso!`);
      } else {
        setStatus(data.error || 'Falha ao enviar comando. Verifique se o dispositivo está online.');
      }
    } catch (err) {
      setStatus('Erro de rede ao tentar enviar comando.');
    }
  };

  const fetchSmsResponses = async (flag = 'unread') => {
    setLoadingInbound(true);
    setInboundStatus('');
    try {
      const res = await fetch(`http://localhost:8000/api/sms/inbound/?flag=${flag}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        if (data.length === 0) {
          setInboundStatus(flag === 'unread' ? 'Nenhuma mensagem nova.' : 'Nenhuma mensagem encontrada.');
          setSmsResponses([]);
        } else {
          setSmsResponses(data);
          setInboundStatus(`${data.length} mensagem(ns) recebida(s).`);
        }
      } else if (data.status === 'error') {
        setInboundStatus(`Erro KingSMS: ${data.cause}`);
      } else if (data.status === 'success' && data.cause) {
        // Ex: {"status":"success","cause":"Inbox Empty"}
        setSmsResponses([]);
        setInboundStatus('📭 Caixa vazia — o rastreador ainda não respondeu.');
      } else {
        setInboundStatus('Resposta inesperada do servidor.');
      }
    } catch (e) {
      setInboundStatus('Erro ao conectar com o servidor.');
    }
    setLoadingInbound(false);
  };

  return (
    <div className="comando-container">
      <h1>Enviar Comando</h1>
      <p className="subtitle">Selecione o veículo abaixo para realizar ações de bloqueio e desbloqueio remoto.</p>

      <div className="comando-card">
        <label>Selecione o Veículo:</label>
        <select 
          value={selectedDevice} 
          onChange={(e) => setSelectedDevice(e.target.value)}
          className="device-select"
        >
          <option value="">Escolha um rastreador...</option>
          {devices.map(d => (
            <option key={d.id} value={d.id}>{d.name} ({d.uniqueId})</option>
          ))}
        </select>

        <label>Comando:</label>
        <select 
          value={selectedCommand} 
          onChange={(e) => {
              const val = e.target.value;
              setSelectedCommand(val);
              // Verifica se o valor selecionado pertence à lista de comandos salvos
              setIsSavedCommand(savedCommands.some(c => c.id.toString() === val));
          }}
          className="device-select"
          disabled={!selectedDevice}
        >
          <option value="">Selecione um comando...</option>
          
          <optgroup label="Comandos Salvos">
            {visibleSavedCommands.map(c => (
              <option key={`saved-${c.id}`} value={c.id}>{c.description}</option>
            ))}
            {visibleSavedCommands.length === 0 && <option disabled>Nenhum comando salvo compatível</option>}
          </optgroup>

          <optgroup label="Tipos de Comando Disponíveis">
            {commandTypes.map(c => (
              <option key={`type-${c.type}`} value={c.type}>
                  {TRACCAR_COMMAND_NAMES[c.type] || c.type}
              </option>
            ))}
            {commandTypes.length === 0 && <option disabled>Carregando comandos do servidor...</option>}
          </optgroup>
        </select>

        { (selectedCommand === 'custom' || selectedCommand === 'sendSms' || isSavedCommand) && (
          <>
            { !isSavedCommand && (
              <>
                <label>{selectedCommand === 'custom' ? 'Comando Personalizado (Texto):' : 'Mensagem do SMS:'}</label>
                <input 
                  type="text" 
                  value={customCommandData}
                  onChange={(e) => setCustomCommandData(e.target.value)}
                  className="device-select"
                  placeholder={selectedCommand === 'custom' ? "Digite o comando (ex: fix030s***n123456)" : "Digite a mensagem para enviar"}
                  style={{ marginBottom: '16px' }}
                />
              </>
            )}
            
            {(selectedCommand === 'custom' || isSavedCommand) && (
              <div style={{ marginBottom: '32px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: forceSms ? '12px' : '0', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={forceSms} 
                    onChange={(e) => setForceSms(e.target.checked)} 
                    style={{ width: '18px', height: '18px' }}
                  />
                  Enviar comando via SMS (Forçar)
                </label>
                {forceSms && (
                  <div style={{ marginLeft: '26px', display: 'flex', gap: '16px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>Provedor:</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: '#334155' }}>
                      <input 
                        type="radio" 
                        name="smsGateway"
                        value="kingsms" 
                        checked={smsGateway === 'kingsms'} 
                        onChange={() => setSmsGateway('kingsms')} 
                        style={{ cursor: 'pointer' }}
                      />
                      KingSMS
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: '#334155' }}>
                      <input 
                        type="radio" 
                        name="smsGateway"
                        value="smsmarket" 
                        checked={smsGateway === 'smsmarket'} 
                        onChange={() => setSmsGateway('smsmarket')} 
                        style={{ cursor: 'pointer' }}
                      />
                      SMS Market
                    </label>
                  </div>
                )}
              </div>
            )}
            {selectedCommand === 'sendSms' && !isSavedCommand && (
              <div style={{ marginBottom: '32px', display: 'flex', gap: '16px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#475569' }}>Provedor:</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: '#334155' }}>
                  <input 
                    type="radio" 
                    name="smsGateway"
                    value="kingsms" 
                    checked={smsGateway === 'kingsms'} 
                    onChange={() => setSmsGateway('kingsms')} 
                  />
                  KingSMS
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: '#334155' }}>
                  <input 
                    type="radio" 
                    name="smsGateway"
                    value="smsmarket" 
                    checked={smsGateway === 'smsmarket'} 
                    onChange={() => setSmsGateway('smsmarket')} 
                  />
                  SMS Market
                </label>
              </div>
            )}
          </>
        )}

        <div className="actions-group">
          <button 
            className="btn-comando btn-primary"
            onClick={() => handleSendCommand(selectedCommand)}
            disabled={!selectedCommand}
          >
            <Send size={20} />
            Enviar Comando
          </button>
        </div>

        <div className="quick-actions">
           <p>Atalhos Rápidos:</p>
           <div className="btns-mini">
             <button
               onClick={() => { setIsSavedCommand(false); handleSendCommand('engineStop'); }}
               className="btn-mini-red"
               disabled={!quickActionsEnabled.engineStop}
               title={!quickActionsEnabled.engineStop ? 'Não suportado por este protocolo' : ''}
             >
               Bloquear
             </button>
             <button
               onClick={() => { setIsSavedCommand(false); handleSendCommand('engineResume'); }}
               className="btn-mini-green"
               disabled={!quickActionsEnabled.engineResume}
               title={!quickActionsEnabled.engineResume ? 'Não suportado por este protocolo' : ''}
             >
               Desbloquear
             </button>
           </div>
        </div>

        {status && <div className="status-msg">{status}</div>}
      </div>

      <div className="info-box">
        <h4>Atenção</h4>
        <p>O envio de comandos depende da conexão GPRS/GSM do rastreador. Verifique se o veículo possui sinal no momento do comando.</p>
      </div>

      {/* Seção de Respostas SMS Recebidas */}
      <div className="sms-inbound-box">
        <h3 style={{ marginBottom: '12px', color: '#e2c94e' }}>📩 Respostas do Rastreador (SMS)</h3>
        <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '16px' }}>
          Após enviar um comando por SMS, o rastreador pode responder. Clique abaixo para verificar.
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <button
            className="btn-comando btn-primary"
            onClick={() => fetchSmsResponses('unread')}
            disabled={loadingInbound}
            style={{ flex: 1, minWidth: '160px' }}
          >
            {loadingInbound ? '⏳ Buscando...' : '🔔 Mensagens Novas'}
          </button>
          <button
            className="btn-mini-green"
            onClick={() => fetchSmsResponses('read')}
            disabled={loadingInbound}
            style={{ flex: 1, minWidth: '160px', padding: '10px', borderRadius: '8px', cursor: 'pointer' }}
          >
            📋 Ver Histórico
          </button>
        </div>

        {inboundStatus && (
          <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '10px' }}>{inboundStatus}</p>
        )}

        {smsResponses.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {smsResponses.map((msg) => (
              <div key={msg.ID} style={{
                background: 'rgba(226,201,78,0.08)',
                border: '1px solid rgba(226,201,78,0.25)',
                borderRadius: '10px',
                padding: '12px 16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#e2c94e', fontWeight: 600, fontSize: '13px' }}>📱 {msg.SenderNumber}</span>
                  <span style={{ color: '#888', fontSize: '12px' }}>{msg.ReceivingDateTime}</span>
                </div>
                <p style={{ margin: 0, color: '#f0f0f0', fontFamily: 'monospace', fontSize: '14px', wordBreak: 'break-all' }}>
                  {msg.Text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Comando;
