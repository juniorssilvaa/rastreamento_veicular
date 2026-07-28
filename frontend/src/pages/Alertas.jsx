import React, { useState, useEffect } from 'react';
import './Alertas.css';
import Modal from '../components/Modal';
import { Bell, Plus, Trash2, BellRing, Settings2, Clock, Map as MapIcon, Laptop } from 'lucide-react';

const TRACCAR_EVENT_NAMES = {
  commandResult: 'Resultado de comando',
  deviceOnline: 'Dispositivo Online',
  deviceUnknown: 'Dispositivo desconhecido',
  deviceOffline: 'Dispositivo Offline',
  deviceInactive: 'Dispositivo inativo',
  queuedCommandSent: 'Comando enfileirado enviado',
  deviceMoving: 'Dispositivo em Movimento',
  deviceStopped: 'Dispositivo Parado',
  deviceOverspeed: 'Excesso de Velocidade',
  deviceFuelDrop: 'Queda de Combustível',
  deviceFuelIncrease: 'Aumento de combustível',
  geofenceEnter: 'Entrou na Cerca',
  geofenceExit: 'Saiu da Cerca',
  alarm: 'Alerta de SOS/Alarme',
  ignitionOn: 'Ignição Ligada',
  ignitionOff: 'Ignição Desligada',
  maintenance: 'Manutenção Necessária',
  driverChanged: 'Motorista alterado',
  media: 'Mídia',
};

const DEFAULT_FORM = {
  type: 'alarm',
  always: true,
  calendarId: 0,
  notificators: 'web',
  attributes: {},
  description: '',
};

const Alertas = () => {
  const [alerts, setAlerts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Tipo');
  const [notificationTypes, setNotificationTypes] = useState([]);
  const [devices, setDevices] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [schedule, setSchedule] = useState(Array(7).fill().map(() => Array(24).fill(false)));
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [selectedGeofences, setSelectedGeofences] = useState([]);
  const [formData, setFormData] = useState({ ...DEFAULT_FORM });
  const [channels, setChannels] = useState({ web: true, mail: false, sms: false });

  const fetchData = async () => {
    try {
      const [alertRes, typeRes, devRes, geoRes] = await Promise.all([
        fetch('/api/traccar/notifications/'),
        fetch('/api/traccar/notifications/types/'),
        fetch('/api/traccar/devices/'),
        fetch('/api/traccar/entity/geofences/'),
      ]);

      const alertsData = alertRes.ok ? await alertRes.json() : [];
      const typesData = typeRes.ok ? await typeRes.json() : [];
      const devicesData = devRes.ok ? await devRes.json() : [];
      const geofencesData = geoRes.ok ? await geoRes.json() : [];

      setAlerts(Array.isArray(alertsData) ? alertsData : []);
      setNotificationTypes(Array.isArray(typesData) ? typesData : []);
      setDevices(Array.isArray(devicesData) ? devicesData : []);
      setGeofences(Array.isArray(geofencesData) ? geofencesData : []);
    } catch (err) {
      console.error('Erro ao carregar alertas:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({ ...DEFAULT_FORM });
    setSelectedDevices([]);
    setSelectedGeofences([]);
    setSchedule(Array(7).fill().map(() => Array(24).fill(false)));
    setChannels({ web: true, mail: false, sms: false });
    setActiveTab('Tipo');
    setErrorMsg('');
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const eventLabel = (type) => TRACCAR_EVENT_NAMES[type] || type;

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este alerta?')) return;
    try {
      const res = await fetch(`/api/traccar/notifications/${id}/`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        alert('Não foi possível excluir o alerta.');
        return;
      }
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      fetchData();
    } catch (err) {
      console.error('Erro ao excluir:', err);
      alert('Erro de conexão ao excluir o alerta.');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      alert('Selecione ao menos um alerta.');
      return;
    }
    if (!window.confirm(`Excluir ${selectedIds.length} alerta(s)?`)) return;

    try {
      await Promise.all(
        selectedIds.map((id) => fetch(`/api/traccar/notifications/${id}/`, { method: 'DELETE' }))
      );
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      console.error('Erro ao excluir selecionados:', err);
      alert('Erro ao excluir os alertas selecionados.');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === alerts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(alerts.map((a) => a.id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleCell = (dayIndex, hourIndex) => {
    if (formData.always) return;
    const newSchedule = schedule.map((day) => [...day]);
    newSchedule[dayIndex][hourIndex] = !newSchedule[dayIndex][hourIndex];
    setSchedule(newSchedule);
  };

  const setBatchSchedule = (type) => {
    const newSchedule = Array(7)
      .fill()
      .map(() => Array(24).fill(false));
    if (type === 'all') {
      newSchedule.forEach((day) => day.fill(true));
      setFormData((prev) => ({ ...prev, always: true }));
    } else if (type === 'weekdays') {
      for (let i = 1; i <= 5; i++) newSchedule[i].fill(true);
      setFormData((prev) => ({ ...prev, always: false }));
    } else if (type === 'weekends') {
      newSchedule[0].fill(true);
      newSchedule[6].fill(true);
      setFormData((prev) => ({ ...prev, always: false }));
    }
    setSchedule(newSchedule);
  };

  const generateICS = () => {
    let ics = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//BL RASTREAMENTO//PT\n';
    const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

    schedule.forEach((day, dIdx) => {
      day.forEach((hour, hIdx) => {
        if (hour) {
          const start = `${hIdx.toString().padStart(2, '0')}0000`;
          const end = `${(hIdx + 1).toString().padStart(2, '0')}0000`;
          ics += `BEGIN:VEVENT\nRRULE:FREQ=WEEKLY;BYDAY=${days[dIdx]}\nDTSTART:20240101T${start}\nDTEND:20240101T${end}\nEND:VEVENT\n`;
        }
      });
    });
    ics += 'END:VCALENDAR';
    return ics;
  };

  const buildNotificators = () => {
    const list = [];
    if (channels.web) list.push('web');
    if (channels.mail) list.push('mail');
    if (channels.sms) list.push('sms');
    return list.join(',') || 'web';
  };

  const handleSave = async () => {
    if (!formData.type) {
      setErrorMsg('Selecione o tipo do alerta.');
      setActiveTab('Tipo');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      let calendarId = 0;

      if (!formData.always) {
        const hasHours = schedule.some((day) => day.some(Boolean));
        if (!hasHours) {
          setErrorMsg('Marque horários no período ou ative "Sempre ativo".');
          setActiveTab('Período');
          setSaving(false);
          return;
        }

        const calRes = await fetch('/api/traccar/calendars/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Agenda Alerta ${Date.now()}`,
            data: generateICS(),
          }),
        });

        if (!calRes.ok) {
          const errText = await calRes.text().catch(() => '');
          throw new Error(`Falha ao criar calendário (${calRes.status}). ${errText}`);
        }

        const calJson = await calRes.json();
        calendarId = calJson.id || 0;
      }

      const payload = {
        type: formData.type,
        always: Boolean(formData.always),
        calendarId,
        notificators: buildNotificators(),
        attributes: formData.attributes || {},
        description: formData.description || eventLabel(formData.type),
        commandId: 0,
      };

      const notifRes = await fetch('/api/traccar/notifications/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!notifRes.ok) {
        const errText = await notifRes.text().catch(() => '');
        throw new Error(`Falha ao salvar alerta (${notifRes.status}). ${errText}`);
      }

      const notifJson = await notifRes.json();

      if (selectedDevices.length > 0 && notifJson?.id) {
        await fetch('/api/traccar/permissions/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notificationId: notifJson.id,
            devicesIds: selectedDevices,
          }),
        });
      }

      if (selectedGeofences.length > 0 && notifJson?.id) {
        await Promise.all(
          selectedGeofences.map((geofenceId) =>
            fetch('/api/traccar/permissions/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                notificationId: notifJson.id,
                geofenceId,
                devicesIds: [],
              }),
            })
          )
        );
      }

      closeModal();
      fetchData();
    } catch (err) {
      console.error('Erro ao salvar alerta:', err);
      setErrorMsg(err.message || 'Não foi possível salvar o alerta.');
    } finally {
      setSaving(false);
    }
  };

  const toggleDevice = (id) => {
    setSelectedDevices((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const toggleGeofence = (id) => {
    setSelectedGeofences((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const tabs = [
    { id: 'Tipo', icon: <BellRing size={16} /> },
    { id: 'Dispositivos', icon: <Laptop size={16} /> },
    { id: 'Cercas Virtuais', icon: <MapIcon size={16} /> },
    { id: 'Período', icon: <Clock size={16} /> },
    { id: 'Notificações', icon: <Settings2 size={16} /> },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Dispositivos':
        return (
          <div className="tab-pane">
            <label>Selecione os veículos para este alerta:</label>
            <div className="device-selection-list">
              {devices.length === 0 && (
                <p className="alertas-empty-hint">Nenhum veículo cadastrado.</p>
              )}
              {devices.map((d) => (
                <label key={d.id} className="device-check-item">
                  <input
                    type="checkbox"
                    checked={selectedDevices.includes(d.id)}
                    onChange={() => toggleDevice(d.id)}
                  />
                  <span>
                    {d.name} ({d.uniqueId})
                  </span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'Cercas Virtuais':
        return (
          <div className="tab-pane">
            <label>Vincular a cercas (opcional):</label>
            <div className="device-selection-list">
              {geofences.length === 0 && (
                <p className="alertas-empty-hint">Nenhuma cerca cadastrada.</p>
              )}
              {geofences.map((g) => (
                <label key={g.id} className="device-check-item">
                  <input
                    type="checkbox"
                    checked={selectedGeofences.includes(g.id)}
                    onChange={() => toggleGeofence(g.id)}
                  />
                  <span>{g.name}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'Tipo':
        return (
          <div className="tab-pane">
            <label>Tipo do alerta</label>
            <select
              className="form-control"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              {(notificationTypes.length > 0
                ? notificationTypes
                : Object.keys(TRACCAR_EVENT_NAMES).map((type) => ({ type }))
              ).map((t) => (
                <option key={t.type} value={t.type}>
                  {eventLabel(t.type)}
                </option>
              ))}
            </select>

            <label style={{ marginTop: 14 }}>Descrição (opcional)</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ex.: Alerta de cerca casa"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        );

      case 'Notificações':
        return (
          <div className="tab-pane notifications-tab">
            <p className="alertas-empty-hint">Canais que receberão o alerta:</p>
            <div className="form-check-group">
              <label className="check-item">
                <input
                  type="checkbox"
                  checked={channels.web}
                  onChange={(e) => setChannels({ ...channels, web: e.target.checked })}
                />
                Notificação web
              </label>
              <label className="check-item">
                <input
                  type="checkbox"
                  checked={channels.mail}
                  onChange={(e) => setChannels({ ...channels, mail: e.target.checked })}
                />
                E-mail
              </label>
              <label className="check-item">
                <input
                  type="checkbox"
                  checked={channels.sms}
                  onChange={(e) => setChannels({ ...channels, sms: e.target.checked })}
                />
                SMS
              </label>
            </div>
          </div>
        );

      case 'Período':
        return (
          <div className="tab-pane">
            <label className="check-item" style={{ marginBottom: 12 }}>
              <input
                type="checkbox"
                checked={formData.always}
                onChange={(e) => setFormData({ ...formData, always: e.target.checked })}
              />
              Sempre ativo
            </label>
            <div className={`schedule-grid ${formData.always ? 'disabled' : ''}`}>
              <div className="grid-header">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
              </div>
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, dIdx) => (
                <div key={dIdx} className="grid-row">
                  <div className="day-label">{day}</div>
                  <div className="grid-cells">
                    {schedule[dIdx].map((cell, hIdx) => (
                      <div
                        key={hIdx}
                        className={`cell ${cell ? 'selected' : ''}`}
                        onClick={() => toggleCell(dIdx, hIdx)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid-actions">
              <button type="button" className="btn-small" onClick={() => setBatchSchedule('weekdays')}>
                Dias úteis
              </button>
              <button type="button" className="btn-small" onClick={() => setBatchSchedule('weekends')}>
                Final de semana
              </button>
              <button type="button" className="btn-small" onClick={() => setBatchSchedule('all')}>
                Sempre
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="tab-pane">
            <p className="alertas-empty-hint">Selecione uma aba para configurar o alerta.</p>
          </div>
        );
    }
  };

  return (
    <div className="alertas-page">
      <div className="alertas-header">
        <div className="title-section">
          <button type="button" className="btn-action-red" onClick={handleDeleteSelected}>
            Excluir selecionados
          </button>
          <button type="button" className="btn-action-white" onClick={toggleSelectAll}>
            {selectedIds.length === alerts.length && alerts.length > 0
              ? 'Limpar seleção'
              : 'Selecionar todos'}
          </button>
        </div>

        <div className="add-section">
          <button
            type="button"
            className="add-icon-btn"
            title="Adicionar alerta"
            onClick={openCreateModal}
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div className="alertas-list">
        {alerts.map((alert) => (
          <div key={alert.id} className="alert-item">
            <div className="alert-left">
              <input
                type="checkbox"
                checked={selectedIds.includes(alert.id)}
                onChange={() => toggleSelectOne(alert.id)}
              />
              <div className="alert-text">
                <span className="alert-name">{eventLabel(alert.type)}</span>
                {alert.description && (
                  <span className="alert-desc">{alert.description}</span>
                )}
              </div>
            </div>
            <div className="alert-right">
              <span className={`alert-badge ${alert.always ? 'is-always' : ''}`}>
                {alert.always ? 'Sempre' : 'Agendado'}
              </span>
              <button
                type="button"
                className="btn-del"
                title="Excluir"
                onClick={() => handleDelete(alert.id)}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}

        {alerts.length === 0 && (
          <div className="alert-item empty">
            <span className="alert-name">Nenhum alerta cadastrado. Clique em + para criar.</span>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={<><Bell size={20} /> Adicionar alerta</>}>
        <div className="add-alert-form">
          <div className="tabs-header">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span>{tab.id}</span>
              </button>
            ))}
          </div>

          <div className="tab-body">{renderTabContent()}</div>

          {errorMsg && <p className="alertas-form-error">{errorMsg}</p>}

          <div className="modal-footer-btns">
            <button type="button" className="btn-save" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button type="button" className="btn-cancel" onClick={closeModal} disabled={saving}>
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Alertas;
