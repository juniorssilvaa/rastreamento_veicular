import React, { useState, useEffect } from 'react';
import './Veiculos.css';
import Modal from '../components/Modal';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Car, Plus, Trash2, Edit, Camera,
  Search, Settings, ChevronDown, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

// Helper component to recenter map
const RecenterMap = ({ lat, lon }) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lon) {
      map.flyTo([lat, lon], 16, { animate: true });
    }
  }, [lat, lon, map]);
  return null;
};

const createSimplePin = (name, speed) => {
  return L.divIcon({
    className: 'custom-pin-root',
    html: `
      <div style="display:flex; align-items:center; background:white; padding:4px 8px; border-radius:20px; box-shadow:0 2px 5px rgba(0,0,0,0.3); white-space:nowrap;">
        <div style="width:10px; height:10px; background:#0ea5e9; border-radius:50%; margin-right:6px;"></div>
        <span style="font-size:12px; font-weight:bold; color:#374151;">${name || 'Veículo'}</span>
        <span style="font-size:12px; color:#DC2626; margin-left:6px;"><i style="margin-right:2px">🔑</i>${speed || 0} km/h</span>
      </div>
    `,
    iconSize: [120, 28],
    iconAnchor: [60, 14]
  });
};

const VehicleMiniMap = ({ vehicle, position }) => {
  if (!position) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>Localização indisponível</div>;
  }
  
  const speedKmh = Math.round((position.speed || 0) * 1.852);

  return (
    <div className="mini-map-wrapper">
      <div className="map-overlay-toolbar">
        <button className="map-overlay-btn">Acessos</button>
        <button className="map-overlay-btn">Alertas</button>
        <button className="map-overlay-btn">Enviar Comandos</button>
        <button className="map-overlay-btn">Logs</button>
        <button className="map-overlay-btn">Históricos</button>
        <button className="map-overlay-btn">Relatórios</button>
      </div>
      <MapContainer 
        center={[position.latitude, position.longitude]} 
        zoom={16} 
        style={{ height: '100%', width: '100%' }} 
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        <Marker 
          position={[position.latitude, position.longitude]} 
          icon={createSimplePin(vehicle.name, speedKmh)} 
        />
        <RecenterMap lat={position.latitude} lon={position.longitude} />
      </MapContainer>
    </div>
  );
};

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

const formatConnectionTime = (device, positions) => {
  const pos = positions[device.id];
  const dateStr = device.lastUpdate || pos?.serverTime || pos?.deviceTime;
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month} ${hours}:${minutes}`;
};

const Veiculos = () => {
  const [vehicles, setVehicles] = useState([]);
  const [groups, setGroups] = useState([]);
  const [calendars, setCalendars] = useState([]);
  const [positions, setPositions] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [expandedRowId, setExpandedRowId] = useState(null);

  const [formData, setFormData] = useState({
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
      iccid: ''
    }
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [devRes, groupRes, calRes, posRes] = await Promise.all([
        fetch('/api/traccar/devices/?all=true'),
        fetch('/api/traccar/entity/groups/'),
        fetch('/api/traccar/entity/calendars/'),
        fetch('/api/traccar/positions/')
      ]);

      const devs = await devRes.json();
      const posArr = await posRes.json();

      // Mapeia posições por deviceId para busca rápida
      const posMap = {};
      posArr.forEach(p => { posMap[p.deviceId] = p; });

      setVehicles(devs);
      setGroups(await groupRes.json());
      setCalendars(await calRes.json());
      setPositions(posMap);
    } catch (err) {
      console.error("Erro ao carregar dados iniciais:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append('photo', file);

    try {
      const response = await fetch('/api/traccar/upload-photo/', {
        method: 'POST',
        body: uploadData
      });
      const data = await response.json();
      setFormData({
        ...formData,
        attributes: { ...formData.attributes, foto: data.url }
      });
    } catch (err) {
      console.error("Erro no upload da foto:", err);
    }
  };

  const handleSave = async () => {
    const errors = {};
    const normalizedName = formData.name.trim();
    const normalizedUniqueId = formData.uniqueId.trim();
    const normalizedIccid = formData.iccid.trim();
    const normalizedPhone = formData.phone.trim();

    if (!normalizedName) {
      errors.name = 'Informe o nome do veículo.';
    }

    if (!normalizedUniqueId) {
      errors.uniqueId = 'Informe o identificador (IMEI/ID).';
    } else if (!/^\d+$/.test(normalizedUniqueId)) {
      errors.uniqueId = 'IMEI/ID deve conter apenas números.';
    } else if (normalizedUniqueId.length < 8 || normalizedUniqueId.length > 20) {
      errors.uniqueId = 'IMEI/ID deve ter entre 8 e 20 dígitos.';
    }

    if (normalizedIccid) {
      if (!/^\d+$/.test(normalizedIccid)) {
        errors.iccid = 'ICCID deve conter apenas números.';
      } else if (normalizedIccid.length < 19 || normalizedIccid.length > 20) {
        errors.iccid = 'ICCID deve ter 19 ou 20 dígitos.';
      }
    }

    if (normalizedPhone) {
      if (!/^\d+$/.test(normalizedPhone)) {
        errors.phone = 'Número do chip deve conter apenas números.';
      } else if (normalizedPhone.length < 10 || normalizedPhone.length > 13) {
        errors.phone = 'Número do chip deve ter entre 10 e 13 dígitos.';
      }
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    const url = editingId
      ? `/api/traccar/devices/${editingId}/`
      : '/api/traccar/devices/';

    const method = editingId ? 'PUT' : 'POST';

    // Garante que campos numéricos sejam números
    const { iccid, ...restFormData } = formData;
    const submissionData = {
      ...restFormData,
      name: normalizedName,
      uniqueId: normalizedUniqueId,
      groupId: parseInt(formData.groupId) || 0,
      calendarId: parseInt(formData.calendarId) || 0,
      phone: normalizedPhone,
      attributes: {
        ...formData.attributes,
        iccid: normalizedIccid
      }
    };

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      });

      if (response.ok) {
        toast.success(editingId ? "Veículo atualizado com sucesso!" : "Veículo cadastrado com sucesso!");
        setIsModalOpen(false);
        setEditingId(null);
        resetForm();
        fetchInitialData();
      } else {
        const errData = await response.json();
        toast.error(errData.error || "Erro ao salvar o veículo.");
      }
    } catch (err) {
      console.error("Erro ao salvar veículo:", err);
      toast.error("Erro de conexão ao tentar salvar.");
    }
  };

  const resetForm = () => {
    setFormErrors({});
    setFormData({
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
      attributes: { foto: '', iccid: '' }
    });
  };

  const handleEdit = (v) => {
    setFormErrors({});
    setEditingId(v.id);
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
        foto: v.attributes?.foto || '',
        iccid: v.attributes?.iccid || ''
      }
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Deseja realmente excluir este veículo?")) {
      try {
        const response = await fetch(`/api/traccar/devices/${id}/`, { method: 'DELETE' });
        if (response.ok) {
          toast.success("Veículo excluído com sucesso!");
          fetchInitialData();
        } else {
          toast.error("Erro ao excluir veículo.");
        }
      } catch (err) {
        console.error("Erro ao excluir veículo:", err);
        toast.error("Erro de conexão ao excluir.");
      }
    }
  };

  const filteredVehicles = vehicles.filter(v =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.uniqueId.includes(searchTerm)
  );

  return (
    <div className="veiculos-page">
      <div className="veiculos-header">
        <div className="header-left">
          <h1>Gestão de Veículos</h1>
          <p>Configure dispositivos, grupos e parâmetros do motor</p>
        </div>
        <div className="header-actions">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Buscar por nome ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn-add-veiculo" onClick={() => { setEditingId(null); resetForm(); setIsModalOpen(true); }}>
            <Plus size={20} />
            Novo Veículo
          </button>
        </div>
      </div>

      <div className="veiculos-container">
        {loading ? (
          <div className="loading-state">Sincronizando com motor Traccar...</div>
        ) : (
          <div className="table-responsive">
            <table className="veiculos-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}><input type="checkbox" className="table-checkbox" /></th>
                  <th style={{ width: 40 }}><Settings size={16} color="#9CA3AF" /></th>
                  <th>Veículo</th>
                  <th>IMEI</th>
                  <th>Simcard</th>
                  <th>Fornecedor Chip</th>
                  <th>Modelo Dispositivo</th>
                  <th>Conexão</th>
                  <th>Editar</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map(v => {
                  const isExpanded = expandedRowId === v.id;
                  const categoryName = CATEGORIES.find(c => c.id === v.category)?.name || v.category || 'Padrão';
                  
                  return (
                    <React.Fragment key={v.id}>
                      <tr className={isExpanded ? 'expanded-parent' : ''}>
                        <td><input type="checkbox" className="table-checkbox" /></td>
                        <td></td>
                        <td>
                          <div className="cell-name">
                            <div className="mini-thumb" style={{ borderRadius: '50%' }}>
                              {v.attributes?.foto ? <img src={v.attributes.foto} /> : <Car size={14} />}
                            </div>
                            <div>
                              <span>{v.name}</span>
                              <span className="cell-veiculo-subtitle">{categoryName}</span>
                            </div>
                          </div>
                        </td>
                        <td>{v.uniqueId}</td>
                        <td>{v.phone || '-'}</td>
                        <td style={{ textTransform: 'uppercase' }}>{v.contact || 'FEDERAL'}</td>
                        <td>{v.model || '-'}</td>
                        <td>{formatConnectionTime(v, positions)}</td>
                        <td>
                          <div className="actions-cell">
                            <button className="btn-edit-cell" onClick={() => handleEdit(v)} title="Editar"><Edit size={16} /></button>
                            <button className="btn-edit-cell" onClick={() => handleDelete(v.id)} title="Excluir" style={{ color: '#DC2626' }}><Trash2 size={16} /></button>
                            <button 
                              className={`btn-expand ${isExpanded ? 'expanded' : ''}`}
                              onClick={() => setExpandedRowId(isExpanded ? null : v.id)}
                            >
                              <ChevronDown size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="expanded-row">
                          <td colSpan="9">
                            <VehicleMiniMap vehicle={v} position={positions[v.id]} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filteredVehicles.length === 0 && (
          <div className="empty-state">Nenhum veículo encontrado para a busca.</div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Editar Veículo" : "Cadastrar Novo Veículo"}
      >
        <div className="veiculo-form-full">
          <div className="form-sections">
            {/* SEÇÃO 1: FOTO E BÁSICO */}
            <div className="section">
              <h3>Identificação</h3>
              <div className="main-row">
                <div className="photo-side">
                  <div className="preview-sq">
                    {formData.attributes.foto ? <img src={formData.attributes.foto} /> : <Camera size={32} />}
                  </div>
                  <label className="btn-up-v2">
                    Mudar Foto
                    <input type="file" onChange={handleFileUpload} hidden />
                  </label>
                </div>
                <div className="fields-side">
                  <div className="input-box">
                    <label>Nome do Veículo</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    {formErrors.name && <small style={{ color: '#dc2626' }}>{formErrors.name}</small>}
                  </div>
                  <div className="input-box">
                    <label>Identificador (IMEI/ID)</label>
                    <input
                      type="text"
                      value={formData.uniqueId}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setFormData({ ...formData, uniqueId: value });
                        if (formErrors.uniqueId) setFormErrors({ ...formErrors, uniqueId: undefined });
                      }}
                    />
                    {formErrors.uniqueId && <small style={{ color: '#dc2626' }}>{formErrors.uniqueId}</small>}
                  </div>
                  <div className="input-box">
                    <label>ICCID (chip)</label>
                    <input
                      type="text"
                      value={formData.iccid}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setFormData({ ...formData, iccid: value });
                        if (formErrors.iccid) setFormErrors({ ...formErrors, iccid: undefined });
                      }}
                    />
                    {formErrors.iccid && <small style={{ color: '#dc2626' }}>{formErrors.iccid}</small>}
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: ADICIONAL */}
            <div className="section">
              <h3>Configurações Adicionais</h3>
              <div className="form-grid-v2">
                <div className="input-box">
                  <label>Grupo</label>
                  <select value={formData.groupId} onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}>
                    <option value="0">Nenhum Grupo</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div className="input-box">
                  <label>Número do chip</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setFormData({ ...formData, phone: value });
                      if (formErrors.phone) setFormErrors({ ...formErrors, phone: undefined });
                    }}
                  />
                  {formErrors.phone && <small style={{ color: '#dc2626' }}>{formErrors.phone}</small>}
                </div>
                <div className="input-box">
                  <label>Modelo</label>
                  <input type="text" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} />
                </div>
                <div className="input-box">
                  <label>Contato</label>
                  <input type="text" value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} />
                </div>
                <div className="input-box">
                  <label>Categoria</label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="input-box">
                  <label>Calendário</label>
                  <select value={formData.calendarId} onChange={(e) => setFormData({ ...formData, calendarId: e.target.value })}>
                    <option value="0">Nenhum Calendário</option>
                    {calendars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="input-box">
                  <label>Validade</label>
                  <input
                    type="datetime-local"
                    value={formData.expirationTime ? formData.expirationTime.slice(0, 16) : ''}
                    onChange={(e) => setFormData({ ...formData, expirationTime: e.target.value + ":00Z" })}
                  />
                </div>
                <div className="input-box check-box-v2">
                  <label>
                    <input type="checkbox" checked={formData.disabled} onChange={(e) => setFormData({ ...formData, disabled: e.target.checked })} />
                    Dispositivo Desativado
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-actions-v2">
            <button className="btn-confirm-v2" onClick={handleSave}>SALVAR</button>
            <button className="btn-cancel-v2" onClick={() => setIsModalOpen(false)}>Cancelar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Veiculos;
