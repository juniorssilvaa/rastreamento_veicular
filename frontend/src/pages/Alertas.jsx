import React, { useState, useEffect } from 'react';
import './Alertas.css';
import Modal from '../components/Modal';
import { Bell, Plus, Trash2, BellRing, Settings2, Clock, Map as MapIcon, Shield, Laptop } from 'lucide-react';

const TRACCAR_EVENT_NAMES = {
  'deviceOnline': 'Dispositivo Online',
  'deviceOffline': 'Dispositivo Offline',
  'deviceMoving': 'Dispositivo em Movimento',
  'deviceStopped': 'Dispositivo Parado',
  'deviceOverspeed': 'Excesso de Velocidade',
  'deviceFuelDrop': 'Queda de Combustível',
  'geofenceEnter': 'Entrou na Cerca',
  'geofenceExit': 'Saiu da Cerca',
  'alarm': 'Alerta de SOS/Alarme',
  'ignitionOn': 'Ignição Ligada',
  'ignitionOff': 'Ignição Desligada',
  'maintenance': 'Manutenção Necessária'
};

const Alertas = () => {
  const [alerts, setAlerts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Tipo');
  const [notificationTypes, setNotificationTypes] = useState([]);
  const [devices, setDevices] = useState([]);
  
  // State do Formulário e Grade
  const [schedule, setSchedule] = useState(Array(7).fill().map(() => Array(24).fill(false)));
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [formData, setFormData] = useState({
    type: 'alarm',
    always: true,
    calendarId: null,
    notificators: 'web',
    attributes: {}
  });

  const fetchData = async () => {
    try {
      const [alertRes, typeRes, devRes] = await Promise.all([
        fetch('http://localhost:8000/api/traccar/notifications/'),
        fetch('http://localhost:8000/api/traccar/notifications/types/'),
        fetch('http://localhost:8000/api/traccar/devices/')
      ]);
      setAlerts(await alertRes.json());
      setNotificationTypes(await typeRes.json());
      setDevices(await devRes.json());
    } catch (err) {
      console.error("Erro ao carregar alertas:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = (id) => {
    console.log("Delete", id);
  };  const toggleCell = (dayIndex, hourIndex) => {
    const newSchedule = [...schedule];
    newSchedule[dayIndex][hourIndex] = !newSchedule[dayIndex][hourIndex];
    setSchedule(newSchedule);
    setFormData({...formData, always: false}); // Se mexeu na grade, não é mais "sempre"
  };

  const setBatchSchedule = (type) => {
    const newSchedule = Array(7).fill().map(() => Array(24).fill(false));
    if (type === 'all') {
      newSchedule.forEach(day => day.fill(true));
      setFormData({...formData, always: true});
    } else if (type === 'weekdays') {
      for(let i=1; i<=5; i++) newSchedule[i].fill(true);
      setFormData({...formData, always: false});
    } else if (type === 'weekends') {
      newSchedule[0].fill(true);
      newSchedule[6].fill(true);
      setFormData({...formData, always: false});
    }
    setSchedule(newSchedule);
  };

  const generateICS = () => {
    // Versão simplificada de um ICS para o Traccar
    let ics = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//BL RASTREAMENTO//PT\n";
    const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    
    schedule.forEach((day, dIdx) => {
      day.forEach((hour, hIdx) => {
        if (hour) {
          const start = hIdx.toString().padStart(2, '0') + "0000";
          const end = (hIdx + 1).toString().padStart(2, '0') + "0000";
          ics += `BEGIN:VEVENT\nRRULE:FREQ=WEEKLY;BYDAY=${days[dIdx]}\nDTSTART:20240101T${start}\nDTEND:20240101T${end}\nEND:VEVENT\n`;
        }
      });
    });
    ics += "END:VCALENDAR";
    return ics;
  };

  const handleSave = async () => {
    try {
      let calendarId = null;
      
      // 1. Se não for "always", cria um calendário
      if (!formData.always) {
        const calRes = await fetch('http://localhost:8000/api/traccar/calendars/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Agenda Alerta ${new Date().getTime()}`,
            data: generateICS()
          })
        });
        const calJson = await calRes.json();
        calendarId = calJson.id;
      }

      // 2. Cria a Notificação
      const notifRes = await fetch('http://localhost:8000/api/traccar/notifications/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, calendarId })
      });
      const notifJson = await notifRes.json();

      // 3. Vincula aos dispositivos
      if (selectedDevices.length > 0) {
        await fetch('http://localhost:8000/api/traccar/permissions/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notificationId: notifJson.id,
            devicesIds: selectedDevices
          })
        });
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error("Erro ao salvar alerta funcional:", err);
    }
  };

  const toggleDevice = (id) => {
    if (selectedDevices.includes(id)) {
      setSelectedDevices(selectedDevices.filter(d => d !== id));
    } else {
      setSelectedDevices([...selectedDevices, id]);
    }
  };

  const renderTabs = () => {
    const tabs = [
      { id: 'Dispositivos', icon: <Laptop size={16} /> },
      { id: 'Tipo', icon: <BellRing size={16} /> },
      { id: 'Cercas Virtuais', icon: <MapIcon size={16} /> },
      { id: 'Período', icon: <Clock size={16} /> },
      { id: 'Notificações', icon: <Settings2 size={16} /> },
      { id: 'Comando', icon: <Shield size={16} /> },
    ];

    return (
      <div className="tabs-header">
        {tabs.map(tab => (
          <button 
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.id}
          </button>
        ))}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Dispositivos':
        return (
          <div className="tab-pane">
            <label>Selecione os veículos para este alerta:</label>
            <div className="device-selection-list">
              {devices.map(d => (
                <div key={d.id} className="device-check-item">
                  <input 
                    type="checkbox" 
                    checked={selectedDevices.includes(d.id)} 
                    onChange={() => toggleDevice(d.id)}
                  />
                  <span>{d.name} ({d.uniqueId})</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 'Tipo':
        return (
          <div className="tab-pane">
            <label>Tipo:</label>
            <select 
              className="form-control"
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
            >
              {notificationTypes.length > 0 ? (
                notificationTypes.map(t => (
                  <option key={t.type} value={t.type}>
                    {TRACCAR_EVENT_NAMES[t.type] || t.type}
                  </option>
                ))
              ) : (
                <>
                  <option value="">Carregando tipos...</option>
                  {Object.entries(TRACCAR_EVENT_NAMES).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </>
              )}
            </select>
            
            {formData.type === 'speedLimit' && (
              <div style={{marginTop: '15px'}}>
                <label>Limite de Velocidade (km/h):</label>
                <input type="number" className="form-control" placeholder="Ex: 80" />
              </div>
            )}
          </div>
        );
      case 'Notificações':
        return (
          <div className="tab-pane notifications-tab">
            <div className="form-group row">
                <label>Cor</label>
                <div className="color-bar"></div>
            </div>
            
            <div className="form-check-group">
                <label className="check-item"><input type="checkbox" defaultChecked /> Notificação sonora</label>
                <label className="check-item"><input type="checkbox" defaultChecked /> Auto ocultar pop-up</label>
                <label className="check-item"><input type="checkbox" /> Notificação sonora aplicativo</label>
                <label className="check-item"><input type="checkbox" /> Email notification</label>
                <label className="check-item"><input type="checkbox" /> Webhook notification</label>
            </div>
          </div>
        );
      case 'Período':
        return (
          <div className="tab-pane">
            <label>
              <input 
                type="checkbox" 
                checked={formData.always} 
                onChange={(e) => setFormData({...formData, always: e.target.checked})}
              /> 
              Cronograma (Sempre Ativo)
            </label>
            <div className={`schedule-grid ${formData.always ? 'disabled' : ''}`}>
              <div className="grid-header">
                <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span>
              </div>
              {['D','S','T','Q','Q','S','S'].map((day, dIdx) => (
                <div key={dIdx} className="grid-row">
                  <div className="day-label">{day}</div>
                  <div className="grid-cells">
                    {schedule[dIdx].map((cell, hIdx) => (
                      <div 
                        key={hIdx} 
                        className={`cell ${cell ? 'selected' : ''}`}
                        onClick={() => toggleCell(dIdx, hIdx)}
                      ></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid-actions">
                <button className="btn-small" onClick={() => setBatchSchedule('weekdays')}>Dias úteis</button>
                <button className="btn-small" onClick={() => setBatchSchedule('weekends')}>Final de semana</button>
                <button className="btn-small" onClick={() => setBatchSchedule('all')}>Sempre</button>
            </div>
          </div>
        );
      default:
        return <div className="tab-pane">Conteúdo da aba {activeTab} em implementação...</div>;
    }
  };

  return (
    <div className="alertas-page">
      <div className="alertas-header">
        <div className="title-section">
            <button className="btn-action-red">EXCLUIR SELECIONADOS</button>
            <button className="btn-action-white">SELECIONAR TODOS</button>
        </div>
        
        <div className="add-section">
            <div className="search-box-mini">
                <Plus size={20} className="add-icon-btn" onClick={() => setIsModalOpen(true)} />
            </div>
        </div>
      </div>

      <div className="alertas-list">
        {alerts.map(alert => (
          <div key={alert.id} className="alert-item">
            <div className="alert-left">
              <input type="checkbox" />
              <span className="alert-name">{alert.type}</span>
            </div>
            <div className="alert-right">
              <div className="toggle-switch">
                 <input type="checkbox" defaultChecked />
                 <span className="slider"></span>
              </div>
              <button className="btn-del" onClick={() => handleDelete(alert.id)}>
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        {alerts.length === 0 && (
            <div className="alert-item empty">
                <input type="checkbox" />
                <span className="alert-name">Bateria Violada (Exemplo)</span>
                <div className="alert-right">
                    <div className="toggle-switch active"></div>
                </div>
            </div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={<><Bell size={20} /> Adicionar novo</>}
      >
        <div className="add-alert-form">
          {renderTabs()}
          <div className="tab-body">
            {renderTabContent()}
          </div>
          <div className="modal-footer-btns">
            <button className="btn-save" onClick={handleSave}>Salvar</button>
            <button className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancelar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Alertas;
