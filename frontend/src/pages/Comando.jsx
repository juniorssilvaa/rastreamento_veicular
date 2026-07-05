import React, { useState, useEffect, useRef } from 'react';
import './Comando.css';
import { Send, X, Loader2 } from 'lucide-react';

const Comando = () => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  
  const [chatHistory, setChatHistory] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  
  // Traccar command integration specific state
  const [forceSms, setForceSms] = useState(true); // Assuming SMS for raw text cmds
  const [smsGateway, setSmsGateway] = useState('kingsms');
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetch('/api/traccar/devices/')
      .then(res => res.json())
      .then(json => setDevices(json))
      .catch(err => console.error(err));
  }, []);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const handleSend = async () => {
    if (!selectedDevice) {
      alert("Por favor, selecione um veículo primeiro.");
      return;
    }
    if (!currentInput.trim()) return;

    const commandText = currentInput.trim();
    setCurrentInput('');
    
    const newMessage = {
      id: Date.now(),
      text: commandText,
      type: 'sent',
      status: 'loading',
      date: new Date().toLocaleString('pt-BR')
    };

    setChatHistory(prev => [...prev, newMessage]);

    try {
      const payload = {
        deviceId: selectedDevice,
        textChannel: forceSms,
        type: 'custom',
        attributes: { data: commandText }
      };

      if (forceSms) {
          payload.smsGateway = smsGateway;
          if (smsGateway === 'kingsms') {
              payload.smsLogin = localStorage.getItem('kingsmsLogin') || '';
              payload.smsToken = localStorage.getItem('kingsmsToken') || '';
          } else {
              payload.smsLogin = localStorage.getItem('smsmarketLogin') || '';
              payload.smsToken = localStorage.getItem('smsmarketToken') || '';
          }
      }

      const response = await fetch('/api/traccar/commands/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setChatHistory(prev => prev.map(msg => 
          msg.id === newMessage.id ? { ...msg, status: 'success' } : msg
        ));
      } else {
        setChatHistory(prev => prev.map(msg => 
          msg.id === newMessage.id ? { ...msg, status: 'error' } : msg
        ));
      }
    } catch (err) {
      setChatHistory(prev => prev.map(msg => 
        msg.id === newMessage.id ? { ...msg, status: 'error' } : msg
      ));
    }
  };

  const fetchResponses = async () => {
    if (!selectedDevice) return;
    try {
      const res = await fetch(`/api/sms/inbound/?flag=unread`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const newResponses = data.map(msg => ({
          id: msg.ID || Date.now() + Math.random(),
          text: msg.Text,
          type: 'received',
          status: 'success',
          date: msg.ReceivingDateTime || new Date().toLocaleString('pt-BR')
        }));
        setChatHistory(prev => [...prev, ...newResponses]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const interval = setInterval(fetchResponses, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [selectedDevice]);

  return (
    <div className="comando-page">
      <div className="comando-header-selector">
        <label>Veículo Selecionado</label>
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
      </div>

      <div className="comando-chat-card">
        <div className="chat-header">
          <h3>Envio de comandos</h3>
        </div>
        
        <div className="chat-body">
          {chatHistory.length === 0 && (
            <div className="chat-empty"></div>
          )}
          {chatHistory.map(msg => (
            <div key={msg.id} className={`chat-bubble-container ${msg.type}`}>
              <div className={`chat-bubble ${msg.type === 'sent' ? 'bubble-blue' : 'bubble-green'}`}>
                <div className="bubble-text">
                  {msg.type === 'sent' && <strong>Enviando comando:</strong>}
                  <br />
                  {msg.text}
                </div>
                <div className="bubble-meta">
                  {msg.status === 'loading' && <Loader2 size={12} className="spin" />}
                  {msg.status === 'error' && <X size={12} color="#ff4444" />}
                  <span>{msg.date}</span>
                </div>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="chat-footer">
          <input 
            type="text"
            className="chat-input"
            value={currentInput}
            onChange={e => setCurrentInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="reset#"
            disabled={!selectedDevice}
          />
          <button className="chat-btn-send" onClick={handleSend} disabled={!selectedDevice || !currentInput.trim()}>
            <Send size={18} />
          </button>
          <button className="chat-btn-cancel" onClick={() => setCurrentInput('')} disabled={!currentInput}>
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Comando;
