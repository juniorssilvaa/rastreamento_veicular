import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, User, X, Edit2, ShieldOff,
  UserX, ChevronDown, Download, Hourglass,
  Bell, Lock, Unlock, MessageSquare, Check, Search, Filter,
  Eye, EyeOff, Info, ChevronLeft, ChevronRight, Calendar, CheckCircle2, XCircle, Minus, Settings, Send
} from 'lucide-react';
import toast from 'react-hot-toast';
import CarIcon from '../components/CarIcon';
import './Clientes.css';

const DonutCard = ({ title, total, segments, accent = '#f97316' }) => {
  const sum = segments.reduce((acc, s) => acc + s.value, 0);
  let cursor = 0;
  const stops = sum > 0
    ? segments
        .filter((s) => s.value > 0)
        .map((s) => {
          const from = (cursor / sum) * 360;
          cursor += s.value;
          const to = (cursor / sum) * 360;
          return `${s.color} ${from}deg ${to}deg`;
        })
        .join(', ')
    : 'var(--donut-empty) 0deg 360deg';

  return (
    <div className="donut-card" style={{ borderLeftColor: accent }}>
      <span className="donut-title">{title}</span>
      <div className="donut" style={{ background: `conic-gradient(${stops})` }}>
        <div className="donut-hole">
          <strong>{total}</strong>
          <span>Total</span>
        </div>
      </div>
      <ul className="donut-legend">
        {segments.map((s) => (
          <li key={s.label}>
            <i style={{ background: s.color }} />
            <span style={{ color: s.color }}>{s.label}</span>
            <b>{s.value}</b>
          </li>
        ))}
      </ul>
    </div>
  );
};

const emptyForm = {
  cpf_cnpj: '', name: '', contract_name: '', rg: '', birth_date: '',
  postal_code: '', address: '', address_number: '', complement: '',
  province: '', city: '', state: '', mobile_phone: '', phone: '',
  monthly_value: '', email: '', due_day: '', income: '',
  status: 'Ativo', group: 'Usuário',
  password: '', password_confirm: '',
  device_limit: '', expiry_date: '',
  billing_email: '', support_phone: '', admin_notes: '',
  disable_asaas_notifications: true,
  recurring: false,
};

const EDIT_TABS = ['PRINCIPAL', 'CLIENTE', 'PERMISSÕES', 'VEÍCULOS', 'APP'];

const PERMISSION_ROWS = [
  { key: 'devices', label: 'Dispositivos' },
  { key: 'expenses', label: 'Despesas' },
  { key: 'alerts', label: 'Alertas' },
  { key: 'geofences', label: 'Cercas Virtuais' },
  { key: 'reports', label: 'Relatórios e Histórico' },
  { key: 'drivers', label: 'Motoristas' },
  { key: 'commands', label: 'Enviar comando' },
  { key: 'api_history', label: 'Histórico API' },
  { key: 'services', label: 'Serviços' },
  { key: 'share_location', label: 'Compartilhar localização' },
  { key: 'sensors', label: 'Sensores' },
  { key: 'imei', label: 'IMEI' },
];

const defaultPermissions = () =>
  Object.fromEntries(
    PERMISSION_ROWS.map(({ key }) => [
      key,
      {
        view: key !== 'imei',
        edit: !['commands', 'sensors', 'imei', 'api_history', 'share_location'].includes(key),
        remove: !['commands', 'sensors', 'imei', 'api_history', 'share_location', 'services'].includes(key),
      },
    ])
  );

const COMMON_PASSWORDS = new Set([
  'password', '12345678', '123456789', 'qwerty123', 'abc12345',
  'senha123', 'senha1234', 'admin123', 'password1', 'iloveyou',
]);

const DEVICES_PAGE_SIZE = 8;

const APP_FEATURES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'servicos', label: 'Serviços' },
  { key: 'sensores', label: 'Sensores' },
  { key: 'historico', label: 'Histórico' },
  { key: 'alertas', label: 'Alertas', hasGear: true },
  { key: 'despesas', label: 'Despesas' },
  { key: 'motoristas', label: 'Motoristas' },
  { key: 'compartilhar', label: 'Compartilhar' },
  { key: 'antifurto', label: 'Antifurto' },
  { key: 'bloquear', label: 'Bloquear e Desbloquear' },
  { key: 'combustivel', label: 'Nível de combustível' },
];

const ALERT_SETTINGS = [
  { key: 'ignicao_ligada', label: 'Alerta de Ignição Ligada' },
  { key: 'ignicao_desligada', label: 'Alerta de Ignição Desligada' },
  { key: 'violacao_bateria', label: 'Alerta de Violação de Bateria' },
  { key: 'sos', label: 'Alerta de S.O.S' },
  { key: 'antifurto', label: 'Alerta Antifurto' },
  { key: 'horario', label: 'Alerta de Horário' },
  { key: 'transmissao', label: 'Alerta de Transmissão' },
  { key: 'velocidade', label: 'Alerta de Velocidade' },
  { key: 'deslocamento', label: 'Alerta de Deslocamento' },
  { key: 'perimetro', label: 'Alerta de Perímetro' },
  { key: 'bloqueio', label: 'Alerta de Bloqueio' },
  { key: 'desbloqueio', label: 'Alerta de Desbloqueio' },
  { key: 'personalizado', label: 'Alerta Personalizado' },
];

const defaultAppSettings = () =>
  Object.fromEntries(APP_FEATURES.map(({ key }) => [key, true]));

const defaultAlertSettings = () =>
  Object.fromEntries(ALERT_SETTINGS.map(({ key }) => [key, true]));

const ToggleSwitch = ({ checked, onChange, disabled = false }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    className={`cli-toggle ${checked ? 'on' : ''} ${disabled ? 'disabled' : ''}`}
    onClick={() => !disabled && onChange(!checked)}
  >
    <span className="cli-toggle-knob" />
  </button>
);

const getDevicePhoto = (d) =>
  d?.attributes?.foto || d?.attributes?.photoUrl || d?.attributes?.iconUrl || d?.photo || '';

const getDevicePlate = (d) => {
  const raw = d?.attributes?.placa || d?.attributes?.plate || d?.plate || '';
  return String(raw).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
};

const getDeviceName = (d) => d?.name || d?.attributes?.descricao || `Veículo ${d?.id || ''}`;

const deviceMatchesQuery = (d, q) => {
  if (!q) return true;
  const hay = [getDeviceName(d), getDevicePlate(d), d?.uniqueId, d?.id, d?.model, d?.attributes?.modelo]
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
};

const VehiclePickRow = ({
  device,
  selected,
  onSelect,
  onActivate,
  action = 'add',
}) => {
  const photo = getDevicePhoto(device);
  const plate = getDevicePlate(device);
  const name = getDeviceName(device);

  return (
    <div
      role="button"
      tabIndex={0}
      className={`vehicle-pick-row ${selected ? 'selected' : ''}`}
      onClick={onSelect}
      onDoubleClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSelect();
      }}
    >
      <div className={`vehicle-pick-photo ${photo ? 'has-img' : ''}`}>
        {photo ? (
          <img src={photo} alt="" />
        ) : (
          <CarIcon size={28} />
        )}
      </div>
      <div className="vehicle-pick-info">
        <strong className="vehicle-pick-name">{name}</strong>
        <div className="vehicle-pick-sub">
          {plate ? (
            <span className="vehicle-plate-badge">{plate}</span>
          ) : (
            <span className="vehicle-plate-missing">Sem placa</span>
          )}
          {device.uniqueId ? <span className="vehicle-imei">{device.uniqueId}</span> : null}
        </div>
      </div>
      <button
        type="button"
        className={`vehicle-pick-action ${action}`}
        onClick={(e) => {
          e.stopPropagation();
          onActivate();
        }}
        aria-label={action === 'add' ? 'Vincular veículo' : 'Remover veículo'}
      >
        {action === 'add' ? <Plus size={16} /> : <Minus size={16} />}
      </button>
    </div>
  );
};

const formatMoney = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (value) => {
  if (!value) return '—';
  const raw = String(value).slice(0, 10);
  const [y, m, d] = raw.split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
};

const formatPhone = (value) => {
  if (!value) return '—';
  const digits = String(value).replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return value;
};

const rowKey = (c) => c.id || c.asaas_id || `${c.cpf_cnpj}-${c.name}`;

const Clientes = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterRecurrence, setFilterRecurrence] = useState('Todos');
  const [filterContract, setFilterContract] = useState('Todos');
  const [expandedKey, setExpandedKey] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTab, setEditTab] = useState('PRINCIPAL');
  const [formData, setFormData] = useState(emptyForm);
  const [overdueMap, setOverdueMap] = useState({});
  const [financeMap, setFinanceMap] = useState({});
  const [financeLoading, setFinanceLoading] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [limitEnabled, setLimitEnabled] = useState(false);
  const [expiryEnabled, setExpiryEnabled] = useState(false);
  const [permissions, setPermissions] = useState(defaultPermissions);
  const [allDevices, setAllDevices] = useState([]);
  const [linkedDeviceIds, setLinkedDeviceIds] = useState([]);
  const [availableSearch, setAvailableSearch] = useState('');
  const [linkedSearch, setLinkedSearch] = useState('');
  const [availablePage, setAvailablePage] = useState(1);
  const [selectedAvailable, setSelectedAvailable] = useState(null);
  const [selectedLinked, setSelectedLinked] = useState(null);
  const [appSettings, setAppSettings] = useState(defaultAppSettings);
  const [alertSettings, setAlertSettings] = useState(defaultAlertSettings);
  const [alertModalOpen, setAlertModalOpen] = useState(false);

  const passwordChecks = useMemo(() => {
    const pwd = formData.password || '';
    return [
      { ok: pwd.length >= 8, label: 'Mínimo de 8 caracteres' },
      { ok: /[a-z]/.test(pwd), label: 'Uma letra minúscula (a-z)' },
      { ok: /[A-Z]/.test(pwd), label: 'Uma letra maiúscula (A-Z)' },
      { ok: /[0-9]/.test(pwd), label: 'Um número (0-9)' },
      { ok: pwd.length > 0 && !COMMON_PASSWORDS.has(pwd.toLowerCase()), label: 'Não é uma senha comum' },
    ];
  }, [formData.password]);

  const getAsaasHeaders = () => {
    const asaasToken = localStorage.getItem('asaasToken') || '';
    const asaasEnv = localStorage.getItem('asaasEnv') || 'sandbox';
    const headers = {};
    if (asaasToken) {
      headers['X-Asaas-Token'] = asaasToken;
      headers['X-Asaas-Env'] = asaasEnv;
    }
    return { headers, asaasToken, asaasEnv };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const fetchCustomers = async () => {
    setIsFetching(true);
    try {
      const { headers, asaasToken } = getAsaasHeaders();
      const [custRes, overdueRes] = await Promise.all([
        fetch('/api/asaas/customers/', { headers }),
        asaasToken
          ? fetch('/api/asaas/overdue-customers/', { headers })
          : Promise.resolve(null),
      ]);

      if (custRes.ok) {
        const data = await custRes.json();
        setCustomers(Array.isArray(data) ? data : []);
      } else {
        const err = await custRes.json().catch(() => ({}));
        toast.error(err.error || 'Erro ao buscar clientes');
      }

      if (overdueRes && overdueRes.ok) {
        const overdueData = await overdueRes.json();
        const map = {};
        (overdueData.customers || []).forEach((c) => {
          map[c.asaas_id] = c;
        });
        setOverdueMap(map);
      }
    } catch (error) {
      toast.error('Erro ao buscar clientes');
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const enrichCustomer = (c) => {
    const overdue = c.asaas_id ? overdueMap[c.asaas_id] : null;
    const finance = c.asaas_id ? financeMap[c.asaas_id] : null;
    const isOverdue = Boolean(overdue) || Boolean(finance?.overdue);
    const recurring =
      finance?.recurring ??
      Boolean(c.is_recurring || c.asaas_subscription_id || c.monthly_value || c.due_day);
    const hasContract = Boolean(c.contract_name || c.asaas_id || c.monthly_value);
    return {
      ...c,
      isOverdue,
      recurring,
      hasContract,
      vehicleCount: c.vehicle_count ?? 0,
      alertLabel: isOverdue ? 'Verificar' : 'Apto',
    };
  };

  const enriched = useMemo(
    () => customers.map(enrichCustomer),
    [customers, overdueMap, financeMap]
  );

  const stats = useMemo(() => {
    const overdue = enriched.filter((c) => c.isOverdue).length;
    const recurring = enriched.filter((c) => c.recurring).length;
    const withContract = enriched.filter((c) => c.hasContract).length;
    return {
      total: enriched.length,
      emDia: Math.max(enriched.length - overdue, 0),
      inadimplentes: overdue,
      recorrentes: recurring,
      avulsos: Math.max(enriched.length - recurring, 0),
      comContrato: withContract,
      semContrato: Math.max(enriched.length - withContract, 0),
    };
  }, [enriched]);

  const filteredCustomers = enriched.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const hay = [
        c.name, c.cpf_cnpj, c.email, c.mobile_phone, c.phone, c.asaas_id, c.contract_name,
      ].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filterStatus === 'Em dia' && c.isOverdue) return false;
    if (filterStatus === 'Inadimplente' && !c.isOverdue) return false;
    if (filterRecurrence === 'Recorrente' && !c.recurring) return false;
    if (filterRecurrence === 'Avulso' && c.recurring) return false;
    if (filterContract === 'Contratado' && !c.hasContract) return false;
    if (filterContract === 'Sem contrato' && c.hasContract) return false;
    return true;
  });

  const resetEditorState = () => {
    setShowPassword(false);
    setShowPasswordConfirm(false);
    setLimitEnabled(false);
    setExpiryEnabled(false);
    setPermissions(defaultPermissions());
    setLinkedDeviceIds([]);
    setAvailableSearch('');
    setLinkedSearch('');
    setAvailablePage(1);
    setSelectedAvailable(null);
    setSelectedLinked(null);
    setAppSettings(defaultAppSettings());
    setAlertSettings(defaultAlertSettings());
    setAlertModalOpen(false);
  };

  const openNewEditor = () => {
    setEditingCustomer(null);
    setFormData(emptyForm);
    resetEditorState();
    setEditTab('PRINCIPAL');
    setEditOpen(true);
  };

  const openEditEditor = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      ...emptyForm,
      ...customer,
      birth_date: customer.birth_date ? String(customer.birth_date).split('T')[0] : '',
      monthly_value: customer.monthly_value || '',
      due_day: customer.due_day || '',
      income: customer.income || '',
      status: customer.is_active === false ? 'Inativo' : 'Ativo',
      group: 'Usuário',
      password: '',
      password_confirm: '',
      billing_email: customer.email || '',
      support_phone: '',
      admin_notes: '',
      device_limit: '',
      expiry_date: '',
      disable_asaas_notifications: true,
      recurring: Boolean(customer.is_recurring || customer.asaas_subscription_id || customer.recurring),
    });
    resetEditorState();
    setEditTab('PRINCIPAL');
    setEditOpen(true);
  };

  useEffect(() => {
    if (!editOpen) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/traccar/devices/?all=true');
        const data = res.ok ? await res.json() : [];
        if (!cancelled) setAllDevices(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setAllDevices([]);
      }
    })();
    return () => { cancelled = true; };
  }, [editOpen]);

  const availableDevices = useMemo(() => {
    const q = availableSearch.trim().toLowerCase();
    return allDevices.filter((d) => {
      if (linkedDeviceIds.includes(d.id)) return false;
      return deviceMatchesQuery(d, q);
    });
  }, [allDevices, linkedDeviceIds, availableSearch]);

  const linkedDevices = useMemo(() => {
    const q = linkedSearch.trim().toLowerCase();
    return allDevices.filter((d) => {
      if (!linkedDeviceIds.includes(d.id)) return false;
      return deviceMatchesQuery(d, q);
    });
  }, [allDevices, linkedDeviceIds, linkedSearch]);

  const availableTotalPages = Math.max(1, Math.ceil(availableDevices.length / DEVICES_PAGE_SIZE));
  const pagedAvailable = availableDevices.slice(
    (availablePage - 1) * DEVICES_PAGE_SIZE,
    availablePage * DEVICES_PAGE_SIZE
  );

  useEffect(() => {
    if (availablePage > availableTotalPages) setAvailablePage(availableTotalPages);
  }, [availablePage, availableTotalPages]);

  const moveDeviceToLinked = (id) => {
    setLinkedDeviceIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setSelectedAvailable(null);
  };

  const moveDeviceToAvailable = (id) => {
    setLinkedDeviceIds((prev) => prev.filter((x) => x !== id));
    setSelectedLinked(null);
  };

  const moveSelectedRight = () => {
    if (selectedAvailable != null) moveDeviceToLinked(selectedAvailable);
  };

  const moveSelectedLeft = () => {
    if (selectedLinked != null) moveDeviceToAvailable(selectedLinked);
  };

  const moveAllRight = () => {
    setLinkedDeviceIds((prev) => {
      const ids = availableDevices.map((d) => d.id);
      return [...new Set([...prev, ...ids])];
    });
  };

  const moveAllLeft = () => {
    setLinkedDeviceIds([]);
  };

  const togglePermission = (key, field) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: !prev[key][field] },
    }));
  };

  const toggleExpand = async (customer) => {
    const key = rowKey(customer);
    if (expandedKey === key) {
      setExpandedKey(null);
      return;
    }
    setExpandedKey(key);

    if (!customer.asaas_id) return;
    if (financeMap[customer.asaas_id] || financeLoading[customer.asaas_id]) return;

    const { headers, asaasToken } = getAsaasHeaders();
    if (!asaasToken) return;

    setFinanceLoading((prev) => ({ ...prev, [customer.asaas_id]: true }));
    try {
      const res = await fetch(`/api/asaas/customers/${customer.asaas_id}/finance/`, { headers });
      if (res.ok) {
        const data = await res.json();
        setFinanceMap((prev) => ({ ...prev, [customer.asaas_id]: data }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFinanceLoading((prev) => ({ ...prev, [customer.asaas_id]: false }));
    }
  };

  const handleDeleteCustomer = async (asaas_id) => {
    if (!asaas_id) return;
    if (!window.confirm('Tem certeza que deseja excluir este cliente? Removerá também no Asaas.')) return;

    const { headers, asaasToken } = getAsaasHeaders();
    if (!asaasToken) {
      toast.error('Token do Asaas não configurado.');
      return;
    }

    try {
      const response = await fetch(`/api/asaas/customers/${asaas_id}/`, {
        method: 'DELETE',
        headers,
      });
      if (!response.ok) throw new Error('Falha ao excluir cliente');
      toast.success('Cliente excluído com sucesso');
      setExpandedKey(null);
      setEditOpen(false);
      fetchCustomers();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleCreateAccess = async (customerId) => {
    try {
      const response = await fetch(`/api/auth/users/${customerId}/`, { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        toast.success(`Acesso criado! Login: ${data.username} Senha: ${data.password}`, { duration: 10000 });
        fetchCustomers();
      } else toast.error(data.error || 'Erro ao criar acesso');
    } catch {
      toast.error('Erro na requisição');
    }
  };

  const handleToggleStatus = async (customerId, currentStatus) => {
    try {
      const response = await fetch(`/api/auth/users/${customerId}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      if (response.ok) {
        toast.success(!currentStatus ? 'Acesso ativado' : 'Acesso desativado');
        fetchCustomers();
      } else toast.error('Erro ao atualizar status');
    } catch {
      toast.error('Erro na requisição');
    }
  };

  const handleResetPassword = async (customerId) => {
    if (!window.confirm('Deseja gerar nova senha aleatória para este cliente?')) return;
    try {
      const response = await fetch(`/api/auth/users/${customerId}/reset-password/`, { method: 'POST' });
      const data = await response.json();
      if (response.ok) toast.success(`Nova senha gerada: ${data.new_password}`, { duration: 10000 });
      else toast.error(data.error || 'Erro ao resetar senha');
    } catch {
      toast.error('Erro na requisição');
    }
  };

  const handleRemove2FA = async (customerId) => {
    if (!window.confirm('Deseja remover a autenticação 2FA deste usuário?')) return;
    try {
      const response = await fetch(`/api/auth/users/${customerId}/remove-2fa/`, { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        toast.success('2FA removida com sucesso.');
        fetchCustomers();
      } else toast.error(data.error || 'Erro ao remover 2FA');
    } catch {
      toast.error('Erro na requisição');
    }
  };

  const handleSaveCustomer = async (e, sendToAsaas = false) => {
    e?.preventDefault?.();
    setIsLoading(true);

    const { headers, asaasToken } = getAsaasHeaders();

    if (sendToAsaas && !asaasToken) {
      toast.error('Token do Asaas não configurado. Vá em Gerenciar > Integrações.');
      setIsLoading(false);
      return;
    }

    if (!formData.name?.trim() || !formData.cpf_cnpj?.trim()) {
      toast.error('Preencha CPF/CNPJ e Nome/Razão Social na aba Cliente.');
      setIsLoading(false);
      return;
    }

    if (formData.password || formData.password_confirm) {
      if (formData.password !== formData.password_confirm) {
        toast.error('A confirmação de senha não confere.');
        setIsLoading(false);
        return;
      }
      if (passwordChecks.some((c) => !c.ok)) {
        toast.error('A senha não atende aos requisitos mínimos.');
        setIsLoading(false);
        return;
      }
    }

    if (formData.birth_date) {
      const year = formData.birth_date.split('-')[0];
      if (year.length > 4 || parseInt(year, 10) > new Date().getFullYear() || parseInt(year, 10) < 1900) {
        toast.error('A data de nascimento informada é inválida.');
        setIsLoading(false);
        return;
      }
    }

    const payload = {
      local_id: editingCustomer?.id || null,
      asaas_id: editingCustomer?.asaas_id || null,
      send_to_asaas: !!sendToAsaas,
      disable_asaas_notifications: !!formData.disable_asaas_notifications,
      is_recurring: !!formData.recurring,
      recurring: !!formData.recurring,
      cpf_cnpj: formData.cpf_cnpj,
      name: formData.name,
      contract_name: formData.contract_name,
      rg: formData.rg,
      birth_date: formData.birth_date,
      postal_code: formData.postal_code,
      address: formData.address,
      address_number: formData.address_number,
      complement: formData.complement,
      province: formData.province,
      city: formData.city,
      state: formData.state,
      mobile_phone: formData.mobile_phone,
      phone: formData.phone,
      email: formData.email || formData.billing_email,
      monthly_value: formData.monthly_value,
      due_day: formData.due_day,
      income: formData.income,
    };

    try {
      const response = await fetch('/api/asaas/customers/', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        let errorMsg = data.error || data.errors?.[0]?.description || 'Erro ao salvar cliente';
        if (typeof errorMsg === 'string' && (errorMsg.startsWith('["') || errorMsg.startsWith("['"))) {
          errorMsg = errorMsg.replace(/\["|"]|\['|']/g, '').replace(/', '/g, ' ');
          if (errorMsg.includes('invalid date format')) {
            errorMsg = 'Formato de data inválido. Verifique o ano.';
          }
        }
        throw new Error(errorMsg);
      }

      if (sendToAsaas) {
        toast.success(
          data.subscription
            ? 'Cliente enviado ao Asaas e fatura/assinatura gerada!'
            : `Cliente enviado ao Asaas! (${data.asaas_id || ''})`
        );
      } else {
        toast.success(editingCustomer ? 'Cliente atualizado localmente!' : 'Cliente salvo localmente (sem Asaas)!');
      }
      setEditOpen(false);
      fetchCustomers();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderExpanded = (c) => {
    const finance = c.asaas_id ? financeMap[c.asaas_id] : null;
    const loading = c.asaas_id ? financeLoading[c.asaas_id] : false;
    const active = finance ? finance.account_active && !finance.overdue : !c.isOverdue;

    return (
      <tr className="cliente-expand-row">
        <td colSpan={9}>
          <div className="cliente-expand-panel">
            <div className="expand-card expand-card--pay">
              <span className="expand-label">Último pago:</span>
              <strong className="expand-value">
                {loading ? '...' : formatMoney(finance?.last_paid_value ?? c.monthly_value)}
              </strong>
              <span className="expand-sub">
                Pagamento efetuado: {loading ? '...' : formatDate(finance?.last_paid_date)}
              </span>
            </div>

            <div className={`expand-card expand-card--status ${active ? 'is-ok' : 'is-warn'}`}>
              <div className="expand-status-line">
                Sua conta está <span className="pill-white">{active ? 'Ativa' : 'Atenção'}</span>
              </div>
              <div>Próximo pagamento em {loading ? '...' : formatDate(finance?.next_due_date)}</div>
              <div className="expand-sub-light">
                {finance?.days_until_due != null
                  ? `Sua fatura vence em ${finance.days_until_due} dia(s)`
                  : c.isOverdue
                    ? 'Cliente com fatura em atraso'
                    : 'Sem vencimento informado'}
              </div>
            </div>

            <div className="expand-card expand-card--gestao">
              <div className="expand-gestao-head">
                <span>Gestão</span>
                <span className="pill-teal">Usuário</span>
              </div>
              <div className="gestao-btns">
                <button type="button" className="gestao-btn">1 Contrato</button>
                <button type="button" className="gestao-btn">
                  {finance?.payments_count ?? 0} Faturas
                </button>
                <button type="button" className="gestao-btn">Documentos</button>
              </div>
            </div>

            <div className="expand-card expand-card--controls">
              <div className="expand-label">Controle de Usuário</div>
              <div className="control-scroll">
                <button type="button" className="control-btn" title="Notificação">
                  <Bell size={18} /><span>Notificação</span>
                </button>
                <button
                  type="button"
                  className="control-btn"
                  disabled={!c.id}
                  onClick={() => c.id && (c.has_access ? handleResetPassword(c.id) : handleCreateAccess(c.id))}
                >
                  <MessageSquare size={18} /><span>{c.has_access ? 'Senha' : 'Login'}</span>
                </button>
                <button
                  type="button"
                  className="control-btn"
                  disabled={!c.id || !c.has_access}
                  onClick={() => c.id && handleToggleStatus(c.id, true)}
                >
                  <Lock size={18} /><span>Bloquear</span>
                </button>
                <button
                  type="button"
                  className="control-btn"
                  disabled={!c.id || !c.has_access}
                  onClick={() => c.id && handleToggleStatus(c.id, false)}
                >
                  <Unlock size={18} /><span>Desbloquear</span>
                </button>
                <button
                  type="button"
                  className="control-btn"
                  disabled={!c.id}
                  onClick={() => c.id && handleRemove2FA(c.id)}
                >
                  <ShieldOff size={18} /><span>2FA</span>
                </button>
                <button
                  type="button"
                  className="control-btn danger"
                  disabled={!c.asaas_id}
                  onClick={() => handleDeleteCustomer(c.asaas_id)}
                >
                  <UserX size={18} /><span>Excluir</span>
                </button>
              </div>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="clientes-page">
      <div className="clientes-stats">
        <DonutCard
          title="Situação dos clientes"
          total={stats.total}
          accent="#22c55e"
          segments={[
            { label: 'Em dia', value: stats.emDia, color: '#22c55e' },
            { label: 'Inadimplentes', value: stats.inadimplentes, color: '#eab308' },
          ]}
        />
        <DonutCard
          title="Recorrência"
          total={stats.total}
          accent="#f97316"
          segments={[
            { label: 'Recorrente', value: stats.recorrentes, color: '#f97316' },
            { label: 'Avulso', value: stats.avulsos, color: '#2563eb' },
          ]}
        />
        <DonutCard
          title="Contrato"
          total={stats.total}
          accent="#2563eb"
          segments={[
            { label: 'Com contrato', value: stats.comContrato, color: '#22c55e' },
            { label: 'Sem contrato', value: stats.semContrato, color: '#dc2626' },
          ]}
        />
      </div>

      <div className="clientes-toolbar">
        <div className="toolbar-search">
          <Search size={16} />
          <input
            type="search"
            placeholder="Buscar por nome, CPF/CNPJ, e-mail ou telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="toolbar-filters">
          <div className="filter-chip">
            <Filter size={14} />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option>Todos</option>
              <option>Em dia</option>
              <option>Inadimplente</option>
            </select>
          </div>
          <div className="filter-chip">
            <select value={filterRecurrence} onChange={(e) => setFilterRecurrence(e.target.value)}>
              <option>Todos</option>
              <option>Recorrente</option>
              <option>Avulso</option>
            </select>
          </div>
          <div className="filter-chip">
            <select value={filterContract} onChange={(e) => setFilterContract(e.target.value)}>
              <option>Todos</option>
              <option>Contratado</option>
              <option>Sem contrato</option>
            </select>
          </div>

          <button type="button" className="btn-ghost" onClick={fetchCustomers} disabled={isFetching}>
            <Download size={16} /> Exportar
          </button>
          <button type="button" className="btn-solid" onClick={openNewEditor}>
            <Plus size={16} /> Novo Cliente
          </button>
        </div>
      </div>

      <div className="clientes-shell">
        {isFetching ? (
          <div className="clientes-loading">Carregando clientes do Asaas...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="clientes-empty-state">
            <User size={48} className="empty-icon" />
            <h3>Nenhum cliente encontrado</h3>
            <p>Confira o token Asaas em Gerenciar → Integrações ou ajuste os filtros.</p>
          </div>
        ) : (
          <div className="clientes-table-wrap">
            <table className="clientes-table modern">
              <thead>
                <tr>
                  <th className="col-expand" />
                  <th>Cliente</th>
                  <th>CPF/CNPJ</th>
                  <th>Celular</th>
                  <th>Recorrência</th>
                  <th>Alerta</th>
                  <th>Contrato</th>
                  <th>Veículos</th>
                  <th className="col-actions" />
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => {
                  const key = rowKey(c);
                  const open = expandedKey === key;
                  return (
                    <React.Fragment key={key}>
                      <tr className={`cliente-row ${open ? 'is-open' : ''} ${c.isOverdue ? 'is-overdue' : ''}`}>
                        <td className="col-expand">
                          <button
                            type="button"
                            className={`expand-toggle ${open ? 'open' : ''}`}
                            onClick={() => toggleExpand(c)}
                            aria-label={open ? 'Recolher' : 'Expandir'}
                          >
                            <ChevronDown size={18} />
                          </button>
                        </td>
                        <td>
                          <div className="cliente-identity">
                            <div className={`cliente-avatar ${c.isOverdue ? 'warn' : 'ok'}`} aria-hidden>
                              <User size={18} strokeWidth={2} />
                              <span className={`avatar-dot ${c.isOverdue ? 'off' : 'on'}`} />
                            </div>
                            <div>
                              <div className="cliente-name">{(c.name || 'Sem nome').toUpperCase()}</div>
                            </div>
                          </div>
                        </td>
                        <td className="col-meta">
                          <div>{c.cpf_cnpj || '—'}</div>
                        </td>
                        <td className="col-meta">{formatPhone(c.mobile_phone || c.phone)}</td>
                        <td>
                          <span className={`pill ${c.recurring ? 'pill-orange' : 'pill-muted'}`}>
                            {c.recurring ? 'Sim' : 'Não'}
                          </span>
                        </td>
                        <td>
                          <span className={`alerta ${c.isOverdue ? 'warn' : 'ok'}`}>
                            {c.isOverdue ? (
                              <Hourglass size={15} className="alerta-hourglass" strokeWidth={2.4} />
                            ) : (
                              <span className="alerta-ball" aria-hidden />
                            )}
                            {c.alertLabel}
                          </span>
                        </td>
                        <td>
                          <span className={`pill ${c.hasContract ? 'pill-success' : 'pill-danger'}`}>
                            {c.hasContract ? 'Sim' : 'Não'}
                          </span>
                        </td>
                        <td>
                          <span className="vehicle-badge">{c.vehicleCount}</span>
                        </td>
                        <td className="col-actions">
                          <button
                            type="button"
                            className="btn-edit-square"
                            onClick={() => openEditEditor(c)}
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                        </td>
                      </tr>
                      {open && renderExpanded(c)}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editOpen && (
        <div className="cliente-fullscreen">
          <div className="cliente-fullscreen-inner">
            <div className="fs-header">
              <div className="fs-title">
                <User size={22} />
                <h2>{editingCustomer ? 'Editar cliente' : 'Novo cliente'}</h2>
              </div>
              <button type="button" className="fs-close" onClick={() => setEditOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="fs-tabs">
              {EDIT_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`fs-tab ${editTab === tab ? 'active' : ''}`}
                  onClick={() => setEditTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <form
              className="fs-body wide"
              onSubmit={(e) => handleSaveCustomer(e, false)}
              noValidate
            >
              <div className="fs-scroll">
              {editTab === 'PRINCIPAL' && (
                <div className="fs-grid principal-grid">
                  <div className="form-group">
                    <label>Status:</label>
                    <select name="status" value={formData.status} onChange={handleChange}>
                      <option>Ativo</option>
                      <option>Inativo</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>
                      Login ou Email:
                      <Info size={14} className="label-info" title="Usado para acesso ao sistema" />
                    </label>
                    <input
                      type="text"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="email@exemplo.com"
                    />
                  </div>

                  <div className="form-group">
                    <label>Grupo*</label>
                    <select name="group" value={formData.group} onChange={handleChange}>
                      <option>Usuário</option>
                      <option>Administrador</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Data de validade:</label>
                    <div className="field-with-toggle">
                      <ToggleSwitch checked={expiryEnabled} onChange={setExpiryEnabled} />
                      <input
                        type="date"
                        name="expiry_date"
                        value={formData.expiry_date}
                        onChange={handleChange}
                        disabled={!expiryEnabled}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Limite de dispositivos:</label>
                    <div className="field-with-toggle">
                      <ToggleSwitch checked={limitEnabled} onChange={setLimitEnabled} />
                      <input
                        type="number"
                        min="0"
                        name="device_limit"
                        value={formData.device_limit}
                        onChange={handleChange}
                        disabled={!limitEnabled}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Confirmação de Senha:</label>
                    <div className="password-field">
                      <input
                        type={showPasswordConfirm ? 'text' : 'password'}
                        name="password_confirm"
                        value={formData.password_confirm}
                        onChange={handleChange}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="pwd-eye"
                        onClick={() => setShowPasswordConfirm((v) => !v)}
                        aria-label="Mostrar senha"
                      >
                        {showPasswordConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Senha:</label>
                    <div className="password-field">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="pwd-eye"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label="Mostrar senha"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <ul className="pwd-rules">
                      {passwordChecks.map((rule) => (
                        <li key={rule.label} className={rule.ok ? 'ok' : 'bad'}>
                          {rule.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          <span>{rule.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {editTab === 'CLIENTE' && (
                <div className="cliente-dados">
                  <div className="cliente-dados-title">
                    <User size={18} />
                    <span>Dados do Cliente</span>
                  </div>

                  <div className="form-group">
                    <label>CPF/CNPJ:</label>
                    <input type="text" name="cpf_cnpj" value={formData.cpf_cnpj} onChange={handleChange} />
                  </div>

                  <div className="fs-grid three">
                    <div className="form-group">
                      <label>Nome/Razão Social:</label>
                      <input type="text" name="name" value={formData.name} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label>Nome para Contrato:</label>
                      <input
                        type="text"
                        name="contract_name"
                        value={formData.contract_name}
                        onChange={handleChange}
                        placeholder="Usa a razão social se vazio"
                      />
                    </div>
                    <div className="form-group">
                      <label>RG:</label>
                      <input type="text" name="rg" value={formData.rg} onChange={handleChange} />
                    </div>
                  </div>

                  <div className="fs-grid birth-cep-row">
                    <div className="form-group">
                      <label>Data de nascimento:</label>
                      <input type="date" name="birth_date" value={formData.birth_date} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label>CEP:</label>
                      <input type="text" name="postal_code" value={formData.postal_code} onChange={handleChange} />
                    </div>
                  </div>

                  <div className="fs-grid address-row">
                    <div className="form-group">
                      <label>Endereço:</label>
                      <input type="text" name="address" value={formData.address} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label>Nº:</label>
                      <input type="text" name="address_number" value={formData.address_number} onChange={handleChange} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Complemento:</label>
                    <input type="text" name="complement" value={formData.complement} onChange={handleChange} />
                  </div>

                  <div className="fs-grid three">
                    <div className="form-group">
                      <label>Bairro:</label>
                      <input type="text" name="province" value={formData.province} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label>Cidade:</label>
                      <input type="text" name="city" value={formData.city} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label>Estado:</label>
                      <input type="text" name="state" value={formData.state} onChange={handleChange} />
                    </div>
                  </div>

                  <div className="fs-grid three">
                    <div className="form-group">
                      <label>Celular:</label>
                      <input type="text" name="mobile_phone" value={formData.mobile_phone} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label>Valor mensalidade:</label>
                      <input
                        type="number"
                        step="0.01"
                        name="monthly_value"
                        value={formData.monthly_value}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="form-group">
                      <label>Fone fixo:</label>
                      <input type="text" name="phone" value={formData.phone} onChange={handleChange} />
                    </div>
                  </div>

                  <div className="fs-grid due-row">
                    <div className="form-group">
                      <label className="label-danger">Dia de vencimento (Fatura):</label>
                      <div className="due-day-with-notif">
                        <div className="select-with-icon">
                          <select name="due_day" value={formData.due_day} onChange={handleChange}>
                            <option value="">Selecione</option>
                            {[...Array(28).keys()].map((i) => (
                              <option key={i + 1} value={i + 1}>{i + 1}</option>
                            ))}
                          </select>
                          <Calendar size={16} className="select-icon" />
                        </div>
                        <div className="due-check-row">
                          <label className="asaas-notif-check" title="Desmarca todas as notificações de cobrança no Asaas (e-mail, SMS, WhatsApp)">
                            <input
                              type="checkbox"
                              checked={!!formData.disable_asaas_notifications}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  disable_asaas_notifications: e.target.checked,
                                }))
                              }
                            />
                            <span>Sem notificação Asaas</span>
                          </label>
                          <label className="asaas-notif-check" title="Gera assinatura mensal recorrente no Asaas ao enviar">
                            <input
                              type="checkbox"
                              checked={!!formData.recurring}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  recurring: e.target.checked,
                                }))
                              }
                            />
                            <span>Recorrência</span>
                          </label>
                        </div>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Email de Cobrança:</label>
                      <input
                        type="email"
                        name="billing_email"
                        value={formData.billing_email}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="form-group">
                      <label>Renda/Faturamento:</label>
                      <input
                        type="number"
                        step="0.01"
                        name="income"
                        value={formData.income}
                        onChange={handleChange}
                        placeholder="R$ 0,00"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Número para retorno de suporte:</label>
                    <input
                      type="text"
                      name="support_phone"
                      value={formData.support_phone}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Notas Administrativas:</label>
                    <textarea
                      name="admin_notes"
                      rows={3}
                      value={formData.admin_notes}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              )}

              {editTab === 'PERMISSÕES' && (
                <div className="perm-table-wrap">
                  <table className="perm-table">
                    <thead>
                      <tr>
                        <th>Permissão</th>
                        <th>Visão</th>
                        <th>Editar</th>
                        <th>Excluir</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PERMISSION_ROWS.map((row) => (
                        <tr key={row.key}>
                          <td>{row.label}</td>
                          <td>
                            <ToggleSwitch
                              checked={permissions[row.key]?.view}
                              onChange={() => togglePermission(row.key, 'view')}
                            />
                          </td>
                          <td>
                            <ToggleSwitch
                              checked={permissions[row.key]?.edit}
                              onChange={() => togglePermission(row.key, 'edit')}
                            />
                          </td>
                          <td>
                            <ToggleSwitch
                              checked={permissions[row.key]?.remove}
                              onChange={() => togglePermission(row.key, 'remove')}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {editTab === 'VEÍCULOS' && (
                <div className="devices-transfer">
                  <div className="devices-panel">
                    <div className="devices-panel-head">
                      <div>
                        <span className="devices-panel-title">Veículos disponíveis</span>
                        <p className="devices-panel-hint">Foto, nome e placa</p>
                      </div>
                      <span className="devices-total-pill">{availableDevices.length}</span>
                    </div>
                    <div className="devices-search-wrap">
                      <Search size={16} />
                      <input
                        type="search"
                        className="devices-search"
                        placeholder="Buscar por nome, placa ou IMEI..."
                        value={availableSearch}
                        onChange={(e) => {
                          setAvailableSearch(e.target.value);
                          setAvailablePage(1);
                        }}
                      />
                    </div>
                    <div className="devices-list">
                      {pagedAvailable.length === 0 ? (
                        <div className="devices-empty">
                          <CarIcon size={36} />
                          <span>Nenhum veículo disponível</span>
                        </div>
                      ) : (
                        pagedAvailable.map((d) => (
                          <VehiclePickRow
                            key={d.id}
                            device={d}
                            selected={selectedAvailable === d.id}
                            onSelect={() => setSelectedAvailable(d.id)}
                            onActivate={() => moveDeviceToLinked(d.id)}
                            action="add"
                          />
                        ))
                      )}
                    </div>
                    <div className="devices-pager">
                      <button
                        type="button"
                        disabled={availablePage <= 1}
                        onClick={() => setAvailablePage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="devices-page-label">
                        {availablePage} / {availableTotalPages}
                      </span>
                      <button
                        type="button"
                        disabled={availablePage >= availableTotalPages}
                        onClick={() => setAvailablePage((p) => Math.min(availableTotalPages, p + 1))}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="devices-actions">
                    <button type="button" className="xfer-btn" onClick={moveSelectedRight} title="Vincular selecionado">
                      <ChevronRight size={18} />
                    </button>
                    <button type="button" className="xfer-btn" onClick={moveSelectedLeft} title="Remover selecionado">
                      <ChevronLeft size={18} />
                    </button>
                    <button type="button" className="xfer-btn text" onClick={moveAllLeft} title="Remover todos">
                      &lt; Todos
                    </button>
                    <button type="button" className="xfer-btn text" onClick={moveAllRight} title="Vincular todos">
                      Todos &gt;
                    </button>
                  </div>

                  <div className="devices-panel linked">
                    <div className="devices-panel-head">
                      <div>
                        <span className="devices-panel-title">Veículos vinculados</span>
                        <p className="devices-panel-hint">Associados a este cliente</p>
                      </div>
                      <span className="devices-total-pill accent">{linkedDevices.length}</span>
                    </div>
                    <div className="devices-search-wrap">
                      <Search size={16} />
                      <input
                        type="search"
                        className="devices-search"
                        placeholder="Buscar vinculados..."
                        value={linkedSearch}
                        onChange={(e) => setLinkedSearch(e.target.value)}
                      />
                    </div>
                    <div className="devices-list">
                      {linkedDevices.length === 0 ? (
                        <div className="devices-empty">
                          <CarIcon size={36} />
                          <span>Nenhum veículo vinculado</span>
                          <small>Use + ou arraste da lista ao lado</small>
                        </div>
                      ) : (
                        linkedDevices.map((d) => (
                          <VehiclePickRow
                            key={d.id}
                            device={d}
                            selected={selectedLinked === d.id}
                            onSelect={() => setSelectedLinked(d.id)}
                            onActivate={() => moveDeviceToAvailable(d.id)}
                            action="remove"
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {editTab === 'APP' && (
                <div className="app-tab">
                  <div className="app-perm-list">
                    {APP_FEATURES.map((item) => (
                      <div key={item.key} className="app-perm-row">
                        <ToggleSwitch
                          checked={!!appSettings[item.key]}
                          onChange={(v) => setAppSettings((prev) => ({ ...prev, [item.key]: v }))}
                        />
                        <div className="app-perm-text">
                          <div className="app-perm-title-row">
                            <strong>{item.label}</strong>
                            {item.hasGear && (
                              <button
                                type="button"
                                className="app-gear-btn"
                                title="Configurações de Alertas"
                                onClick={() => setAlertModalOpen(true)}
                              >
                                <Settings size={16} />
                              </button>
                            )}
                          </div>
                          <span>Possui acesso à {item.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              </div>

              <div className="fs-footer">
                <button type="button" className="btn-cancel" onClick={() => setEditOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-save" disabled={isLoading}>
                  <Check size={16} /> {isLoading ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  type="button"
                  className="btn-save-asaas"
                  disabled={isLoading}
                  onClick={(e) => handleSaveCustomer(e, true)}
                  title="Cria/atualiza o cliente no Asaas e gera fatura se houver mensalidade e dia de vencimento"
                >
                  <Send size={16} />
                  {isLoading ? 'Enviando...' : 'Salvar e enviar ao Asaas'}
                </button>
              </div>
            </form>
          </div>

          {alertModalOpen && (
            <div className="alert-cfg-overlay" onClick={() => setAlertModalOpen(false)}>
              <div
                className="alert-cfg-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="alert-cfg-title"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="alert-cfg-header">
                  <h3 id="alert-cfg-title">Configurações de Alertas</h3>
                  <button
                    type="button"
                    className="alert-cfg-close"
                    onClick={() => setAlertModalOpen(false)}
                    aria-label="Fechar"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="alert-cfg-list">
                  {ALERT_SETTINGS.map((item) => (
                    <div key={item.key} className="alert-cfg-row">
                      <ToggleSwitch
                        checked={!!alertSettings[item.key]}
                        onChange={(v) => setAlertSettings((prev) => ({ ...prev, [item.key]: v }))}
                      />
                      <div className="alert-cfg-text">
                        <strong>{item.label}</strong>
                        <span>Possui acesso à {item.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Clientes;
