import React, { useEffect, useMemo, useState } from 'react';
import './VeiculoForm.css';
import {
  Car, Edit, Search, ChevronDown, RefreshCw, BadgeCheck, Box,
  IdCard, X, Cpu, Copy, Link2, MapPin, List, Check, CircleDot,
  LayoutDashboard, CarFront, HardHat, Warehouse, Activity, Wrench,
  Bell, Trash2, Battery, Timer, Lock, Zap, Satellite,
  Wifi, Plug, KeyRound, RadioTower, Gauge, Power, Cog, Smartphone,
  HelpCircle, FolderOpen, BellOff, Plus, Building2, CalendarDays
} from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { id: 'default', name: 'Padrão' },
  { id: 'car', name: 'Carro' },
  { id: 'truck', name: 'Caminhão' },
  { id: 'bus', name: 'Ônibus' },
  { id: 'motorcycle', name: 'Moto' },
  { id: 'van', name: 'Van' },
  { id: 'pickup', name: 'Pick-up' },
  { id: 'tractor', name: 'Trator' }
];

const EMPTY_FORM = {
  name: '',
  uniqueId: '',
  iccid: '',
  groupId: 0,
  phone: '',
  model: '',
  contact: '',
  category: 'default',
  calendarId: 0,
  disabled: false,
  expirationTime: '2099-01-01T00:00:00Z',
  attributes: {
    foto: '',
    iccid: '',
    iconUrl: '',
    placa: '',
    combustivel: '',
    descricao: '',
    marca: '',
    ano: '',
    modeloVeiculo: '',
    cor: '',
    chassi: '',
    renavam: '',
    equipStatus: 'instalado',
    notasAdmin: '',
    customerName: '',
    customerId: '',
    fornecedor: '',
    operadora: '',
    apn: '',
    valorMensal: '',
    simAtivacao: '',
    simValidade: '',
    fabricanteRastreador: '',
    modeloRastreador: '',
    valorEquipamento: '',
    fusoHorario: 'America/Sao_Paulo',
    deteccaoIgnicao: '',
    fotoInstalacao: '',
    localInstalacao: '',
    dataInstalacao: '',
    tecnicoNome: ''
  }
};

const IDENTIFIED_SENSORS = [
  { id: 'bateriaNivel', name: 'Bateria (nível)', icon: Battery, value: '—' },
  { id: 'alimentacao', name: 'Alimentação', icon: Plug, value: '—' },
  { id: 'horimetro', name: 'Horímetro', icon: Timer, value: '—' },
  { id: 'ignicao', name: 'Ignição', icon: KeyRound, value: '—' },
  { id: 'bloqueio', name: 'Bloqueio', icon: Lock, value: '—' },
  { id: 'conectividade', name: 'Conectividade', icon: RadioTower, value: '—' },
  { id: 'carregando', name: 'Carregando', icon: Zap, value: '—' },
  { id: 'velocidade', name: 'Velocidade', icon: Gauge, value: '—' },
  { id: 'satelites', name: 'Satélites', icon: Satellite, value: '—' },
  { id: 'bateria', name: 'Bateria', icon: Battery, value: '—' },
  { id: 'odometro', name: 'Odômetro', icon: Gauge, value: '—' },
  { id: 'energia', name: 'Energia', icon: Power, value: '—' },
  { id: 'rede', name: 'Rede', icon: Wifi, value: '—' },
  { id: 'motor', name: 'Motor', icon: Cog, value: '—' },
  { id: 'operadoraSensor', name: 'Operadora', icon: Smartphone, value: '—' },
  { id: 'voltmetro', name: 'Voltímetro', icon: Activity, value: '—' },
];

const VeiculoForm = ({ mode = 'create', deviceId = null, onBack }) => {
  const isEdit = mode === 'edit';
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState([]);
  const [calendars, setCalendars] = useState([]);
  const [vehicleIcons, setVehicleIcons] = useState([]);
  const [mapIcons, setMapIcons] = useState([]);
  const [users, setUsers] = useState([]);
  const [userQuery, setUserQuery] = useState('');
  const [showUserList, setShowUserList] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [formTab, setFormTab] = useState('principal');
  const [formErrors, setFormErrors] = useState({});
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [sensorView, setSensorView] = useState('meus');
  const [deviceAlerts, setDeviceAlerts] = useState([]);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [lookingUpPlate, setLookingUpPlate] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const safeJson = async (res) => {
          if (!res || !res.ok) return null;
          try {
            return await res.json();
          } catch {
            return null;
          }
        };

        const [groupRes, calRes, iconsRes, usersRes, mapIconsRes] = await Promise.all([
          fetch('/api/traccar/entity/groups/').catch(() => null),
          fetch('/api/traccar/entity/calendars/').catch(() => null),
          fetch('/api/vehicle-icons/').catch(() => null),
          fetch('/api/auth/users/').catch(() => null),
          fetch('/incon/manifest.json').catch(() => null),
        ]);

        const groupsData = await safeJson(groupRes);
        const calendarsData = await safeJson(calRes);
        const vehicleIconsData = await safeJson(iconsRes);
        const usersData = await safeJson(usersRes);
        const mapFiles = await safeJson(mapIconsRes);

        setGroups(Array.isArray(groupsData) ? groupsData : []);
        setCalendars(Array.isArray(calendarsData) ? calendarsData : []);
        setVehicleIcons(Array.isArray(vehicleIconsData) ? vehicleIconsData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
        setMapIcons(
          (Array.isArray(mapFiles) ? mapFiles : []).map((file) => ({
            id: file,
            name: String(file).replace(/\.[^.]+$/, ''),
            url: `/incon/${encodeURIComponent(file)}`,
          }))
        );

        if (isEdit && deviceId) {
          const devRes = await fetch('/api/traccar/devices/?all=true').catch(() => null);
          const devices = await safeJson(devRes);
          const v = (Array.isArray(devices) ? devices : []).find((d) => String(d.id) === String(deviceId));
          if (!v) {
            toast.error('Veículo não encontrado.');
            onBack?.();
            return;
          }
          setFormData({
            name: v.name || '',
            uniqueId: v.uniqueId || '',
            iccid: v.attributes?.iccid || '',
            groupId: v.groupId || 0,
            phone: v.phone || '',
            model: v.model || '',
            contact: v.contact || '',
            category: v.category || 'default',
            calendarId: v.calendarId || 0,
            disabled: v.disabled || false,
            expirationTime: v.expirationTime || '2099-01-01T00:00:00Z',
            attributes: {
              ...EMPTY_FORM.attributes,
              ...(v.attributes || {}),
              foto: v.attributes?.foto || '',
              iccid: v.attributes?.iccid || '',
              iconUrl: v.attributes?.iconUrl || '',
              placa: v.attributes?.placa || '',
              combustivel: v.attributes?.combustivel || '',
              descricao: v.attributes?.descricao || v.name || '',
              marca: v.attributes?.marca || '',
              ano: v.attributes?.ano || '',
              modeloVeiculo: v.attributes?.modeloVeiculo || '',
              cor: v.attributes?.cor || '',
              chassi: v.attributes?.chassi || '',
              renavam: v.attributes?.renavam || '',
              equipStatus: v.attributes?.equipStatus || 'instalado',
              notasAdmin: v.attributes?.notasAdmin || '',
              customerName: v.attributes?.customerName || v.attributes?.clienteNome || '',
              customerId: v.attributes?.customerId || ''
            }
          });
          if (v.attributes?.customerName) setUserQuery(v.attributes.customerName);

          const alertRes = await fetch('/api/traccar/notifications/').catch(() => null);
          const alertsData = await safeJson(alertRes);
          setDeviceAlerts(Array.isArray(alertsData) ? alertsData : []);
        }

        if (!Array.isArray(mapFiles) || mapFiles.length === 0) {
          console.warn('Manifest de ícones /incon/manifest.json indisponível neste ambiente.');
        }
      } catch (err) {
        console.error(err);
        toast.error('Erro ao carregar dados do formulário.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isEdit, deviceId, onBack]);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return users.slice(0, 8);
    return users
      .filter((u) =>
        `${u.name || ''} ${u.email || ''}`.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [users, userQuery]);

  const updateAttr = (patch) => {
    setFormData((prev) => ({
      ...prev,
      attributes: { ...prev.attributes, ...patch }
    }));
  };

  const handleFileUpload = async (e, attrKey = 'foto') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2 MB.');
      return;
    }

    const uploadData = new FormData();
    uploadData.append('photo', file);

    try {
      const response = await fetch('/api/traccar/upload-photo/', {
        method: 'POST',
        body: uploadData
      });
      const data = await response.json();
      if (!response.ok || !data.url) {
        toast.error(data.error || 'Falha no upload da foto.');
        return;
      }
      updateAttr({ [attrKey]: data.url });
      toast.success('Foto atualizada.');
    } catch (err) {
      console.error(err);
      toast.error('Erro no upload da foto.');
    }
  };

  const copyText = async (value, label = 'Valor') => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado.`);
    } catch {
      toast.error('Não foi possível copiar.');
    }
  };

  const copyUniqueId = () => copyText(formData.uniqueId, 'IMEI');

  const goToAlertas = () => {
    localStorage.setItem('activeItem', 'Alertas');
    window.history.pushState(null, '', '/alertas');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleDeleteDevice = async () => {
    if (!isEdit || !deviceId) {
      toast.error('Salve o dispositivo antes de excluir.');
      return;
    }
    if (deleteConfirm.trim().toUpperCase() !== 'EXCLUIR') {
      toast.error('Digite EXCLUIR para confirmar.');
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/traccar/devices/${deviceId}/`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Dispositivo excluído.');
        onBack?.();
      } else {
        const errData = await response.json().catch(() => ({}));
        toast.error(errData.error || 'Não foi possível excluir o dispositivo.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao excluir.');
    } finally {
      setDeleting(false);
    }
  };

  const mapCombustivel = (raw) => {
    const value = String(raw || '').toUpperCase();
    if (value.includes('ELETR')) return 'eletrico';
    if (value.includes('DIESEL')) return 'diesel';
    if (value.includes('GNV')) return 'gnv';
    if ((value.includes('ALCOOL') || value.includes('ETANOL')) && value.includes('GASOLINA')) return 'flex';
    if (value.includes('ALCOOL') || value.includes('ETANOL')) return 'etanol';
    if (value.includes('FLEX')) return 'flex';
    if (value.includes('GASOLINA')) return 'gasolina';
    return '';
  };

  const mapCategory = (segmento, fallback = 'default') => {
    const value = String(segmento || '').toUpperCase();
    if (value.includes('MOTO')) return 'motorcycle';
    if (value.includes('CAMIN')) return 'truck';
    if (value.includes('ONIB') || value.includes('BUS')) return 'bus';
    if (value.includes('VAN')) return 'van';
    if (value.includes('AUTO') || value.includes('CARRO')) return 'car';
    return fallback;
  };

  const lookupPlacaFipe = async () => {
    const placa = String(formData.attributes.placa || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const token = (localStorage.getItem('placaFipeToken') || '').replace(/^["']|["']$/g, '').replace(/\s+/g, '');
    if (!token) {
      toast.error('Configure o token da consulta de placa em Integrações.');
      return;
    }
    if (placa.length < 7) {
      toast.error('Informe a placa antes de consultar.');
      return;
    }

    setLookingUpPlate(true);
    try {
      const response = await fetch('/api/placafipe/lookup/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placa, token })
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || 'Não foi possível consultar a placa.');
        return;
      }

      const descricao = formData.attributes.descricao || [data.marca, data.modelo].filter(Boolean).join(' ');
      setFormData((prev) => ({
        ...prev,
        name: prev.name || descricao || prev.attributes.placa,
        category: mapCategory(data.segmento, prev.category),
        attributes: {
          ...prev.attributes,
          placa: String(data.placa || placa).replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 7),
          marca: data.marca || prev.attributes.marca,
          modeloVeiculo: data.modelo || prev.attributes.modeloVeiculo,
          ano: String(data.ano || prev.attributes.ano || '').replace(/\D/g, '').slice(0, 4),
          cor: data.cor || prev.attributes.cor,
          chassi: data.chassi || prev.attributes.chassi,
          combustivel: mapCombustivel(data.combustivel) || prev.attributes.combustivel,
          descricao: descricao || prev.attributes.descricao,
          municipio: data.municipio || prev.attributes.municipio,
          uf: data.uf || prev.attributes.uf,
          segmento: data.segmento || prev.attributes.segmento
        }
      }));
      toast.success('Dados do veículo preenchidos pela consulta de placa.');
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao consultar a placa.');
    } finally {
      setLookingUpPlate(false);
    }
  };

  const handleSave = async () => {
    const errors = {};
    const descricao = (formData.attributes.descricao || '').trim();
    const autoName = [formData.attributes.marca, formData.attributes.modeloVeiculo].filter(Boolean).join(' ').trim();
    const normalizedName = (formData.name || descricao || autoName || formData.attributes.placa || '').trim();
    const normalizedUniqueId = formData.uniqueId.trim();
    const normalizedIccid = formData.iccid.trim();
    const normalizedPhone = formData.phone.trim();

    if (!normalizedName) errors.name = 'Informe o modelo, a marca ou a placa do veículo.';
    if (!normalizedUniqueId) {
      errors.uniqueId = 'Este campo é obrigatório.';
    } else if (!/^\d+$/.test(normalizedUniqueId)) {
      errors.uniqueId = 'IMEI/ID deve conter apenas números.';
    } else if (normalizedUniqueId.length < 8 || normalizedUniqueId.length > 20) {
      errors.uniqueId = 'IMEI/ID deve ter entre 8 e 20 dígitos.';
    }

    if (normalizedIccid) {
      if (!/^\d+$/.test(normalizedIccid)) errors.iccid = 'ICCID deve conter apenas números.';
      else if (normalizedIccid.length < 19 || normalizedIccid.length > 20) errors.iccid = 'ICCID deve ter 19 ou 20 dígitos.';
    }

    if (normalizedPhone) {
      if (!/^\d+$/.test(normalizedPhone)) errors.phone = 'Número do chip deve conter apenas números.';
      else if (normalizedPhone.length < 10 || normalizedPhone.length > 13) errors.phone = 'Número do chip deve ter entre 10 e 13 dígitos.';
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      if (errors.uniqueId || errors.phone) setFormTab('principal');
      if (errors.iccid) setFormTab('hardware');
      toast.error('Revise os campos obrigatórios.');
      return;
    }

    const url = isEdit ? `/api/traccar/devices/${deviceId}/` : '/api/traccar/devices/';
    const method = isEdit ? 'PUT' : 'POST';
    const { iccid, ...restFormData } = formData;

    const submissionData = {
      ...restFormData,
      name: normalizedName,
      uniqueId: normalizedUniqueId,
      groupId: parseInt(formData.groupId, 10) || 0,
      calendarId: parseInt(formData.calendarId, 10) || 0,
      phone: normalizedPhone,
      attributes: {
        ...formData.attributes,
        descricao: descricao || normalizedName,
        iccid: normalizedIccid
      }
    };
    if (isEdit) submissionData.id = deviceId;

    setSaving(true);
    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      });

      if (response.ok) {
        toast.success(isEdit ? 'Veículo atualizado com sucesso!' : 'Veículo cadastrado com sucesso!');
        onBack?.();
      } else {
        const errData = await response.json().catch(() => ({}));
        toast.error(errData.error || 'Erro ao salvar o veículo.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao tentar salvar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="dcp">
        <div className="dcp-loading">Carregando dispositivo...</div>
      </div>
    );
  }

  return (
    <div className="dcp">
      <header className="dcp-head">
        <div className="dcp-head__left">
          <span className="dcp-head__icon" aria-hidden><Car size={20} /></span>
          <div>
            <h1>{isEdit ? 'Editar Dispositivo' : 'Criar Dispositivo'}</h1>
            <p>Dados do veículo, dispositivo, chip e configurações</p>
          </div>
        </div>
        <button type="button" className="dcp-close" onClick={onBack} title="Fechar">
          <X size={18} />
        </button>
      </header>

      <div className="dcp-tabs">
        <button type="button" className={`dcp-tab ${formTab === 'principal' ? 'active' : ''}`} onClick={() => setFormTab('principal')}>
          <LayoutDashboard size={15} /> Principal
        </button>
        <button type="button" className={`dcp-tab ${formTab === 'hardware' ? 'active' : ''}`} onClick={() => setFormTab('hardware')}>
          <Cpu size={15} /> Hardware e Simcard
        </button>
        <button type="button" className={`dcp-tab ${formTab === 'sensores' ? 'active' : ''}`} onClick={() => setFormTab('sensores')}>
          <Zap size={15} /> Sensores
        </button>
        <button type="button" className={`dcp-tab ${formTab === 'alertas' ? 'active' : ''}`} onClick={() => setFormTab('alertas')}>
          <Bell size={15} /> Alertas
        </button>
        <button type="button" className={`dcp-tab dcp-tab--danger ${formTab === 'excluir' ? 'active' : ''}`} onClick={() => setFormTab('excluir')}>
          <Trash2 size={15} /> Excluir Dispositivo
        </button>
      </div>

      <div className={`dcp-grid ${formTab === 'principal' ? '' : 'dcp-grid--full'}`}>
        {formTab === 'principal' && (
        <div className="dcp-col">
          <section className="dcp-card dcp-photo">
            <div className="dcp-photo__circle">
              {formData.attributes.foto
                ? <img src={formData.attributes.foto} alt="Foto do veículo" />
                : <Car size={46} strokeWidth={1.5} />}
              <label className="dcp-photo__edit" title="Alterar foto">
                <Edit size={13} />
                <input type="file" accept="image/png,image/jpeg,image/jpg" onChange={(e) => handleFileUpload(e, 'foto')} hidden />
              </label>
            </div>
            <span className="dcp-photo__hint">JPG, JPEG ou PNG - até 2 MB.</span>
            <button type="button" className="dcp-photo__btn" onClick={() => setShowIconPicker(true)}>
              {formData.attributes.iconUrl
                ? <img src={formData.attributes.iconUrl} alt="" className="dcp-photo__btn-icon" />
                : <MapPin size={15} />}
              Alterar ícone do mapa
            </button>
          </section>

          <section className="dcp-card">
            <span className="dcp-label"><IdCard size={15} /> Placa Mercosul</span>
            <div className="dcp-plate-row">
              <div className="dcp-plate">
                <div className="dcp-plate__top">
                  <span className="dcp-plate__star" />
                  BRASIL
                  <span className="dcp-plate__star" />
                </div>
                <div className="dcp-plate__body">
                  <span className="dcp-plate__br">
                    <span className="dcp-plate__flag" aria-hidden />
                    BR
                  </span>
                  <input
                    type="text"
                    placeholder="ABC1D23"
                    maxLength={7}
                    value={formData.attributes.placa || ''}
                    onChange={(e) => updateAttr({ placa: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7) })}
                  />
                </div>
              </div>
              <button type="button" className="dcp-refresh" title="Consultar placa" onClick={lookupPlacaFipe} disabled={lookingUpPlate}>
                {lookingUpPlate ? <RefreshCw size={18} className="is-open" /> : <Search size={18} />}
              </button>
            </div>
          </section>

          <section className="dcp-card">
            <div className="dcp-label" style={{ marginBottom: 12 }}>
              <List size={15} /> Dados principais do veículo
            </div>
            <div className="dcp-fields-2">
              <div className="dcp-field">
                <span>Modelo do Veículo</span>
                <input type="text" value={formData.attributes.modeloVeiculo || ''} onChange={(e) => {
                  updateAttr({ modeloVeiculo: e.target.value });
                  if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: undefined }));
                }} />
              </div>
              <div className="dcp-field">
                <span>Marca</span>
                <input type="text" value={formData.attributes.marca || ''} onChange={(e) => updateAttr({ marca: e.target.value })} />
              </div>
              <div className="dcp-field">
                <span>Ano</span>
                <input type="text" value={formData.attributes.ano || ''} onChange={(e) => updateAttr({ ano: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
              </div>
              <div className="dcp-field">
                <span>Cor do veículo</span>
                <input type="text" value={formData.attributes.cor || ''} onChange={(e) => updateAttr({ cor: e.target.value })} />
              </div>
              <div className="dcp-field">
                <span>Chassis</span>
                <input type="text" value={formData.attributes.chassi || ''} onChange={(e) => updateAttr({ chassi: e.target.value.toUpperCase() })} />
              </div>
              <div className="dcp-field">
                <span>Combustível</span>
                <select value={formData.attributes.combustivel || ''} onChange={(e) => updateAttr({ combustivel: e.target.value })}>
                  <option value="">Selecionar</option>
                  <option value="gasolina">Gasolina</option>
                  <option value="etanol">Etanol</option>
                  <option value="flex">Flex</option>
                  <option value="diesel">Diesel</option>
                  <option value="gnv">GNV</option>
                  <option value="eletrico">Elétrico</option>
                </select>
              </div>
            </div>
            {formErrors.name && <small className="dcp-error">{formErrors.name}</small>}
          </section>
        </div>
        )}

        <div className="dcp-col dcp-main">
          {formTab === 'principal' && (
            <>
              <section className="dcp-card">
                <div className="dcp-section-title"><Activity size={16} /> Selecione o Status do Equipamento</div>
                <div className="dcp-status">
                  <button type="button" className={`dcp-status-card ${formData.attributes.equipStatus === 'instalado' ? 'active' : ''}`} onClick={() => updateAttr({ equipStatus: 'instalado' })}>
                    <span className="dcp-status-icon"><CarFront size={20} /></span>
                    <div className="dcp-status-copy"><strong>Instalado</strong><span>No veículo do cliente.</span></div>
                  </button>
                  <button type="button" className={`dcp-status-card ${formData.attributes.equipStatus === 'tecnico' ? 'active' : ''}`} onClick={() => updateAttr({ equipStatus: 'tecnico' })}>
                    <span className="dcp-status-icon"><HardHat size={20} /></span>
                    <div className="dcp-status-copy"><strong>Com Técnico</strong><span>Em posse de um técnico.</span></div>
                  </button>
                  <button type="button" className={`dcp-status-card ${formData.attributes.equipStatus === 'estoque' ? 'active' : ''}`} onClick={() => updateAttr({ equipStatus: 'estoque' })}>
                    <span className="dcp-status-icon"><Warehouse size={20} /></span>
                    <div className="dcp-status-copy"><strong>Em Estoque</strong><span>Parado no estoque.</span></div>
                  </button>
                </div>
                {formData.attributes.equipStatus === 'instalado' && (
                  <div className="dcp-alert"><BadgeCheck size={16} /> Instalado no veículo do cliente. Vincule os usuários que terão acesso.</div>
                )}
                <div className="dcp-users">
                  <span className="dcp-users__caption">Usuários</span>
                  <div className="dcp-users__search">
                    <Search size={16} />
                    <input
                      type="text"
                      placeholder="Digite para encontrar"
                      value={userQuery}
                      onFocus={() => setShowUserList(true)}
                      onChange={(e) => {
                        setUserQuery(e.target.value);
                        setShowUserList(true);
                        if (!e.target.value) updateAttr({ customerName: '', customerId: '' });
                      }}
                    />
                    {formData.attributes.customerName && (
                      <button type="button" className="dcp-users__clear" onClick={() => { setUserQuery(''); updateAttr({ customerName: '', customerId: '' }); }}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {showUserList && (
                    <div className="dcp-users__list">
                      {filteredUsers.length === 0 && <div className="dcp-users__empty">Nenhum usuário encontrado.</div>}
                      {filteredUsers.map((user) => (
                        <button type="button" key={user.id} className="dcp-users__option" onClick={() => { setUserQuery(user.name); updateAttr({ customerName: user.name, customerId: String(user.id) }); setShowUserList(false); }}>
                          <div>{user.name}</div>
                          <small>{user.email}</small>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="dcp-card">
                <div className="dcp-section-title"><span className="dcp-id-icon"><IdCard size={13} /></span> Identificação</div>
                <div className="dcp-fields-2">
                  <div className="dcp-field">
                    <label><CircleDot size={12} /> IMEI do dispositivo ou ID</label>
                    <div className="dcp-input-wrap">
                      <input
                        type="text"
                        value={formData.uniqueId}
                        onChange={(e) => {
                          setFormData({ ...formData, uniqueId: e.target.value.replace(/\D/g, '') });
                          if (formErrors.uniqueId) setFormErrors({ ...formErrors, uniqueId: undefined });
                        }}
                      />
                      <button type="button" className="dcp-input-action" onClick={copyUniqueId}><Copy size={15} /></button>
                    </div>
                    <small className={formErrors.uniqueId ? 'dcp-error' : 'dcp-hint'}>{formErrors.uniqueId || 'Este campo é obrigatório'}</small>
                  </div>
                  <div className="dcp-field">
                    <label><Cpu size={12} /> Número SIM</label>
                    <div className="dcp-input-wrap">
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') });
                          if (formErrors.phone) setFormErrors({ ...formErrors, phone: undefined });
                        }}
                      />
                      <button type="button" className="dcp-input-action" onClick={() => setFormTab('hardware')}><Edit size={15} /></button>
                    </div>
                    {formErrors.phone && <small className="dcp-error">{formErrors.phone}</small>}
                    <button type="button" className="dcp-link" onClick={() => setFormTab('hardware')}>
                      <Link2 size={13} />
                      Editar em Hardware e Simcard
                    </button>
                  </div>
                </div>
              </section>

              <section className="dcp-card">
                <div className="dcp-section-title"><Box size={16} /> Grupo</div>
                <div className="dcp-fields-2">
                  <div className="dcp-field">
                    <label>Grupo</label>
                    <select value={formData.groupId} onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}>
                      <option value="0">Nenhum Grupo</option>
                      {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                  <div className="dcp-field">
                    <label>Data de validade</label>
                    <input
                      type="datetime-local"
                      value={formData.expirationTime ? formData.expirationTime.slice(0, 16) : ''}
                      onChange={(e) => setFormData({ ...formData, expirationTime: e.target.value ? `${e.target.value}:00Z` : '' })}
                    />
                  </div>
                </div>
              </section>

              <section className="dcp-card">
                <button type="button" className="dcp-notes-btn" onClick={() => setShowNotes((v) => !v)}>
                  <span><Edit size={14} /> Observações</span>
                  <ChevronDown size={16} className={showNotes ? 'is-open' : ''} />
                </button>
                {showNotes && (
                  <div className="dcp-field" style={{ marginTop: 12 }}>
                    <textarea rows={4} placeholder="Observações internas..." value={formData.attributes.notasAdmin || ''} onChange={(e) => updateAttr({ notasAdmin: e.target.value })} />
                  </div>
                )}
              </section>
            </>
          )}

          {formTab === 'hardware' && (
            <>
              <section className="dcp-card">
                <div className="dcp-section-title"><Building2 size={16} /> Operadora</div>
                <div className="dcp-fields-2">
                  <div className="dcp-field">
                    <label>Fornecedor</label>
                    <input type="text" value={formData.attributes.fornecedor || formData.contact || ''} onChange={(e) => { updateAttr({ fornecedor: e.target.value }); setFormData((prev) => ({ ...prev, contact: e.target.value })); }} />
                  </div>
                  <div className="dcp-field">
                    <label>Operadora</label>
                    <input type="text" value={formData.attributes.operadora || ''} onChange={(e) => updateAttr({ operadora: e.target.value })} />
                  </div>
                </div>
              </section>

              <section className="dcp-card">
                <div className="dcp-section-title"><Cpu size={16} /> ICCID</div>
                <div className="dcp-fields-2">
                  <div className="dcp-field">
                    <label>ICCID</label>
                    <input type="text" value={formData.iccid} onChange={(e) => { setFormData({ ...formData, iccid: e.target.value.replace(/\D/g, '') }); if (formErrors.iccid) setFormErrors({ ...formErrors, iccid: undefined }); }} />
                    {formErrors.iccid && <small className="dcp-error">{formErrors.iccid}</small>}
                  </div>
                  <div className="dcp-field">
                    <label>Número SIM</label>
                    <div className="dcp-input-wrap">
                      <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })} />
                      <button type="button" className="dcp-input-action" onClick={() => copyText(formData.phone, 'Número SIM')}><Copy size={15} /></button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="dcp-card">
                <div className="dcp-section-title"><Wifi size={16} /> APN</div>
                <div className="dcp-fields-2">
                  <div className="dcp-field">
                    <label>APN</label>
                    <input type="text" value={formData.attributes.apn || ''} onChange={(e) => updateAttr({ apn: e.target.value })} />
                  </div>
                  <div className="dcp-field">
                    <label>Valor mensal</label>
                    <input type="text" value={formData.attributes.valorMensal || ''} onChange={(e) => updateAttr({ valorMensal: e.target.value })} />
                  </div>
                </div>
              </section>

              <section className="dcp-card">
                <div className="dcp-section-title"><CalendarDays size={16} /> Data de ativação do SIM</div>
                <div className="dcp-fields-2">
                  <div className="dcp-field">
                    <label>Data de ativação do SIM</label>
                    <input type="date" value={formData.attributes.simAtivacao || ''} onChange={(e) => updateAttr({ simAtivacao: e.target.value })} />
                  </div>
                  <div className="dcp-field">
                    <label>Data de validade do SIM</label>
                    <input type="date" value={formData.attributes.simValidade || ''} onChange={(e) => updateAttr({ simValidade: e.target.value })} />
                  </div>
                </div>
              </section>

              <div className="dcp-hw-split">
                <section className="dcp-card">
                  <div className="dcp-section-title"><Cpu size={16} /> Modelo do rastreador</div>
                  <div className="dcp-fields-2">
                    <div className="dcp-field">
                      <label>Fabricante do rastreador</label>
                      <input type="text" value={formData.attributes.fabricanteRastreador || ''} onChange={(e) => updateAttr({ fabricanteRastreador: e.target.value })} />
                    </div>
                    <div className="dcp-field">
                      <label>Modelo do rastreador</label>
                      <input type="text" value={formData.attributes.modeloRastreador || formData.model || ''} onChange={(e) => { updateAttr({ modeloRastreador: e.target.value }); setFormData((prev) => ({ ...prev, model: e.target.value })); }} />
                    </div>
                    <div className="dcp-field">
                      <label>Valor do equipamento</label>
                      <input type="text" value={formData.attributes.valorEquipamento || ''} onChange={(e) => updateAttr({ valorEquipamento: e.target.value })} />
                    </div>
                    <div className="dcp-field">
                      <label>Calendário</label>
                      <select value={formData.calendarId} onChange={(e) => setFormData({ ...formData, calendarId: e.target.value })}>
                        <option value="0">Nenhum Calendário</option>
                        {calendars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="dcp-section-title" style={{ marginTop: 18 }}><KeyRound size={16} /> Detecção de ignição</div>
                  <div className="dcp-fields-2">
                    <div className="dcp-field">
                      <label>Definir fuso horário</label>
                      <select value={formData.attributes.fusoHorario || 'America/Sao_Paulo'} onChange={(e) => updateAttr({ fusoHorario: e.target.value })}>
                        <option value="America/Sao_Paulo">America/Sao_Paulo</option>
                        <option value="America/Manaus">America/Manaus</option>
                        <option value="America/Fortaleza">America/Fortaleza</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>
                    <div className="dcp-field">
                      <label>Detecção de ignição</label>
                      <select value={formData.attributes.deteccaoIgnicao || ''} onChange={(e) => updateAttr({ deteccaoIgnicao: e.target.value })}>
                        <option value="">Selecionar</option>
                        <option value="ignition">Ignição</option>
                        <option value="motion">Movimento</option>
                        <option value="acc">ACC</option>
                      </select>
                    </div>
                  </div>
                </section>

                <section className="dcp-card">
                  <div className="dcp-section-title"><MapPin size={16} /> Local da instalação</div>
                  <div className="dcp-install">
                    <div className="dcp-install__photo">
                      <div className="dcp-photo__circle">
                        {formData.attributes.fotoInstalacao
                          ? <img src={formData.attributes.fotoInstalacao} alt="Local da instalação" />
                          : <Wrench size={36} strokeWidth={1.5} />}
                        <label className="dcp-photo__edit" title="Alterar foto">
                          <Edit size={13} />
                          <input type="file" accept="image/png,image/jpeg,image/jpg" onChange={(e) => handleFileUpload(e, 'fotoInstalacao')} hidden />
                        </label>
                      </div>
                      <span className="dcp-photo__hint">Aceitamos jpeg, jpg ou png. Máximo 2 MB.</span>
                    </div>
                    <div className="dcp-install__fields">
                      <div className="dcp-field">
                        <label>Local da instalação</label>
                        <input type="text" value={formData.attributes.localInstalacao || ''} onChange={(e) => updateAttr({ localInstalacao: e.target.value })} />
                      </div>
                      <div className="dcp-field">
                        <label>Data de instalação</label>
                        <input type="date" value={formData.attributes.dataInstalacao || ''} onChange={(e) => updateAttr({ dataInstalacao: e.target.value })} />
                      </div>
                      <div className="dcp-field">
                        <label>Técnico</label>
                        <input type="text" value={formData.attributes.tecnicoNome || ''} onChange={(e) => updateAttr({ tecnicoNome: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}

          {formTab === 'sensores' && (
            <section className="dcp-card">
              <div className="dcp-card__row">
                <div className="dcp-section-title" style={{ marginBottom: 0 }}><Zap size={16} /> Sensores</div>
                <div className="dcp-pills">
                  <button type="button" className={`dcp-pill ${sensorView === 'meus' ? 'active' : ''}`} onClick={() => setSensorView('meus')}>Meus sensores</button>
                  <button type="button" className={`dcp-pill ${sensorView === 'grupos' ? 'active' : ''}`} onClick={() => setSensorView('grupos')}>Grupos</button>
                </div>
              </div>

              {sensorView === 'meus' ? (
                <>
                  <h4 className="dcp-subhead">Sensores do seu veículo</h4>
                  <div className="dcp-sensor-grid">
                    {IDENTIFIED_SENSORS.map((sensor) => {
                      const Icon = sensor.icon;
                      return (
                        <button type="button" key={sensor.id} className="dcp-sensor-card" onClick={() => toast('Edição de sensor em breve.')}>
                          <span className="dcp-status-icon"><Icon size={18} /></span>
                          <div className="dcp-status-copy">
                            <strong>{sensor.name}</strong>
                            <span>{formData.attributes[`sensor_${sensor.id}`] || sensor.value}</span>
                          </div>
                          <Edit size={15} />
                        </button>
                      );
                    })}
                  </div>

                  <h4 className="dcp-subhead">Não identificados</h4>
                  <div className="dcp-sensor-unknown">
                    <HelpCircle size={18} />
                    <div>
                      <strong>Sensor extra</strong>
                      <span>Nenhum sinal extra identificado neste dispositivo.</span>
                    </div>
                    <button type="button" className="dcp-btn dcp-btn--ghost" onClick={() => toast('Nomeie sensores extras após receber dados do rastreador.')}>
                      <Plus size={14} /> Nomear
                    </button>
                  </div>
                </>
              ) : (
                <div className="dcp-empty">
                  <Box size={28} />
                  <strong>Nenhum grupo de sensores</strong>
                  <span>Os grupos aparecerão aqui quando forem configurados.</span>
                </div>
              )}
            </section>
          )}

          {formTab === 'alertas' && (
            <>
              <section className="dcp-card">
                <div className="dcp-section-title"><Bell size={16} /> Alertas</div>
                <h4 className="dcp-subhead">Últimos alertas do veículo</h4>
                <div className="dcp-empty">
                  <BellOff size={28} />
                  <strong>Nenhum alerta recente</strong>
                  <span>Este veículo ainda não disparou alertas.</span>
                </div>
                <div className="dcp-divider" />
                <div className="dcp-card__row">
                  <h4 className="dcp-subhead" style={{ margin: 0 }}>Alertas configurados</h4>
                  <button type="button" className="dcp-btn dcp-btn--ghost" onClick={goToAlertas}>
                    <Plus size={14} /> Criar alerta
                  </button>
                </div>
                {deviceAlerts.length === 0 ? (
                  <div className="dcp-empty">
                    <Bell size={28} />
                    <strong>Nenhum alerta configurado</strong>
                    <span>Configure alertas para este veículo na tela de Alertas.</span>
                  </div>
                ) : (
                  <div className="dcp-alert-list">
                    {deviceAlerts.slice(0, 8).map((alert) => (
                      <div key={alert.id} className="dcp-alert-item">
                        <Bell size={16} />
                        <div>
                          <strong>{alert.description || alert.type}</strong>
                          <span>{alert.notificators || 'web'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
              <section className="dcp-card">
                <div className="dcp-section-title"><FolderOpen size={16} /> Auditoria</div>
                <div className="dcp-empty">
                  <FolderOpen size={28} />
                  <strong>Nenhum atendimento registrado</strong>
                  <span>Nenhum atendimento registrado para este veículo.</span>
                </div>
              </section>
            </>
          )}

          {formTab === 'excluir' && (
            <section className="dcp-card dcp-delete">
              <div className="dcp-section-title"><Trash2 size={16} /> Excluir Dispositivo</div>
              <p>Esta ação remove o dispositivo do sistema e não pode ser desfeita. Os dados históricos podem permanecer no servidor de rastreamento.</p>
              {!isEdit && <p className="dcp-hint">Salve o dispositivo antes de excluí-lo.</p>}
              <div className="dcp-field" style={{ maxWidth: 360 }}>
                <label>Digite EXCLUIR para confirmar</label>
                <input type="text" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="EXCLUIR" />
              </div>
              <button type="button" className="dcp-btn dcp-btn--danger" disabled={!isEdit || deleting} onClick={handleDeleteDevice}>
                <Trash2 size={16} />
                {deleting ? 'Excluindo...' : 'Excluir dispositivo'}
              </button>
            </section>
          )}

        </div>
      </div>

      {formTab !== 'excluir' && (
        <footer className="dcp-footer">
          <span>As alterações valem para todas as abas.</span>
          <div className="dcp-footer__actions">
            <button type="button" className="dcp-btn dcp-btn--ghost" onClick={onBack}>Cancelar</button>
            <button type="button" className="dcp-btn dcp-btn--primary" onClick={handleSave} disabled={saving}>
              <Check size={16} />
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </footer>
      )}

      {showIconPicker && (
        <div className="dcp-overlay" onClick={() => setShowIconPicker(false)}>
          <div className="dcp-modal dcp-modal--icons" onClick={(e) => e.stopPropagation()}>
            <div className="dcp-modal__head">
              <strong>Ícones do mapa</strong>
              <button type="button" onClick={() => setShowIconPicker(false)}><X size={16} /></button>
            </div>
            <div className="dcp-icon-grid">
              <button type="button" className={`dcp-icon-opt ${!formData.attributes.iconUrl ? 'active' : ''}`} onClick={() => { updateAttr({ iconUrl: '' }); setShowIconPicker(false); toast.success('Ícone padrão selecionado. Salve o veículo para aplicar.'); }} title="Padrão">
                <MapPin size={22} />
              </button>
              {mapIcons.map((icon) => (
                <button type="button" key={icon.id} className={`dcp-icon-opt ${formData.attributes.iconUrl === icon.url ? 'active' : ''}`} onClick={() => { updateAttr({ iconUrl: icon.url }); setShowIconPicker(false); toast.success('Ícone selecionado. Salve o veículo para aplicar no mapa.'); }} title={icon.name}>
                  <img src={icon.url} alt="" loading="lazy" />
                </button>
              ))}
              {vehicleIcons.map((icon) => (
                <button type="button" key={`api-${icon.id}`} className={`dcp-icon-opt ${formData.attributes.iconUrl === icon.image_url ? 'active' : ''}`} onClick={() => { updateAttr({ iconUrl: icon.image_url }); setShowIconPicker(false); toast.success('Ícone selecionado. Salve o veículo para aplicar no mapa.'); }} title={icon.name}>
                  <img src={icon.image_url} alt="" loading="lazy" />
                </button>
              ))}
            </div>
            {mapIcons.length === 0 && vehicleIcons.length === 0 && (
              <p className="dcp-icon-empty">Nenhum ícone encontrado em /incon.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VeiculoForm;
