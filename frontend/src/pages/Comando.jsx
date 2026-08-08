import React, { useState, useEffect, useRef } from 'react';
import './Comando.css';
import { 
  Wifi, Calendar, Clock, Users, Settings, Globe, 
  Search, Lock, Unlock, PenTool, Zap, Send, CheckSquare, Square,
  MessageSquare, List
} from 'lucide-react';
import CarIcon from '../components/CarIcon';

const Comando = () => {
  // State for devices and selection
  const [devices, setDevices] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  
  const getSmsStatusText = (code) => {
    switch(code) {
      case -1: return "Mensagem enfileirada, aguardando provedor...";
      case 0: return "Enviado à operadora, aguardando chegar no aparelho...";
      case 1: return "Entregue com sucesso.";
      case 3: return "Preparando para envio...";
      default:
        if (code < 0) return `Erro ao enviar. Código: ${code}`;
        return `Comando confirmado (Status ${code})`;
    }
  };
  
  // State for config
  const [scope, setScope] = useState('veiculo'); // veiculo, grupo, modelo, todos
  const [channel, setChannel] = useState('gprs'); // gprs, sms
  
  const [protocol, setProtocol] = useState('gt06');
  const [commandType, setCommandType] = useState('1-BLOQUEAR');
  const [customCommandText, setCustomCommandText] = useState('');
  
  // SMS specific state
  const [smsAction, setSmsAction] = useState(null);
  const [smsAtivacaoSelecionado, setSmsAtivacaoSelecionado] = useState('');
  const [smsTemplateSelecionado, setSmsTemplateSelecionado] = useState('');
  
  const [smsBalance, setSmsBalance] = useState('...');
  const [commandCombos, setCommandCombos] = useState([]);
  
  // SMS Chat state
  const [smsChatMessages, setSmsChatMessages] = useState([]);
  const [smsChatInput, setSmsChatInput] = useState('');
  
  const smsFabricantesList = [
    { name: "Coban TK303 - TK311", id: 7 },
    { name: "Concox CRX3 - CRX1", id: 8 },
    { name: "Concox JM01", id: 6 },
    { name: "BWS E3+", id: 11 },
    { name: "WanWay EV02", id: 6 },
    { name: "CJ780 CJ780", id: 9 },
    { name: "Maxtrack MXT140 - MXT150", id: 5 },
    { name: "UNIGPS F1 - M1 comandos separados", id: 6 },
    { name: "X3 TECH NT20", id: 8 },
    { name: "Maxtrack MXT130 - MXT160", id: 4 },
    { name: "Queclink GV55", id: 3 },
    { name: "Queclink GV50", id: 3 },
    { name: "Queclink GV75", id: 1 },
    { name: "Sinotrack ST-901 - ST-907 - OBD2", id: 7 },
    { name: "LV12 LV12", id: 5 },
    { name: "Iter ITR120 - ITR150 - ITR155", id: 6 },
    { name: "Suntech ST300 - ST340 - ST310 - ST350 operadora vivo (comandos separados)", id: 3 },
    { name: "Teltonika FMB920", id: 7 },
    { name: "Santana SR411 - S116 porta 6023", id: 6 },
    { name: "Queclink GV300", id: 5 },
    { name: "Mobilogix MT-2000", id: 4 },
    { name: "TR05 TR05", id: 5 },
    { name: "BMS BMS-1", id: 6 },
    { name: "Queclink GV57", id: 4 },
    { name: "Accurate GT02", id: 8 },
    { name: "Accurate GT02A", id: 8 },
    { name: "Accurate GT02D", id: 8 },
    { name: "Accurate GT06 Slot Metal", id: 4 },
    { name: "Accurate GT06 Slot plástico", id: 4 },
    { name: "Coban TK06", id: 4 },
    { name: "Oneblock J16 -10024", id: 13 },
    { name: "Suntech ST380", id: 3 },
    { name: "Suntech ST300 - ST340 - ST310 - ST350 - outras operadoras (comandos separados)", id: 3 },
    { name: "Jimi JC400", id: 5 },
    { name: "SL-44 SL-44", id: 8 },
    { name: "TK STAR TK06A, TK103B, TK816, TK905, TK909", id: 13 },
    { name: "Suntech ST200 - ST210 - ST215 - ST240 operadora vivo (comando único)", id: 1 },
    { name: "Suntech ST200 - ST210 - ST215 - ST240 outras operadoras (comando único)", id: 1 },
    { name: "Suntech ST390", id: 2 },
    { name: "Oneblock J16 - 5023", id: 5 },
    { name: "BWS E3", id: 6 },
    { name: "Calamp LMU800 - LMU2160 - LMU400", id: 10 },
    { name: "URBTRACK U116", id: 5 },
    { name: "UNIGPS F1 - M1 comando único", id: 1 },
    { name: "OBD G500M", id: 4 },
    { name: "OBD G200", id: 4 },
    { name: "Oneblock Oneblock (V1)", id: 7 },
    { name: "Carcell CR4000A", id: 5 },
    { name: "G900 G900", id: 4 },
    { name: "STG T50", id: 2 },
    { name: "LK LK106, LK109, LK110, LK120, LK206 (A,B), LK208, LK209, LK210, LK310, LK610, LK710, LK800", id: 8 },
    { name: "Global Position Global Position 4G", id: 5 },
    { name: "Tracker Safe MT1, MT1X, MT1X, MT1Z, A1X, A1X", id: 10 },
    { name: "STG STG 100", id: 8 },
    { name: "Carcell CR2000", id: 5 },
    { name: "Meiligao Meiligao", id: 1 },
    { name: "ST 10 ST 10", id: 8 },
    { name: "JM-VL03 JM-VL03", id: 4 },
    { name: "Jimi M60 - M04A - GS05P", id: 6 },
    { name: "H02 H02", id: 4 },
    { name: "MW-06 MW-06", id: 4 },
    { name: "Oneblock Oneblock personalizado", id: 7 },
    { name: "WJ1 / J1 / J14 WJ1 / J1 / J14", id: 12 },
    { name: "Iter ITR270", id: 4 },
    { name: "G109 G109", id: 4 },
    { name: "AT08 AT08", id: 6 },
    { name: "Hinova H.E 114", id: 8 },
    { name: "Suntech ST4315", id: 2 },
    { name: "SmartGPS SMT4G", id: 4 },
    { name: "Mobilogix MT-2000 (comando unico)", id: 1 },
    { name: "Oneblock J16 4G PRO - Moto", id: 12 },
    { name: "Oneblock J16 4G PRO", id: 8 },
    { name: "SafetyCar GS900X 4G", id: 5 },
    { name: "SL-48 SL-48", id: 8 },
    { name: "Coban TK303 - TK311 (com senha)", id: 7 },
    { name: "SmartGPS SMT4G A16 BLINDADO", id: 5 },
    { name: "YGA-4G YGA-4G", id: 3 },
    { name: "EC33 EC33", id: 5 },
    { name: "Jimi JC181", id: 4 }
  ];

  const TEMPLATE_COMMANDS = [
    "SERVER,1,smartconn.mine.nu,5023,0#",
    "APN,smart.m2m.vivo.com.br,vivo,vivo#",
    "HBT,30,18000#",
    "SZCS#GPS_DISSLP=0",
    "TIMER,60,18000#",
    "SZCS#SLPDISCONNECT=0",
    "SZCS#SLEEPT=3",
    "SZCS#MTK_DISSLP=0",
    "SZCS#GT06SEL=1#GT06IEXVOL=2#GT06METER=0",
    "SZCS#GT06SEL=1#GT06METER=1",
    "MILEAGE=0#",
    "RESET#"
  ];

  const [templateLogs, setTemplateLogs] = useState([]);
  const [isExecutingTemplate, setIsExecutingTemplate] = useState(false);
  const logsEndRef = useRef(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => { 
    if (templateLogs.length > 0) scrollToBottom(); 
  }, [templateLogs]);

  const chatLogsEndRef = useRef(null);
  const scrollToBottomChat = () => {
    chatLogsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => { 
    scrollToBottomChat(); 
  }, [smsChatMessages]);

  const chatSessionStartRef = useRef(null);

  useEffect(() => {
     if (channel === 'sms' && smsAction === 'mensagem') {
        chatSessionStartRef.current = new Date();
        setSmsChatMessages([]);
     }
  }, [channel, smsAction, selectedDevices]);

  useEffect(() => {
    let intervalId;
    
    if (channel === 'sms' && smsAction === 'mensagem' && selectedDevices.size === 1) {
      const devId = Array.from(selectedDevices)[0];
      
      const fetchHistory = async () => {
        try {
          const res = await fetch(`/api/sms/history/${devId}/`);
          if (res.ok) {
            const data = await res.json();
            if (chatSessionStartRef.current) {
              const filtered = data.filter(m => new Date(m.created_at) >= chatSessionStartRef.current);
              setSmsChatMessages(filtered);
            }
          }
        } catch (e) {
          console.error('Erro ao buscar historico de sms', e);
        }
      };

      fetchHistory();
      intervalId = setInterval(fetchHistory, 5000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [channel, smsAction, selectedDevices]);

  const handleSendSmsChat = async () => {
    if (!smsChatInput.trim() || selectedDevices.size === 0) return;
    
    const devId = Array.from(selectedDevices)[0];
    const messageText = smsChatInput;
    setSmsChatInput('');
    
    // Otimisticamente adiciona na UI
    setSmsChatMessages(prev => [...prev, {
      id: Date.now(),
      device_id: devId,
      phone_number: '', // backend resolve
      content: messageText,
      status_code: -1,
      direction: 'outbound',
      created_at: new Date().toISOString()
    }]);

    try {
      const payload = {
        deviceId: devId,
        textChannel: true,
        type: 'custom',
        attributes: { data: messageText },
        smsGateway: 'smsmarket',
        smsLogin: localStorage.getItem('smsmarketLogin') || '',
        smsToken: localStorage.getItem('smsmarketToken') || ''
      };

      await fetch('/api/traccar/commands/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      // Polling vai atualizar o status
    } catch (e) {
      console.error(e);
    }
  };

  const executeTemplateSequence = async () => {
    if (selectedDevices.size === 0) {
      alert("Por favor, selecione pelo menos um veículo para o template.");
      return;
    }
    
    if (!smsTemplateSelecionado) {
      alert("Selecione um template (combo) na lista.");
      return;
    }

    const selectedCombo = commandCombos.find(c => c.id.toString() === smsTemplateSelecionado);
    if (!selectedCombo || !selectedCombo.comandos || selectedCombo.comandos.length === 0) {
      alert("Template selecionado é inválido ou não possui comandos.");
      return;
    }

    setIsExecutingTemplate(true);
    setTemplateLogs([]);

    const devId = Array.from(selectedDevices)[0]; // Executing for first selected
    const cmdsToRun = selectedCombo.comandos;
    
    for (let i = 0; i < cmdsToRun.length; i++) {
      let cmdText = cmdsToRun[i];
      // Limpa os delimitadores { } se vierem assim do backend
      if (cmdText.startsWith('{') && cmdText.endsWith('}')) {
        cmdText = cmdText.slice(1, -1);
      }
      
      const timeStr = new Date().toLocaleString('pt-BR');
      
      setTemplateLogs(prev => [...prev, {
        id: Date.now() + Math.random(),
        type: 'pending',
        title: `Enviando comando ${i + 1}/${cmdsToRun.length}...`,
        text: cmdText,
        time: timeStr
      }]);

      try {
        const payload = {
          deviceId: devId,
          textChannel: true, // we are in SMS template mode
          type: 'custom',
          attributes: { data: cmdText },
          smsGateway: 'smsmarket',
          smsLogin: localStorage.getItem('smsmarketLogin') || '',
          smsToken: localStorage.getItem('smsmarketToken') || ''
        };

        const postRes = await fetch('/api/traccar/commands/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        let smsMarketId = null;
        if (postRes.ok) {
           const postData = await postRes.json();
           // Attempt to parse smsmarket_response for the queued ID if available
           try {
               const rawResp = JSON.parse(postData.smsmarket_response);
               if (rawResp && rawResp.id) smsMarketId = rawResp.id;
           } catch(e){
               console.error("Erro no parse do smsmarket_response", e);
           }
        }

        // Polling loop for this command (Wait up to 60s)
        let confirmed = false;
        let finalStatus = -1;
        for (let poll = 0; poll < 12; poll++) { // 12 * 5s = 60s
          await new Promise(r => setTimeout(r, 5000));
          try {
            const res = await fetch(`/api/sms/history/${devId}/`);
            if (res.ok) {
              const data = await res.json();
              // Look for our outbound message or any inbound response
              // If we have an smsMarketId, check if its status changed to delivered (1 or >3)
              // Or if we received a new inbound message recently
              
              if (smsMarketId) {
                 const ourMsg = data.find(m => m.direction === 'outbound' && String(m.id) === String(smsMarketId) || m.sms_market_id == smsMarketId);
                 if (ourMsg && (ourMsg.status_code === 1 || ourMsg.status_code > 3)) {
                    confirmed = true;
                    finalStatus = ourMsg.status_code;
                    break;
                 }
              }
              
              // Fallback: check if there's any recent inbound message in the last 60 seconds
              const recentInbounds = data.filter(m => m.direction === 'inbound' && (new Date() - new Date(m.created_at)) < 60000);
              if (recentInbounds.length > 0) {
                 confirmed = true;
                 break;
              }
            }
          } catch (e) {
            console.error('Polling error:', e);
          }
        }

        const confirmTime = new Date().toLocaleString('pt-BR');
        
        if (confirmed) {
           setTemplateLogs(prev => [...prev, {
             id: Date.now() + Math.random(),
             type: 'success',
             title: `Comando confirmado (Sucesso):`,
             text: cmdText,
             time: confirmTime
           }]);
        } else {
           setTemplateLogs(prev => [...prev, {
             id: Date.now() + Math.random(),
             type: 'error',
             title: `Aviso: Tempo limite excedido (O veículo não respondeu). Sequência interrompida.`,
             text: cmdText,
             time: confirmTime
           }]);
           break; // Stop sequence on error
        }

      } catch (err) {
        console.error(err);
        setTemplateLogs(prev => [...prev, {
             id: Date.now() + Math.random(),
             type: 'error',
             title: `Erro interno ao enviar. Sequência interrompida.`,
             text: cmdText,
             time: new Date().toLocaleString('pt-BR')
        }]);
        break;
      }
    }
    
    setIsExecutingTemplate(false);
  };

  const executeComboSequence = async (combo) => {
    if (selectedDevices.size === 0) {
      alert("Por favor, selecione pelo menos um veículo para enviar o combo.");
      return;
    }
    
    // Switch to GPRS view if needed, or handle in the active channel? Let's assume GPRS for now, or use selected channel.
    setIsExecutingTemplate(true);
    setTemplateLogs([]);
    setSmsAction('template'); // Use the template view to show logs

    const devId = Array.from(selectedDevices)[0];
    const cmds = combo.comandos.map(c => c.replace('{', '').replace('}', '')); // Clean up { }
    
    for (let i = 0; i < cmds.length; i++) {
      const cmdText = cmds[i];
      const timeStr = new Date().toLocaleString('pt-BR');
      
      setTemplateLogs(prev => [...prev, {
        id: Date.now() + Math.random(),
        type: 'pending',
        title: `Enviando comando ${i + 1}/${cmds.length}:`,
        text: cmdText,
        time: timeStr
      }]);

      try {
        const payload = {
          deviceId: devId,
          textChannel: channel === 'sms',
          type: 'custom',
          attributes: { data: cmdText }
        };

        if (channel === 'sms') {
          payload.smsGateway = 'smsmarket';
          payload.smsLogin = localStorage.getItem('smsmarketLogin') || '';
          payload.smsToken = localStorage.getItem('smsmarketToken') || '';
        }

        await fetch('/api/traccar/commands/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        // Polling loop for response
        let confirmed = false;
        for (let poll = 0; poll < 12; poll++) {
          await new Promise(r => setTimeout(r, 5000));
          try {
            const res = await fetch(`/api/sms/inbound/?flag=unread`);
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data) && data.length > 0) {
                confirmed = true;
                break;
              }
            }
          } catch (e) {
            console.error('Polling error:', e);
          }
        }

        const confirmTime = new Date().toLocaleString('pt-BR');
        
        if (confirmed) {
           setTemplateLogs(prev => [...prev, {
             id: Date.now() + Math.random(),
             type: 'success',
             title: `Comando confirmado:`,
             text: cmdText,
             time: confirmTime
           }]);
        } else {
           setTemplateLogs(prev => [...prev, {
             id: Date.now() + Math.random(),
             type: 'error',
             title: `Aviso (Tempo limite excedido):`,
             text: cmdText,
             time: confirmTime
           }]);
        }
      } catch (err) {
        console.error(err);
      }
    }
    
    setIsExecutingTemplate(false);
  };

  useEffect(() => {
    fetch('/api/traccar/devices/')
      .then(res => res.json())
      .then(json => setDevices(json))
      .catch(err => console.error(err));
      
    fetch('/api/command-combos/')
      .then(res => res.json())
      .then(json => setCommandCombos(json))
      .catch(err => console.error(err));

    const smsUser = localStorage.getItem('smsmarketLogin') || '';
    const smsToken = localStorage.getItem('smsmarketToken') || '';
    
    fetch(`/api/sms/balance/?user=${encodeURIComponent(smsUser)}&token=${encodeURIComponent(smsToken)}`)
      .then(res => res.json())
      .then(json => {
         if (json && json.total !== undefined) {
             setSmsBalance(json.total);
         }
      })
      .catch(err => console.error(err));
  }, []);

  const handleToggleSelectAll = () => {
    if (selectedDevices.size === filteredDevices.length) {
      setSelectedDevices(new Set());
    } else {
      setSelectedDevices(new Set(filteredDevices.map(d => d.id)));
    }
  };

  const handleToggleDevice = (id) => {
    const newSet = new Set(selectedDevices);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedDevices(newSet);
  };

  const filteredDevices = devices.filter(d => 
    d.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.uniqueId?.includes(searchQuery)
  );

  const handleSend = async () => {
    if (selectedDevices.size === 0) {
      alert("Por favor, selecione pelo menos um veículo.");
      return;
    }
    
    // Convert generic commands to what we expect
    let cmdData = '';
    if (commandType === '1-BLOQUEAR') cmdData = 'engineStop';
    else if (commandType === '2-DESBLOQUEAR') cmdData = 'engineResume';
    else if (commandType === 'custom') cmdData = customCommandText;
    else cmdData = commandType; // For templates, though we don't have real logic here yet

    if (!cmdData && commandType === 'custom') {
      alert("Defina o comando a ser enviado.");
      return;
    }

    const payloadTemplate = {
      textChannel: channel === 'sms',
      type: 'custom',
      attributes: { data: cmdData }
    };

    if (channel === 'sms') {
      payloadTemplate.smsGateway = 'smsmarket';
      payloadTemplate.smsLogin = localStorage.getItem('smsmarketLogin') || '';
      payloadTemplate.smsToken = localStorage.getItem('smsmarketToken') || '';
    }

    let successCount = 0;
    
    for (const devId of selectedDevices) {
      try {
        const payload = { ...payloadTemplate, deviceId: devId };
        const response = await fetch('/api/traccar/commands/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (response.ok) successCount++;
      } catch (err) {
        console.error(err);
      }
    }

    alert(`Comando enviado para ${successCount} de ${selectedDevices.size} veículos selecionados.`);
  };

  return (
    <div className="cmd-container">
      {/* Header Tabs */}
      <div className="cmd-header-tabs">
        <div className="cmd-tabs-left">
          <button className="cmd-tab active"><Wifi size={16}/> GPRS</button>
          <button className="cmd-tab"><Calendar size={16}/> AGENDAMENTO</button>
          <button className="cmd-tab"><Clock size={16}/> HISTÓRICO</button>
        </div>
        <div className="cmd-tabs-right">
          <span className="saldo-sms">SALDO: <strong>{smsBalance}</strong></span>
        </div>
      </div>

      <div className="cmd-layout">
        {/* Sidebar Esquerda */}
        <div className="cmd-sidebar">
          
          <div className="cmd-section">
            <span className="cmd-section-title">ESCOPO</span>
            <div className="cmd-scope-grid">
              <button className={`scope-btn scope-veiculo ${scope === 'veiculo' ? 'active' : ''}`} onClick={() => setScope('veiculo')}>
                <CarIcon size={20} className="scope-icon"/>
                <span>Veículo</span>
              </button>
              <button className={`scope-btn scope-grupo ${scope === 'grupo' ? 'active' : ''}`} onClick={() => setScope('grupo')}>
                <Users size={20} className="scope-icon"/>
                <span>Grupo</span>
              </button>
              <button className={`scope-btn scope-modelo ${scope === 'modelo' ? 'active' : ''}`} onClick={() => setScope('modelo')}>
                <Settings size={20} className="scope-icon"/>
                <span>Modelo</span>
              </button>
              <button className={`scope-btn scope-todos ${scope === 'todos' ? 'active' : ''}`} onClick={() => setScope('todos')}>
                <Globe size={20} className="scope-icon"/>
                <span>Todos</span>
              </button>
            </div>
          </div>

          <div className="cmd-search-box">
            <div className="cmd-search-input-wrapper">
              <Search size={16} className="search-icon" />
              <input 
                type="text" 
                placeholder="Buscar veículo..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="cmd-selection-header">
            <span>{selectedDevices.size} selecionados</span>
            <div className="cmd-selection-actions">
              <span onClick={handleToggleSelectAll}>Selecionar todos</span>
              <span onClick={() => setSelectedDevices(new Set())}>Limpar</span>
            </div>
          </div>

          <div className="cmd-device-list">
            {filteredDevices.map(d => {
              const foto = d.attributes?.foto || 'https://via.placeholder.com/150';
              const statusColor = d.status === 'online' ? '#10b981' : d.status === 'offline' ? '#ef4444' : '#f59e0b';
              const lastUpdate = d.lastUpdate ? new Date(d.lastUpdate).toLocaleString('pt-BR') : 'Sem comunicação';
              const statusText = d.status === 'online' ? 'Online' : d.status === 'offline' ? 'Offline' : 'Desconhecido';
              
              return (
              <div 
                key={d.id} 
                className={`cmd-device-item ${selectedDevices.has(d.id) ? 'selected' : ''}`}
                onClick={() => handleToggleDevice(d.id)}
              >
                <div className="device-checkbox">
                  {selectedDevices.has(d.id) ? <CheckSquare size={18} color="var(--accent-gold)" /> : <Square size={18} color="#9ca3af" />}
                </div>
                <div className="device-photo" style={{ backgroundImage: `url(${foto})` }}></div>
                <div className="device-info-rich">
                  <strong className="device-name">{d.name}</strong>
                  <div className="device-detail"><span className="device-status-dot" style={{backgroundColor: statusColor}}></span> {statusText}</div>
                  <div className="device-detail">ID: {d.uniqueId}</div>
                  <div className="device-detail">Últ. com.: {lastUpdate}</div>
                </div>
              </div>
            )})}
          </div>

          <div className="cmd-section channel-section">
            <span className="cmd-section-title">CANAL</span>
            <div className="cmd-channel-grid">
              <div 
                className={`channel-card ${channel === 'gprs' ? 'active' : ''}`}
                onClick={() => setChannel('gprs')}
              >
                <div className="channel-icon-wrap">
                  <Globe size={20} />
                  {channel === 'gprs' && <span className="badge-ativo">ATIVO</span>}
                </div>
                <strong>GPRS</strong>
                <span>TCP/IP</span>
              </div>
              
              <div 
                className={`channel-card ${channel === 'sms' ? 'active' : ''}`}
                onClick={() => setChannel('sms')}
              >
                <div className="channel-icon-wrap">
                  <Wifi size={20} />
                  {channel === 'sms' && <span className="badge-ativo">ATIVO</span>}
                </div>
                <strong>SMS</strong>
                <span>Mensagem</span>
              </div>
            </div>
          </div>
        </div>

        {/* Área Principal */}
        <div className="cmd-main">
          <div className="cmd-breadcrumb">
            <span className="bc-icon">■</span>
            <strong>COMANDO</strong> • <span className="gold-text">{selectedDevices.size === 1 ? Array.from(selectedDevices)[0] && devices.find(d => d.id === Array.from(selectedDevices)[0])?.name : `${selectedDevices.size} VEÍCULOS`}</span>
          </div>

          {channel === 'gprs' ? (
            <>
              <div className="cmd-form-group">
                <label>PROTOCOLO</label>
                <div className="cmd-select-wrapper">
                  <select value={protocol} onChange={(e) => setProtocol(e.target.value)}>
                    <option value="gt06">gt06</option>
                    <option value="h02">h02</option>
                    <option value="suntech">suntech</option>
                  </select>
                </div>
              </div>

              <div className="cmd-form-group">
                <label>TIPO</label>
                <div className="cmd-select-wrapper">
                  <select value={commandType} onChange={(e) => setCommandType(e.target.value)}>
                    <option value="1-BLOQUEAR">1-BLOQUEAR</option>
                    <option value="2-DESBLOQUEAR">2-DESBLOQUEAR</option>
                    <option value="custom">Comando personalizado</option>
                  </select>
                </div>
              </div>

              <div className="cmd-section" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                <span className="cmd-section-title">ATALHOS</span>
                <div className="cmd-shortcuts-grid">
                  
                  <div className={`shortcut-card ${commandType === '1-BLOQUEAR' ? 'active' : ''}`} onClick={() => setCommandType('1-BLOQUEAR')}>
                    <div className="shortcut-title">
                      <Lock size={16} className="text-red" />
                      <strong className="text-red">1-BLOQUEAR</strong>
                    </div>
                    <span className="shortcut-sub">engineStop</span>
                  </div>

                  <div className={`shortcut-card ${commandType === '2-DESBLOQUEAR' ? 'active' : ''}`} onClick={() => setCommandType('2-DESBLOQUEAR')}>
                    <div className="shortcut-title">
                      <Unlock size={16} className="text-gray" />
                      <strong>2-DESBLOQUEAR</strong>
                    </div>
                    <span className="shortcut-sub">engineResume</span>
                  </div>

                  <div className={`shortcut-card ${commandType === 'custom' ? 'active' : ''}`} onClick={() => setCommandType('custom')}>
                    <div className="shortcut-title">
                      <PenTool size={16} className="text-gray" />
                      <strong>Comando personalizado</strong>
                    </div>
                    <span className="shortcut-sub">custom</span>
                  </div>

                  <div className="shortcut-card">
                    <div className="shortcut-title">
                      <Zap size={16} className="text-orange" />
                      <strong>SERVER,1,dns... (Template GPRS)</strong>
                    </div>
                    <span className="shortcut-sub">template_812</span>
                  </div>

                </div>

                {commandCombos.length > 0 && (
                  <>
                    <span className="cmd-section-title mt-4" style={{ marginTop: '24px', display: 'block' }}>COMBOS SALVOS</span>
                    <div className="cmd-shortcuts-grid combos-grid">
                      {commandCombos.map(combo => (
                        <div key={combo.id} className="shortcut-card combo-card" onClick={() => executeComboSequence(combo)}>
                          <div className="shortcut-title">
                            <List size={16} className="text-gold" />
                            <strong>{combo.nome}</strong>
                          </div>
                          <span className="shortcut-sub">{combo.comandos.length} comandos em sequência</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                
                {commandType === 'custom' && (
                  <div className="custom-command-input-area">
                    <label>Texto do Comando Personalizado</label>
                    <input 
                      type="text" 
                      value={customCommandText}
                      onChange={(e) => setCustomCommandText(e.target.value)}
                      placeholder="Ex: reset#" 
                    />
                  </div>
                )}
                
                <div className="cmd-add-template-link">
                  Não achou o que queria? <span>Adicionar um comando GPRS</span>
                </div>
              </div>
              
              <div className="cmd-footer">
                <button className="btn-cancelar">Cancelar</button>
                <button className="btn-enviar" onClick={handleSend}>Enviar</button>
              </div>
            </>
          ) : (
            <>
              {/* LAYOUT SMS */}
              <div className="cmd-sms-layout">
                <div className="sms-section-title">
                  <CarIcon size={16} /> Veículos:
                </div>
                
                <div className="sms-selected-card">
                  <div className="sms-selected-icon">
                    {selectedDevices.size > 1 ? `+${selectedDevices.size}` : <CarIcon size={24} />}
                  </div>
                  <div className="sms-selected-info">
                    {selectedDevices.size > 1 && <span className="sms-badge">Multiple</span>}
                    <p className="sms-names">
                      {selectedDevices.size === 0 ? 'Nenhum veículo selecionado' : 
                       selectedDevices.size === 1 ? devices.find(d => d.id === Array.from(selectedDevices)[0])?.name :
                       Array.from(selectedDevices).slice(0, 8).map(id => devices.find(d => d.id === id)?.name).join(', ') + (selectedDevices.size > 8 ? ' ...' : '')
                      }
                    </p>
                    {selectedDevices.size === 1 && (
                      <span className="sms-last-contact">
                        Última comunicação: {devices.find(d => d.id === Array.from(selectedDevices)[0])?.lastContact ? new Date(devices.find(d => d.id === Array.from(selectedDevices)[0]).lastContact).toLocaleString('pt-BR') : 'Sem registro'}
                      </span>
                    )}
                  </div>
                  <div className="sms-toggle">
                    <div className="toggle-track active"><div className="toggle-thumb"></div></div>
                  </div>
                </div>

                <div className="sms-section-title">
                  <Settings size={16} /> {smsAction ? 'Opção selecionada' : 'Escolha uma das opções'}
                </div>

                <div className="sms-options-grid">
                  <div 
                    className={`sms-option-card ${smsAction === 'ativacao' ? 'active' : ''}`}
                    onClick={() => setSmsAction(smsAction === 'ativacao' ? null : 'ativacao')}
                  >
                    <Settings size={32} />
                    <strong>ATIVAÇÃO</strong>
                  </div>
                  <div 
                    className={`sms-option-card ${smsAction === 'mensagem' ? 'active' : ''}`}
                    onClick={() => setSmsAction(smsAction === 'mensagem' ? null : 'mensagem')}
                  >
                    <MessageSquare size={32} />
                    <strong>MENSAGEM</strong>
                  </div>
                  <div 
                    className={`sms-option-card ${smsAction === 'template' ? 'active' : ''}`}
                    onClick={() => setSmsAction(smsAction === 'template' ? null : 'template')}
                  >
                    <List size={32} />
                    <strong>TEMPLATE</strong>
                  </div>
                </div>

                {smsAction === 'ativacao' && (
                  <div className="sms-action-container">
                    <div className="cmd-form-group" style={{ padding: '24px 0 0 0' }}>
                      <label>FABRICANTE (ATIVAÇÃO)</label>
                      <div className="cmd-select-wrapper">
                        <select 
                          value={smsAtivacaoSelecionado} 
                          onChange={(e) => setSmsAtivacaoSelecionado(e.target.value)}
                        >
                          <option value="">Selecione uma opção</option>
                          {smsFabricantesList.map((fab, idx) => (
                            <option key={idx} value={fab.name}>{fab.name} | {fab.id}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
                
                {smsAction === 'mensagem' && (
                  <div className="sms-action-container chat-view">
                    <div className="chat-title">Envio de comandos</div>
                    
                    <div className="chat-history">
                      {smsChatMessages.length === 0 && (
                        <div className="chat-empty">Nenhum comando recente para este veículo.</div>
                      )}
                      
                      {smsChatMessages.map(msg => {
                         const isPending = msg.direction === 'outbound' && (msg.status_code === -1 || msg.status_code === 0);
                         return (
                          <div key={msg.id} className={`chat-bubble ${msg.direction === 'inbound' ? 'inbound' : 'outbound'} ${msg.status_code === 1 || msg.status_code > 3 ? 'delivered' : 'pending'}`}>
                            <div className="bubble-text">
                              <strong>{msg.direction === 'inbound' ? 'Recebido:' : (msg.status_code === 1 || msg.status_code > 3 ? 'Comando confirmado:' : 'Enviado à operadora, aguardando chegar no aparelho:')}</strong>
                              <br/>
                              {msg.content}
                            </div>
                            <div className="bubble-meta">
                              {msg.status_code === -1 && <Clock size={12}/>}
                              {msg.status_code === 0 && <Clock size={12}/>}
                              {(msg.status_code === 1 || msg.status_code > 3) && <CheckSquare size={12}/>}
                              <span>{new Date(msg.created_at).toLocaleString('pt-BR')}</span>
                            </div>
                            {isPending && <div className="timeout-bar"></div>}
                          </div>
                        );
                      })}
                      <div ref={chatLogsEndRef} />
                    </div>

                    <div className="chat-input-area">
                      <input 
                        type="text" 
                        placeholder="Digite seu comando" 
                        value={smsChatInput}
                        onChange={(e) => setSmsChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendSmsChat()}
                      />
                      <button className="btn-chat-send" onClick={handleSendSmsChat}><Send size={16}/></button>
                      <button className="btn-chat-clear" onClick={() => setSmsChatInput('')}>&times;</button>
                    </div>
                  </div>
                )}
                
                {smsAction === 'template' && (
                  <div className="sms-action-container template-view">
                    <div className="cmd-form-group" style={{ marginBottom: '16px' }}>
                      <label>SELECIONE UM TEMPLATE</label>
                      <div className="cmd-select-wrapper">
                        <select 
                          value={smsTemplateSelecionado} 
                          onChange={(e) => setSmsTemplateSelecionado(e.target.value)}
                        >
                          <option value="">-- Escolha um combo --</option>
                          {commandCombos.map(combo => (
                            <option key={combo.id} value={combo.id}>
                              {combo.nome} ({combo.comandos.length} comandos)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="chat-history">
                      {templateLogs.length === 0 && !isExecutingTemplate && (
                        <div className="chat-empty">Clique em Enviar para iniciar a sequência.</div>
                      )}
                      
                      {templateLogs.map(log => {
                         let statusClass = 'pending';
                         if (log.type === 'success') statusClass = 'delivered';
                         if (log.type === 'error') statusClass = ''; 
                         
                         return (
                          <div key={log.id} className={`chat-bubble outbound ${statusClass}`} style={log.type === 'error' ? {backgroundColor: '#ef4444', color: 'white'} : {}}>
                            <div className="bubble-text">
                              <strong>{log.title}</strong>
                              <br/>
                              {log.text}
                            </div>
                            <div className="bubble-meta">
                              {log.type === 'pending' && <Clock size={12}/>}
                              {log.type === 'success' && <CheckSquare size={12}/>}
                              <span>{log.time}</span>
                            </div>
                            {log.type === 'pending' && <div className="timeout-bar"></div>}
                          </div>
                        );
                      })}
                      {/* Removed processando block */}
                      <div ref={logsEndRef} />
                    </div>
                  </div>
                )}
              </div>

              <div className="cmd-footer">
                <button className="btn-cancelar">Cancelar</button>
                {smsAction === 'ativacao' && (
                  <button className="btn-enviar" onClick={handleSend}>Enviar</button>
                )}
                {smsAction === 'template' && (
                  <button className="btn-enviar" onClick={executeTemplateSequence} disabled={isExecutingTemplate}>
                    Enviar
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Comando;
