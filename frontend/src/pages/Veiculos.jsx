import React, { useState, useEffect } from 'react';
import './Veiculos.css';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Car, Plus, Trash2, Edit, Settings, ChevronDown, MapPin, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

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
        <span style="font-size:12px; color:#DC2626; margin-left:6px;">${speed || 0} km/h</span>
      </div>
    `,
    iconSize: [120, 28],
    iconAnchor: [60, 14]
  });
};

const VehicleMiniMap = ({ vehicle, position, loadingPosition, onRetry }) => {
  if (loadingPosition) {
    return (
      <div className="mini-map-empty">
        <RefreshCw size={20} className="mini-map-empty__spin" />
        <strong>Buscando localização...</strong>
        <span>Consultando a última posição no Traccar.</span>
      </div>
    );
  }

  if (!position?.latitude || !position?.longitude) {
    const statusLabel = vehicle?.status === 'online' ? 'online' : 'offline';
    return (
      <div className="mini-map-empty">
        <MapPin size={22} />
        <strong>Localização indisponível</strong>
        <span>
          O dispositivo está {statusLabel} e ainda não enviou posição GPS ao Traccar.
        </span>
        <span className="mini-map-empty__hint">
          Confira se o rastreador está ligado, com chip ativo e IMEI {vehicle?.uniqueId || '—'} cadastrado corretamente.
        </span>
        <button type="button" className="mini-map-empty__btn" onClick={onRetry}>
          <RefreshCw size={14} /> Tentar novamente
        </button>
      </div>
    );
  }

  const speedKmh = Math.round((position.speed || 0) * 1.852);

  return (
    <div className="mini-map-wrapper">
      <div className="map-overlay-toolbar">
        <button type="button" className="map-overlay-btn">Acessos</button>
        <button type="button" className="map-overlay-btn">Alertas</button>
        <button type="button" className="map-overlay-btn">Enviar Comandos</button>
        <button type="button" className="map-overlay-btn">Logs</button>
        <button type="button" className="map-overlay-btn">Históricos</button>
        <button type="button" className="map-overlay-btn">Relatórios</button>
      </div>
      <MapContainer
        center={[position.latitude, position.longitude]}
        zoom={16}
        maxZoom={21}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
          subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          maxNativeZoom={21}
          maxZoom={21}
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
  if (!dateStr) {
    return device.status === 'online' ? 'Online' : 'Sem comunicação';
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return device.status === 'online' ? 'Online' : 'Sem comunicação';
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month} ${hours}:${minutes}`;
};

const Veiculos = ({ onCreate, onEdit }) => {
  const [vehicles, setVehicles] = useState([]);
  const [positions, setPositions] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingPositionId, setLoadingPositionId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRowId, setExpandedRowId] = useState(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const mergePositions = (posArr) => {
    const posMap = {};
    (Array.isArray(posArr) ? posArr : []).forEach((p) => {
      if (p?.deviceId != null) posMap[p.deviceId] = p;
    });
    return posMap;
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [devRes, posRes] = await Promise.all([
        fetch('/api/traccar/devices/?all=true'),
        fetch('/api/traccar/positions/')
      ]);

      const devs = await devRes.json();
      const posArr = posRes.ok ? await posRes.json() : [];

      setVehicles(Array.isArray(devs) ? devs : []);
      setPositions(mergePositions(posArr));
    } catch (err) {
      console.error('Erro ao carregar dados iniciais:', err);
      toast.error('Não foi possível carregar os veículos.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPositionForDevice = async (deviceId) => {
    setLoadingPositionId(deviceId);
    try {
      const posRes = await fetch('/api/traccar/positions/');
      const posArr = posRes.ok ? await posRes.json() : [];
      const nextMap = mergePositions(posArr);
      setPositions((prev) => ({ ...prev, ...nextMap }));
      return nextMap[deviceId] || null;
    } catch (err) {
      console.error('Erro ao buscar posição:', err);
      return null;
    } finally {
      setLoadingPositionId(null);
    }
  };

  const handleToggleExpand = async (deviceId) => {
    if (expandedRowId === deviceId) {
      setExpandedRowId(null);
      return;
    }
    setExpandedRowId(deviceId);
    if (!positions[deviceId]) {
      await fetchPositionForDevice(deviceId);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja realmente excluir este veículo?')) return;
    try {
      const response = await fetch(`/api/traccar/devices/${id}/`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Veículo excluído com sucesso!');
        fetchInitialData();
      } else {
        toast.error('Erro ao excluir veículo.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao excluir.');
    }
  };

  const filteredVehicles = vehicles.filter((v) =>
    (v.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.uniqueId || '').includes(searchTerm)
  );

  return (
    <div className="veiculos-page">
      <div className="veiculos-header">
        <div className="header-left">
          <h1>Gestão de Veículos</h1>
          <p>Configure dispositivos, grupos e parâmetros do motor</p>
        </div>
        <div className="header-actions">
          <input
            className="veiculos-search"
            type="text"
            placeholder="Buscar veículo ou IMEI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="btn-primary" onClick={onCreate}>
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
                {filteredVehicles.map((v) => {
                  const isExpanded = expandedRowId === v.id;
                  const categoryName = CATEGORIES.find((c) => c.id === v.category)?.name || v.category || 'Padrão';

                  return (
                    <React.Fragment key={v.id}>
                      <tr className={isExpanded ? 'expanded-parent' : ''}>
                        <td><input type="checkbox" className="table-checkbox" /></td>
                        <td></td>
                        <td>
                          <div className="cell-name">
                            <div className="mini-thumb" style={{ borderRadius: '50%' }}>
                              {v.attributes?.foto ? <img src={v.attributes.foto} alt="" /> : <Car size={14} />}
                            </div>
                            <div>
                              <span>{v.name}</span>
                              <span className="cell-veiculo-subtitle">{categoryName}</span>
                            </div>
                          </div>
                        </td>
                        <td>{v.uniqueId}</td>
                        <td>{v.phone || '-'}</td>
                        <td style={{ textTransform: 'uppercase' }}>{v.contact || v.attributes?.fornecedor || '-'}</td>
                        <td>{v.model || v.attributes?.modeloRastreador || '-'}</td>
                        <td>{formatConnectionTime(v, positions)}</td>
                        <td>
                          <div className="actions-cell">
                            <button className="btn-edit-cell" onClick={() => onEdit?.(v.id)} title="Editar"><Edit size={16} /></button>
                            <button className="btn-edit-cell" onClick={() => handleDelete(v.id)} title="Excluir" style={{ color: '#DC2626' }}><Trash2 size={16} /></button>
                            <button
                              className={`btn-expand ${isExpanded ? 'expanded' : ''}`}
                              onClick={() => handleToggleExpand(v.id)}
                            >
                              <ChevronDown size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="expanded-row">
                          <td colSpan="9">
                            <VehicleMiniMap
                              vehicle={v}
                              position={positions[v.id]}
                              loadingPosition={loadingPositionId === v.id}
                              onRetry={() => fetchPositionForDevice(v.id)}
                            />
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
    </div>
  );
};

export default Veiculos;
