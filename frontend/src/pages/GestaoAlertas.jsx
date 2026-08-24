import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './GestaoAlertas.css';
import {
  ArrowLeft,
  Bell,
  Edit3,
  Fence,
  Info,
  Plus,
  Search,
  Trash2,
  BarChart3,
} from 'lucide-react';
import toast from 'react-hot-toast';
import CarIcon from '../components/CarIcon';

const EVENT_LABELS = {
  commandResult: 'Resultado de comando',
  deviceOnline: 'Dispositivo online',
  deviceUnknown: 'Dispositivo desconhecido',
  deviceOffline: 'Dispositivo offline',
  deviceInactive: 'Dispositivo inativo',
  queuedCommandSent: 'Comando enfileirado',
  deviceMoving: 'Em movimento',
  deviceStopped: 'Parado',
  deviceOverspeed: 'Excesso de velocidade',
  deviceFuelDrop: 'Queda de combustível',
  deviceFuelIncrease: 'Aumento de combustível',
  geofenceEnter: 'Entrou na cerca',
  geofenceExit: 'Saiu da cerca',
  alarm: 'SOS / Alarme',
  ignitionOn: 'Ignição ligada',
  ignitionOff: 'Ignição desligada',
  maintenance: 'Manutenção',
  driverChanged: 'Motorista alterado',
  media: 'Mídia',
};

const TYPE_DOT = {
  ignitionOn: '#22c55e',
  ignitionOff: '#ef4444',
  deviceMoving: '#eab308',
  deviceOverspeed: '#f97316',
  geofenceExit: '#3b82f6',
  geofenceEnter: '#06b6d4',
  alarm: '#dc2626',
  deviceOffline: '#94a3b8',
};

const eventLabel = (type) => EVENT_LABELS[type] || type || 'Alerta';

const toIsoRange = (hours) => {
  const to = new Date();
  const from = new Date(to.getTime() - hours * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
};

const ownerOf = (device) =>
  device?.attributes?.customerName ||
  device?.attributes?.clienteNome ||
  device?.attributes?.cliente ||
  device?.contact ||
  'Sem cliente';

const plateOf = (device) => device?.attributes?.placa || '';

const GestaoAlertas = ({ onNavigate }) => {
  const [view, setView] = useState('list'); // list | create
  const [alerts, setAlerts] = useState([]);
  const [devices, setDevices] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [notificationTypes, setNotificationTypes] = useState([]);
  const [eventsToday, setEventsToday] = useState([]);
  const [eventsWeek, setEventsWeek] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [vehicleLookup, setVehicleLookup] = useState('');
  const [alertSearch, setAlertSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [createSearch, setCreateSearch] = useState('');
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [createPage, setCreatePage] = useState(1);
  const createPageSize = 12;
  const [form, setForm] = useState({
    type: 'alarm',
    description: '',
    always: true,
    geofenceId: '',
    channels: { web: true, mail: false, sms: false },
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const today = toIsoRange(24);
      const week = toIsoRange(24 * 7);
      const [
        alertsRes,
        devicesRes,
        typesRes,
        geoRes,
        todayRes,
        weekRes,
      ] = await Promise.all([
        fetch('/api/traccar/notifications/'),
        fetch('/api/traccar/devices/?all=true'),
        fetch('/api/traccar/notifications/types/'),
        fetch('/api/traccar/entity/geofences/'),
        fetch(`/api/traccar/events/?from=${encodeURIComponent(today.from)}&to=${encodeURIComponent(today.to)}`),
        fetch(`/api/traccar/events/?from=${encodeURIComponent(week.from)}&to=${encodeURIComponent(week.to)}`),
      ]);

      setAlerts(alertsRes.ok ? await alertsRes.json() : []);
      setDevices(devicesRes.ok ? await devicesRes.json() : []);
      setNotificationTypes(typesRes.ok ? await typesRes.json() : []);
      setGeofences(geoRes.ok ? await geoRes.json() : []);
      setEventsToday(todayRes.ok ? await todayRes.json() : []);
      setEventsWeek(weekRes.ok ? await weekRes.json() : []);
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível carregar os alertas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const typeStats = useMemo(() => {
    const counts = {};
    (Array.isArray(eventsWeek) ? eventsWeek : []).forEach((event) => {
      const type = event.type || 'other';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([type, total]) => ({ type, total, label: eventLabel(type), color: TYPE_DOT[type] || '#64748b' }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 4);
  }, [eventsWeek]);

  const filteredAlerts = useMemo(() => {
    const term = alertSearch.trim().toLowerCase();
    const vehicleTerm = vehicleLookup.trim().toLowerCase();

    let list = Array.isArray(alerts) ? [...alerts] : [];

    if (vehicleTerm) {
      const matchedIds = new Set(
        devices
          .filter((device) => {
            const hay = [
              device.name,
              device.uniqueId,
              plateOf(device),
              ownerOf(device),
              device.attributes?.customerId,
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();
            return hay.includes(vehicleTerm);
          })
          .map((device) => device.id)
      );

      // Sem vínculo device→notification no payload padrão: filtra por texto do alerta
      // e mantém todos se o veículo existir (operador consegue achar pelo contexto).
      if (matchedIds.size === 0) {
        list = list.filter((alert) =>
          `${alert.description || ''} ${eventLabel(alert.type)}`.toLowerCase().includes(vehicleTerm)
        );
      }
    }

    if (term) {
      list = list.filter((alert) =>
        `${alert.description || ''} ${eventLabel(alert.type)} #${alert.id}`
          .toLowerCase()
          .includes(term)
      );
    }

    return list.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
  }, [alerts, alertSearch, vehicleLookup, devices]);

  const totalPages = Math.max(1, Math.ceil(filteredAlerts.length / pageSize));
  const pagedAlerts = filteredAlerts.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [alertSearch, vehicleLookup]);

  const filteredCreateDevices = useMemo(() => {
    const term = createSearch.trim().toLowerCase();
    return devices.filter((device) => {
      if (!term) return true;
      const hay = [device.name, plateOf(device), device.uniqueId, ownerOf(device)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(term);
    });
  }, [devices, createSearch]);

  const createTotalPages = Math.max(1, Math.ceil(filteredCreateDevices.length / createPageSize));
  const pagedCreateDevices = filteredCreateDevices.slice(
    (createPage - 1) * createPageSize,
    createPage * createPageSize
  );

  useEffect(() => {
    setCreatePage(1);
  }, [createSearch]);

  const openCreate = () => {
    setSelectedDevices([]);
    setCreateSearch('');
    setCreatePage(1);
    setForm({
      type: notificationTypes[0]?.type || 'alarm',
      description: '',
      always: true,
      geofenceId: '',
      channels: { web: true, mail: false, sms: false },
    });
    setView('create');
  };

  const closeCreate = () => {
    setView('list');
    setSelectedDevices([]);
  };

  const toggleDevice = (id) => {
    setSelectedDevices((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = pagedCreateDevices.map((device) => device.id);
    const allSelected = visibleIds.every((id) => selectedDevices.includes(id));
    if (allSelected) {
      setSelectedDevices((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedDevices((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este alerta?')) return;
    try {
      const res = await fetch(`/api/traccar/notifications/${id}/`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        toast.error('Não foi possível excluir o alerta.');
        return;
      }
      toast.success('Alerta excluído.');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao excluir.');
    }
  };

  const handleToggleAlways = async (alert) => {
    try {
      const res = await fetch('/api/traccar/notifications/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...alert,
          always: !alert.always,
        }),
      });
      if (!res.ok) {
        toast.error('Não foi possível atualizar o alerta.');
        return;
      }
      toast.success(alert.always ? 'Alerta desativado.' : 'Alerta ativado.');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar alerta.');
    }
  };

  const buildNotificators = () => {
    const list = [];
    if (form.channels.web) list.push('web');
    if (form.channels.mail) list.push('mail');
    if (form.channels.sms) list.push('sms');
    return list.join(',') || 'web';
  };

  const handleSave = async () => {
    if (selectedDevices.length === 0) {
      toast.error('Selecione ao menos um veículo.');
      return;
    }
    if (!form.type) {
      toast.error('Selecione o tipo do alerta.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        type: form.type,
        always: Boolean(form.always),
        calendarId: 0,
        notificators: buildNotificators(),
        attributes: {},
        description: form.description || eventLabel(form.type),
        commandId: 0,
      };

      const notifRes = await fetch('/api/traccar/notifications/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!notifRes.ok) {
        const errText = await notifRes.text().catch(() => '');
        throw new Error(errText || 'Falha ao salvar alerta.');
      }

      const notifJson = await notifRes.json();

      if (notifJson?.id) {
        await fetch('/api/traccar/permissions/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notificationId: notifJson.id,
            devicesIds: selectedDevices,
          }),
        });

        if (form.geofenceId) {
          await fetch('/api/traccar/permissions/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              notificationId: notifJson.id,
              geofenceId: Number(form.geofenceId),
              devicesIds: [],
            }),
          });
        }
      }

      toast.success('Alerta criado com sucesso.');
      closeCreate();
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Não foi possível salvar o alerta.');
    } finally {
      setSaving(false);
    }
  };

  const allVisibleSelected =
    pagedCreateDevices.length > 0 &&
    pagedCreateDevices.every((device) => selectedDevices.includes(device.id));

  if (view === 'create') {
    return (
      <div className="ai-page">
        <div className="ai-create-shell">
          <header className="ai-create-head">
            <button type="button" className="ai-back" onClick={closeCreate}>
              <ArrowLeft size={16} /> Voltar
            </button>
            <h1>⚠️ Criar alerta</h1>
          </header>

          <div className="ai-create-grid">
            <aside className="ai-vehicle-pane">
              <div className="ai-search">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Buscar por placa ou nome..."
                  value={createSearch}
                  onChange={(e) => setCreateSearch(e.target.value)}
                />
              </div>

              <label className="ai-select-all">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                />
                Selecionar todos
              </label>

              <div className="ai-vehicle-list">
                {pagedCreateDevices.length === 0 && (
                  <div className="ai-empty-inline">Nenhum veículo encontrado.</div>
                )}
                {pagedCreateDevices.map((device) => {
                  const checked = selectedDevices.includes(device.id);
                  return (
                    <label key={device.id} className={`ai-vehicle-row ${checked ? 'is-selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDevice(device.id)}
                      />
                      <span className="ai-vehicle-icon"><CarIcon size={16} /></span>
                      <span className="ai-vehicle-copy">
                        <strong>
                          {device.name}
                          {plateOf(device) ? ` ${plateOf(device)}` : ''}
                        </strong>
                        <small>{ownerOf(device)}</small>
                      </span>
                      <i className={`ai-status-dot ${device.status === 'online' ? 'is-online' : 'is-offline'}`} />
                    </label>
                  );
                })}
              </div>

              <div className="ai-pager">
                <span>{filteredCreateDevices.length} veículo(s)</span>
                <div>
                  {Array.from({ length: Math.min(createTotalPages, 6) }, (_, index) => {
                    const pageNum = index + 1;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        className={createPage === pageNum ? 'active' : ''}
                        onClick={() => setCreatePage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {createTotalPages > 6 && (
                    <button
                      type="button"
                      onClick={() => setCreatePage((prev) => Math.min(createTotalPages, prev + 1))}
                    >
                      ›
                    </button>
                  )}
                </div>
              </div>
            </aside>

            <section className="ai-config-pane">
              {selectedDevices.length === 0 ? (
                <div className="ai-config-empty">
                  <Info size={28} />
                  <p>Selecione ao menos um veículo à esquerda para configurar o alerta</p>
                </div>
              ) : (
                <div className="ai-config-form">
                  <div className="ai-selected-summary">
                    <strong>{selectedDevices.length}</strong> veículo(s) selecionado(s)
                  </div>

                  <label>
                    Tipo do alerta
                    <select
                      value={form.type}
                      onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                    >
                      {(notificationTypes.length
                        ? notificationTypes
                        : Object.keys(EVENT_LABELS).map((type) => ({ type }))
                      ).map((item) => (
                        <option key={item.type} value={item.type}>
                          {eventLabel(item.type)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Nome / descrição
                    <input
                      type="text"
                      placeholder="Ex.: Cerca virtual - Saiu - casa"
                      value={form.description}
                      onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    />
                  </label>

                  <label>
                    Cerca virtual (opcional)
                    <select
                      value={form.geofenceId}
                      onChange={(e) => setForm((prev) => ({ ...prev, geofenceId: e.target.value }))}
                    >
                      <option value="">Nenhuma</option>
                      {geofences.map((geo) => (
                        <option key={geo.id} value={geo.id}>{geo.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="ai-check">
                    <input
                      type="checkbox"
                      checked={form.always}
                      onChange={(e) => setForm((prev) => ({ ...prev, always: e.target.checked }))}
                    />
                    Sempre ativo
                  </label>

                  <div className="ai-channels">
                    <span>Canais</span>
                    <label className="ai-check">
                      <input
                        type="checkbox"
                        checked={form.channels.web}
                        onChange={(e) => setForm((prev) => ({
                          ...prev,
                          channels: { ...prev.channels, web: e.target.checked },
                        }))}
                      />
                      App / Web
                    </label>
                    <label className="ai-check">
                      <input
                        type="checkbox"
                        checked={form.channels.mail}
                        onChange={(e) => setForm((prev) => ({
                          ...prev,
                          channels: { ...prev.channels, mail: e.target.checked },
                        }))}
                      />
                      E-mail
                    </label>
                    <label className="ai-check">
                      <input
                        type="checkbox"
                        checked={form.channels.sms}
                        onChange={(e) => setForm((prev) => ({
                          ...prev,
                          channels: { ...prev.channels, sms: e.target.checked },
                        }))}
                      />
                      SMS
                    </label>
                  </div>
                </div>
              )}
            </section>
          </div>

          <footer className="ai-create-footer">
            <span>
              {selectedDevices.length === 0
                ? 'Selecione ao menos um veículo à esquerda para configurar o alerta.'
                : `${selectedDevices.length} veículo(s) prontos para o alerta.`}
            </span>
            <div className="ai-create-actions">
              <button type="button" className="ai-btn ai-btn--ghost" onClick={closeCreate}>
                Cancelar
              </button>
              <button
                type="button"
                className="ai-btn ai-btn--save"
                disabled={selectedDevices.length === 0 || saving}
                onClick={handleSave}
              >
                {saving ? 'Salvando...' : 'Salvar alerta'}
              </button>
            </div>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-page">
      <header className="ai-header">
        <div className="ai-title">
          <Bell size={22} className="ai-title__icon" />
          <h1>Alertas Inteligentes</h1>
        </div>
        <div className="ai-header-actions">
          <button
            type="button"
            className="ai-btn ai-btn--ghost"
            onClick={() => onNavigate?.('Dashboard')}
            title="Painel operacional"
          >
            <BarChart3 size={16} /> Telemetria
          </button>
          <button type="button" className="ai-btn ai-btn--primary" onClick={openCreate}>
            <Plus size={16} /> Novo alerta
          </button>
        </div>
      </header>

      <section className="ai-stats">
        <article className="ai-stat-card">
          <strong>{Array.isArray(eventsToday) ? eventsToday.length : 0}</strong>
          <span>Hoje</span>
        </article>
        <article className="ai-stat-card">
          <strong>{Array.isArray(eventsWeek) ? eventsWeek.length : 0}</strong>
          <span>Últimos 7 dias</span>
        </article>
        <article className="ai-stat-card ai-stat-card--types">
          <div className="ai-stat-card__label">Por tipo</div>
          {typeStats.length === 0 ? (
            <div className="ai-stat-empty">Sem eventos no período</div>
          ) : (
            <div className="ai-type-grid">
              {typeStats.map((item) => (
                <div key={item.type} className="ai-type-item">
                  <i style={{ background: item.color }} />
                  <span>{item.label}</span>
                  <b>{item.total}</b>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="ai-panel">
        <div className="ai-panel__head">
          <CarIcon size={18} className="ai-panel__car" />
          <div>
            <h2>Ver alertas por veículo</h2>
            <p>Selecione um veículo para ver e gerenciar os alertas dele — inclusive de clientes, sem precisar entrar no login deles.</p>
          </div>
        </div>
        <div className="ai-search ai-search--lg">
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar por nome, placa, IMEI, cliente ou CPF/CNPJ..."
            value={vehicleLookup}
            onChange={(e) => setVehicleLookup(e.target.value)}
          />
        </div>
      </section>

      <section className="ai-panel ai-panel--list">
        <div className="ai-list-toolbar">
          <div className="ai-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Buscar alerta pelo nome..."
              value={alertSearch}
              onChange={(e) => setAlertSearch(e.target.value)}
            />
          </div>
          <span className="ai-count">{filteredAlerts.length} alerta(s)</span>
        </div>

        {loading ? (
          <div className="ai-empty-inline">Carregando alertas...</div>
        ) : pagedAlerts.length === 0 ? (
          <div className="ai-empty-inline">Nenhum alerta encontrado. Crie o primeiro com “Novo alerta”.</div>
        ) : (
          <div className="ai-alert-list">
            {pagedAlerts.map((alert) => (
              <div key={alert.id} className="ai-alert-row">
                <div className="ai-alert-main">
                  <span className="ai-alert-icon">
                    {String(alert.type || '').includes('geofence') ? <Fence size={18} /> : <Bell size={18} />}
                  </span>
                  <div>
                    <strong>{alert.description || eventLabel(alert.type)}</strong>
                    <div className="ai-alert-meta">
                      <span>#{alert.id}</span>
                      <span className="ai-pill">{(alert.notificators || 'web').split(',')[0] || 'App'}</span>
                    </div>
                  </div>
                </div>
                <div className="ai-alert-actions">
                  <button
                    type="button"
                    className={`ai-switch ${alert.always ? 'is-on' : ''}`}
                    title={alert.always ? 'Desativar' : 'Ativar'}
                    onClick={() => handleToggleAlways(alert)}
                  >
                    <i />
                  </button>
                  <button type="button" className="ai-icon-btn ai-icon-btn--edit" title="Editar" onClick={openCreate}>
                    <Edit3 size={15} />
                  </button>
                  <button type="button" className="ai-icon-btn ai-icon-btn--danger" title="Excluir" onClick={() => handleDelete(alert.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="ai-pager ai-pager--end">
          <div>
            {Array.from({ length: totalPages }, (_, index) => {
              const pageNum = index + 1;
              return (
                <button
                  key={pageNum}
                  type="button"
                  className={page === pageNum ? 'active' : ''}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default GestaoAlertas;
