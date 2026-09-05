import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './GestaoAlertas.css';
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Check,
  Edit3,
  Fence,
  Info,
  Link2,
  Mail,
  ParkingCircle,
  Plus,
  Search,
  Smartphone,
  Speaker,
  Timer,
  Trash2,
  BarChart3,
  UserRound,
} from 'lucide-react';
import toast from 'react-hot-toast';
import CarIcon from '../components/CarIcon';
import {
  IconIgnitionOff,
  IconIgnitionOn,
  IconLowBattery,
  IconNoSignal,
  IconOffHours,
  IconOverspeed,
  IconPanic,
  IconPowerCut,
} from '../components/AlertTypeIcons';

const EVENT_LABELS = {
  commandResult: 'Resultado de comando',
  deviceOnline: 'Dispositivo online',
  deviceUnknown: 'Dispositivo desconhecido',
  deviceOffline: 'Sem sinal',
  deviceInactive: 'Dispositivo inativo',
  queuedCommandSent: 'Comando enfileirado',
  deviceMoving: 'Em movimento',
  deviceStopped: 'Parado por muito tempo',
  deviceOverspeed: 'Excesso de velocidade',
  deviceFuelDrop: 'Queda de combustível',
  deviceFuelIncrease: 'Aumento de combustível',
  geofenceEnter: 'Entrou na cerca',
  geofenceExit: 'Saiu da cerca',
  alarm: 'Botão de pânico',
  ignitionOn: 'Ignição ligada',
  ignitionOff: 'Ignição desligada',
  maintenance: 'Manutenção',
  driverChanged: 'Motorista alterado',
  media: 'Mídia',
  powerCut: 'Bateria/energia violada',
  lowBattery: 'Bateria com carga baixa',
};

const ALERT_TYPE_CARDS = [
  { type: 'ignitionOn', label: 'Ignição ligada', Icon: IconIgnitionOn, tone: 'green' },
  { type: 'ignitionOff', label: 'Ignição desligada', Icon: IconIgnitionOff, tone: 'red' },
  { type: 'deviceOverspeed', label: 'Excesso de velocidade', Icon: IconOverspeed, tone: 'amber' },
  { type: 'alarm', label: 'Botão de pânico', Icon: IconPanic, tone: 'red' },
  { type: 'powerCut', label: 'Bateria/energia violada', Icon: IconPowerCut, tone: 'orange' },
  { type: 'lowBattery', label: 'Bateria com carga baixa', Icon: IconLowBattery, tone: 'red' },
  { type: 'deviceStopped', label: 'Parado por muito tempo', Icon: ParkingCircle, tone: 'blue' },
  { type: 'deviceOffline', label: 'Sem sinal', Icon: IconNoSignal, tone: 'dark' },
  { type: 'deviceMoving', label: 'Condução fora do horário', Icon: IconOffHours, tone: 'slate' },
  { type: 'geofenceExit', label: 'Cerca virtual', Icon: Fence, tone: 'teal' },
];

const NOTIFY_CARDS = [
  { key: 'app', label: 'No app', hint: 'Notificação no celular', Icon: Smartphone },
  { key: 'popup', label: 'Pop-up na tela', hint: 'Mostra um aviso na tela', Icon: Bell },
  { key: 'sound', label: 'Som', hint: 'Toca um alerta sonoro', Icon: Speaker },
  { key: 'autoHide', label: 'Auto-ocultar', hint: 'Some sozinho depois', Icon: Timer },
  { key: 'mail', label: 'Por e-mail', hint: 'Máx. 1 por hora', Icon: Mail },
  { key: 'mailLink', label: 'E-mail c/link', hint: 'Inclui link de compartilhar', Icon: Link2 },
];

const TYPE_DOT = {
  ignitionOn: '#22c55e',
  ignitionOff: '#ef4444',
  deviceMoving: '#eab308',
  deviceOverspeed: '#f97316',
  geofenceExit: '#14b8a6',
  geofenceEnter: '#06b6d4',
  alarm: '#dc2626',
  deviceOffline: '#94a3b8',
  powerCut: '#f97316',
  lowBattery: '#ef4444',
  deviceStopped: '#3b82f6',
};

const TYPE_ICON_MAP = Object.fromEntries(
  ALERT_TYPE_CARDS.map(({ type, Icon, tone }) => [type, { Icon, tone }])
);
TYPE_ICON_MAP.geofenceEnter = TYPE_ICON_MAP.geofenceExit;

const resolveTypeVisual = (alert) => {
  const key = alert?.attributes?.uiType || alert?.type || '';
  const mapped = TYPE_ICON_MAP[key] || TYPE_ICON_MAP[alert?.type];
  if (mapped) return mapped;
  if (String(key).includes('geofence')) return TYPE_ICON_MAP.geofenceExit;
  return { Icon: Bell, tone: 'slate' };
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

const photoOf = (device) =>
  device?.attributes?.foto ||
  device?.attributes?.photoUrl ||
  device?.attributes?.iconUrl ||
  device?.photo ||
  '';

const buildPageWindow = (current, total, maxButtons = 7) => {
  if (total <= maxButtons) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const half = Math.floor(maxButtons / 2);
  let start = Math.max(1, current - half);
  let end = start + maxButtons - 1;
  if (end > total) {
    end = total;
    start = Math.max(1, end - maxButtons + 1);
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};

const emptyForm = () => ({
  type: 'ignitionOn',
  description: '',
  always: true,
  geofenceId: '',
  geofenceMode: 'exit',
  speedLimit: 80,
  stoppedMinutes: 30,
  ignoreRepeatMin: 0,
  channels: {
    app: true,
    popup: true,
    sound: true,
    autoHide: true,
    mail: false,
    mailLink: false,
  },
});

const GestaoAlertas = ({ onNavigate }) => {
  const [view, setView] = useState('list'); // list | create
  const [editingAlert, setEditingAlert] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [devices, setDevices] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [notificationTypes, setNotificationTypes] = useState([]);
  const [recipients, setRecipients] = useState([]);
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
  const [form, setForm] = useState(emptyForm);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [recipientSearch, setRecipientSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const today = toIsoRange(24);
      const week = toIsoRange(24 * 7);
      const asaasToken = localStorage.getItem('asaasToken') || '';
      const asaasEnv = localStorage.getItem('asaasEnv') || 'sandbox';
      const asaasHeaders = asaasToken
        ? { 'X-Asaas-Token': asaasToken, 'X-Asaas-Env': asaasEnv }
        : {};

      const [
        alertsRes,
        devicesRes,
        typesRes,
        geoRes,
        todayRes,
        weekRes,
        usersRes,
        customersRes,
      ] = await Promise.all([
        fetch('/api/traccar/notifications/'),
        fetch('/api/traccar/devices/?all=true'),
        fetch('/api/traccar/notifications/types/'),
        fetch('/api/traccar/entity/geofences/'),
        fetch(`/api/traccar/events/?from=${encodeURIComponent(today.from)}&to=${encodeURIComponent(today.to)}`),
        fetch(`/api/traccar/events/?from=${encodeURIComponent(week.from)}&to=${encodeURIComponent(week.to)}`),
        fetch('/api/auth/users/'),
        asaasToken
          ? fetch('/api/asaas/customers/', { headers: asaasHeaders })
          : Promise.resolve(null),
      ]);

      setAlerts(alertsRes.ok ? await alertsRes.json() : []);
      setDevices(devicesRes.ok ? await devicesRes.json() : []);
      setNotificationTypes(typesRes.ok ? await typesRes.json() : []);
      setGeofences(geoRes.ok ? await geoRes.json() : []);
      setEventsToday(todayRes.ok ? await todayRes.json() : []);
      setEventsWeek(weekRes.ok ? await weekRes.json() : []);

      const users = usersRes.ok ? await usersRes.json() : [];
      const customers = customersRes && customersRes.ok ? await customersRes.json() : [];
      const byId = new Map();
      (Array.isArray(customers) ? customers : []).forEach((c) => {
        const key = c.id || c.asaas_id || c.cpf_cnpj || c.email;
        if (!key) return;
        byId.set(String(key), {
          id: c.id || c.asaas_id || key,
          name: c.name || 'Cliente',
          subtitle: c.cpf_cnpj || c.email || c.asaas_id || '',
        });
      });
      (Array.isArray(users) ? users : []).forEach((u) => {
        const key = String(u.id);
        if (byId.has(key)) {
          byId.set(key, {
            ...byId.get(key),
            name: u.name || byId.get(key).name,
            subtitle: byId.get(key).subtitle || u.email || '',
          });
        } else {
          byId.set(key, {
            id: u.id,
            name: u.name || u.email || `Usuário ${u.id}`,
            subtitle: u.email || String(u.id),
          });
        }
      });
      // Admin titular fallback
      if (byId.size === 0) {
        byId.set('admin', { id: 'admin', name: 'BLRASTREAMENTO (titular)', subtitle: 'admin' });
      }
      setRecipients(Array.from(byId.values()));
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

  const openCreate = (alert = null) => {
    // Evita receber o SyntheticEvent do onClick (causa "circular structure to JSON")
    const realAlert =
      alert && typeof alert === 'object' && !alert.nativeEvent && (alert.id != null || alert.type)
        ? alert
        : null;
    setEditingAlert(realAlert);
    setSelectedDevices([]);
    setSelectedRecipients([]);
    setCreateSearch('');
    setRecipientSearch('');
    setCreatePage(1);
    if (realAlert) {
      const notificators = String(realAlert.notificators || 'web').split(',').map((s) => s.trim());
      const attrs = realAlert.attributes || {};
      setSelectedRecipients(Array.isArray(attrs.recipientIds) ? attrs.recipientIds : []);
      setForm({
        ...emptyForm(),
        type: attrs.uiType || realAlert.type || 'ignitionOn',
        description: realAlert.description || '',
        always: realAlert.always !== false,
        geofenceId: attrs.geofenceId || '',
        geofenceMode: attrs.geofenceMode || (realAlert.type === 'geofenceEnter' ? 'enter' : 'exit'),
        speedLimit: attrs.speedLimit || 80,
        stoppedMinutes: attrs.stoppedMinutes || 30,
        ignoreRepeatMin: attrs.ignoreRepeatMin || 0,
        channels: {
          app: notificators.includes('web') || notificators.includes('firebase') || attrs.notifyApp !== false,
          popup: attrs.notifyPopup !== false,
          sound: attrs.notifySound !== false,
          autoHide: attrs.notifyAutoHide !== false,
          mail: notificators.includes('mail'),
          mailLink: Boolean(attrs.notifyMailLink),
        },
      });
    } else {
      setForm(emptyForm());
    }
    setView('create');
  };

  const closeCreate = () => {
    setView('list');
    setEditingAlert(null);
    setSelectedDevices([]);
    setSelectedRecipients([]);
  };

  const toggleDevice = (id) => {
    setSelectedDevices((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    const filteredIds = filteredCreateDevices.map((device) => device.id);
    const allSelected =
      filteredIds.length > 0 && filteredIds.every((id) => selectedDevices.includes(id));
    if (allSelected) {
      setSelectedDevices((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedDevices((prev) => Array.from(new Set([...prev, ...filteredIds])));
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

  const filteredRecipients = useMemo(() => {
    const term = recipientSearch.trim().toLowerCase();
    if (!term) return recipients;
    return recipients.filter((r) =>
      `${r.name} ${r.subtitle}`.toLowerCase().includes(term)
    );
  }, [recipients, recipientSearch]);

  const toggleRecipient = (id) => {
    setSelectedRecipients((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleChannel = (key) => {
    setForm((prev) => ({
      ...prev,
      channels: { ...prev.channels, [key]: !prev.channels[key] },
    }));
  };

  const resolveAlertType = () => {
    if (form.type === 'geofenceExit' || form.type === 'geofenceEnter') {
      return form.geofenceMode === 'enter' ? 'geofenceEnter' : 'geofenceExit';
    }
    const available = new Set(
      (notificationTypes.length
        ? notificationTypes.map((t) => t.type)
        : Object.keys(EVENT_LABELS))
    );
    if (available.has(form.type)) return form.type;
    if (form.type === 'powerCut' || form.type === 'lowBattery') {
      return available.has('alarm') ? 'alarm' : form.type;
    }
    return form.type;
  };

  const buildNotificators = () => {
    const list = [];
    if (form.channels.app || form.channels.popup || form.channels.sound) list.push('web');
    if (form.channels.mail || form.channels.mailLink) list.push('mail');
    return list.join(',') || 'web';
  };

  const handleSave = async () => {
    if (selectedDevices.length === 0) {
      toast.error('Selecione ao menos um veículo.');
      return;
    }
    if (selectedRecipients.length === 0) {
      toast.error('Escolha ao menos um destinatário.');
      return;
    }
    if (!form.type) {
      toast.error('Selecione o tipo do alerta.');
      return;
    }
    if ((form.type === 'geofenceExit' || form.type === 'geofenceEnter') && !form.geofenceId) {
      toast.error('Selecione a cerca virtual.');
      return;
    }

    setSaving(true);
    try {
      const resolvedType = resolveAlertType();
      const cleanRecipientIds = selectedRecipients
        .map((id) => (typeof id === 'object' ? id?.id : id))
        .filter((id) => id != null && typeof id !== 'object');

      const payload = {
        id: editingAlert?.id,
        type: resolvedType,
        always: Boolean(form.always),
        calendarId: editingAlert?.calendarId || 0,
        notificators: buildNotificators(),
        attributes: {
          geofenceId: form.geofenceId || undefined,
          geofenceMode: form.geofenceMode,
          speedLimit: form.type === 'deviceOverspeed' ? Number(form.speedLimit) || 80 : undefined,
          stoppedMinutes: form.type === 'deviceStopped' ? Number(form.stoppedMinutes) || 30 : undefined,
          ignoreRepeatMin: Number(form.ignoreRepeatMin) || 0,
          notifyApp: Boolean(form.channels.app),
          notifyPopup: Boolean(form.channels.popup),
          notifySound: Boolean(form.channels.sound),
          notifyAutoHide: Boolean(form.channels.autoHide),
          notifyMailLink: Boolean(form.channels.mailLink),
          recipientIds: cleanRecipientIds,
          uiType: form.type,
        },
        description: form.description || eventLabel(form.type),
        commandId: editingAlert?.commandId || 0,
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
      const notificationId = notifJson?.id || editingAlert?.id;

      if (notificationId) {
        await fetch('/api/traccar/permissions/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notificationId,
            devicesIds: selectedDevices,
          }),
        });

        if (form.geofenceId) {
          await fetch('/api/traccar/permissions/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              notificationId,
              geofenceId: Number(form.geofenceId),
              devicesIds: [],
            }),
          });
        }
      }

      toast.success(editingAlert ? 'Alerta atualizado com sucesso.' : 'Alerta criado com sucesso.');
      closeCreate();
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Não foi possível salvar o alerta.');
    } finally {
      setSaving(false);
    }
  };

  const allFilteredSelected =
    filteredCreateDevices.length > 0 &&
    filteredCreateDevices.every((device) => selectedDevices.includes(device.id));

  const createPages = buildPageWindow(createPage, createTotalPages, 7);
  const listPages = buildPageWindow(page, totalPages, 7);

  if (view === 'create') {
    return (
      <div className="ai-page">
        <div className="ai-create-shell">
          <header className="ai-create-head">
            <button type="button" className="ai-back" onClick={closeCreate}>
              <ArrowLeft size={16} /> Voltar
            </button>
            <div className="ai-create-title">
              <AlertTriangle size={22} className="ai-create-title__icon" />
              <h1>{editingAlert ? 'Editar alerta' : 'Criar alerta'}</h1>
            </div>
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
                  checked={allFilteredSelected}
                  onChange={toggleSelectAllVisible}
                />
                Selecionar todos
                {selectedDevices.length > 0 && (
                  <em className="ai-select-count">({selectedDevices.length})</em>
                )}
              </label>

              <div className="ai-vehicle-list">
                {pagedCreateDevices.length === 0 && (
                  <div className="ai-empty-inline">Nenhum veículo encontrado.</div>
                )}
                {pagedCreateDevices.map((device) => {
                  const checked = selectedDevices.includes(device.id);
                  const photo = photoOf(device);
                  return (
                    <label key={device.id} className={`ai-vehicle-row ${checked ? 'is-selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDevice(device.id)}
                      />
                      <span className={`ai-vehicle-icon ${photo ? 'has-photo' : ''}`}>
                        {photo ? (
                          <img src={photo} alt="" />
                        ) : (
                          <CarIcon size={16} />
                        )}
                      </span>
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

              {createTotalPages > 1 && (
                <div className="ai-pager ai-pager--pages-only">
                  <div>
                    {createPages.map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        className={createPage === pageNum ? 'active' : ''}
                        onClick={() => setCreatePage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    ))}
                    {createPage < createTotalPages && (
                      <button
                        type="button"
                        onClick={() => setCreatePage((prev) => Math.min(createTotalPages, prev + 1))}
                        aria-label="Próxima página"
                      >
                        ›
                      </button>
                    )}
                  </div>
                </div>
              )}
            </aside>

            <section className="ai-config-pane">
              {selectedDevices.length === 0 ? (
                <div className="ai-config-empty">
                  <Info size={28} className="ai-config-empty__icon" />
                  <p>Selecione ao menos um veículo à esquerda para configurar o alerta.</p>
                </div>
              ) : (
                <div className="ai-config-form ai-config-form--full">
                  <section className="ai-section">
                    <h3 className="ai-section__title">Tipo de alerta</h3>
                    <div className="ai-type-cards">
                      {ALERT_TYPE_CARDS.map(({ type, label, Icon, tone }) => {
                        const active = form.type === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            className={`ai-type-card tone-${tone} ${active ? 'is-active' : ''}`}
                            onClick={() => setForm((prev) => ({ ...prev, type }))}
                          >
                            <Icon size={22} className="ai-type-card__icon" />
                            <span>{label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {['deviceOverspeed', 'deviceStopped', 'geofenceExit', 'geofenceEnter'].includes(form.type) && (
                    <section className="ai-section">
                      <div className="ai-conditions">
                        {form.type === 'deviceOverspeed' && (
                          <label className="ai-cond-field">
                            Limite de velocidade (km/h)
                            <input
                              type="number"
                              min={1}
                              value={form.speedLimit}
                              onChange={(e) => setForm((prev) => ({
                                ...prev,
                                speedLimit: e.target.value,
                              }))}
                            />
                          </label>
                        )}
                        {form.type === 'deviceStopped' && (
                          <label className="ai-cond-field">
                            Tempo parado (minutos)
                            <input
                              type="number"
                              min={1}
                              value={form.stoppedMinutes}
                              onChange={(e) => setForm((prev) => ({
                                ...prev,
                                stoppedMinutes: e.target.value,
                              }))}
                            />
                          </label>
                        )}
                        {(form.type === 'geofenceExit' || form.type === 'geofenceEnter') && (
                          <div className="ai-cond-row">
                            <label className="ai-cond-field">
                              Cerca virtual
                              <select
                                value={form.geofenceId}
                                onChange={(e) => setForm((prev) => ({
                                  ...prev,
                                  geofenceId: e.target.value,
                                }))}
                              >
                                <option value="">Selecione...</option>
                                {geofences.map((geo) => (
                                  <option key={geo.id} value={geo.id}>{geo.name}</option>
                                ))}
                              </select>
                            </label>
                            <label className="ai-cond-field">
                              Quando
                              <select
                                value={form.geofenceMode}
                                onChange={(e) => setForm((prev) => ({
                                  ...prev,
                                  geofenceMode: e.target.value,
                                }))}
                              >
                                <option value="exit">Saiu da cerca</option>
                                <option value="enter">Entrou na cerca</option>
                              </select>
                            </label>
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  <section className="ai-section">
                    <h3 className="ai-section__title">
                      Quem é avisado <em className="ai-req">*obrigatório</em>
                    </h3>
                    <div className="ai-search ai-search--inset">
                      <Search size={16} />
                      <input
                        type="text"
                        placeholder="Buscar usuário..."
                        value={recipientSearch}
                        onChange={(e) => setRecipientSearch(e.target.value)}
                      />
                    </div>
                    <div className="ai-recipient-list">
                      {filteredRecipients.length === 0 && (
                        <div className="ai-empty-inline">Nenhum usuário encontrado.</div>
                      )}
                      {filteredRecipients.map((user) => {
                        const checked = selectedRecipients.includes(user.id);
                        return (
                          <label
                            key={user.id}
                            className={`ai-recipient-row ${checked ? 'is-selected' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleRecipient(user.id)}
                            />
                            <span className="ai-recipient-avatar">
                              <UserRound size={16} />
                            </span>
                            <span className="ai-recipient-copy">
                              <strong>{user.name}</strong>
                              <small>{user.subtitle}</small>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="ai-recipient-foot">
                      {selectedRecipients.length} selecionado(s) — {recipients.length} usuários
                    </div>
                  </section>

                  <section className="ai-section">
                    <h3 className="ai-section__title">Como avisar</h3>
                    <div className="ai-notify-cards">
                      {NOTIFY_CARDS.map(({ key, label, hint, Icon }) => {
                        const active = Boolean(form.channels[key]);
                        return (
                          <button
                            key={key}
                            type="button"
                            className={`ai-notify-card ${active ? 'is-active' : ''}`}
                            onClick={() => toggleChannel(key)}
                          >
                            {active && (
                              <span className="ai-notify-card__check">
                                <Check size={12} />
                              </span>
                            )}
                            <Icon size={20} />
                            <strong>{label}</strong>
                            <small>{hint}</small>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <label className="ai-ignore-repeat">
                    Ignorar repetidas por
                    <input
                      type="number"
                      min={0}
                      value={form.ignoreRepeatMin}
                      onChange={(e) => setForm((prev) => ({
                        ...prev,
                        ignoreRepeatMin: e.target.value,
                      }))}
                    />
                    <span>min (0 = sempre avisa)</span>
                  </label>
                </div>
              )}
            </section>
          </div>

          <footer className="ai-create-footer">
            <span className={selectedDevices.length > 0 && selectedRecipients.length === 0 ? 'ai-footer-warn' : ''}>
              {selectedDevices.length === 0
                ? 'Selecione ao menos um veículo à esquerda para configurar o alerta.'
                : selectedRecipients.length === 0
                  ? 'Escolha ao menos um destinatário'
                  : `${selectedDevices.length} veículo(s) · ${selectedRecipients.length} destinatário(s)`}
            </span>
            <div className="ai-create-actions">
              <button type="button" className="ai-btn ai-btn--ghost" onClick={closeCreate}>
                Cancelar
              </button>
              <button
                type="button"
                className="ai-btn ai-btn--save"
                disabled={selectedDevices.length === 0 || selectedRecipients.length === 0 || saving}
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
          <button type="button" className="ai-btn ai-btn--primary" onClick={() => openCreate()}>
            <Plus size={16} /> Novo alerta
          </button>
        </div>
      </header>

      <section className="ai-stats">
        <article className="ai-stat-card">
          <strong>{Array.isArray(eventsToday) ? eventsToday.length : 0}</strong>
          <span>HOJE</span>
        </article>
        <article className="ai-stat-card">
          <strong>{Array.isArray(eventsWeek) ? eventsWeek.length : 0}</strong>
          <span>ÚLTIMOS 7 DIAS</span>
        </article>
        <article className="ai-stat-card ai-stat-card--types">
          <div className="ai-stat-card__label">POR TIPO</div>
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
            {pagedAlerts.map((alert) => {
              const channel = (alert.notificators || 'web').split(',')[0] || 'web';
              const channelLabel = channel === 'web' || channel === 'firebase' ? 'App' : channel;
              const typeKey = alert?.attributes?.uiType || alert.type;
              const { Icon: TypeIcon, tone } = resolveTypeVisual(alert);
              return (
                <div key={alert.id} className="ai-alert-row">
                  <div className="ai-alert-main">
                    <span className={`ai-alert-icon tone-${tone}`}>
                      <TypeIcon size={20} />
                    </span>
                    <div>
                      <strong>{alert.description || eventLabel(typeKey)}</strong>
                      <div className="ai-alert-meta">
                        <span>#{alert.id}</span>
                        <span className="ai-pill ai-pill--type">{eventLabel(typeKey)}</span>
                        <span className="ai-pill ai-pill--app">
                          <Smartphone size={12} />
                          {channelLabel}
                        </span>
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
                    <button
                      type="button"
                      className="ai-icon-btn ai-icon-btn--edit"
                      title="Editar"
                      onClick={() => openCreate(alert)}
                    >
                      <Edit3 size={16} strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      className="ai-icon-btn ai-icon-btn--danger"
                      title="Excluir"
                      onClick={() => handleDelete(alert.id)}
                    >
                      <Trash2 size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="ai-pager ai-pager--end">
            <div>
              {listPages.map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  className={page === pageNum ? 'active' : ''}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default GestaoAlertas;
