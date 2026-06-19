import React, { useMemo, useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, ScaleControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './Mapa.css';
import {
  Crosshair,
  LocateFixed,
  Maximize,
  Minimize,
  Navigation,
  Plus,
  Minus,
  ChevronLeft,
  PlusCircle,
  Settings,
  Gauge,
  Compass,
  MapPin,
  Battery,
  BatteryCharging,
  Power,
  Activity,
  CarFront,
} from 'lucide-react';

const addressCache = new Map();

/** Geocodificação reversa via Photon (CORS liberado para uso no browser). */
const fetchReverseAddress = async (lat, lon, signal) => {
  const key = `${Number(lat).toFixed(4)}_${Number(lon).toFixed(4)}`;
  if (addressCache.has(key)) return addressCache.get(key);

  const url = `https://photon.komoot.io/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&lang=pt`;
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('reverse-geocode');
  const data = await res.json();
  const p = data.features?.[0]?.properties;
  if (!p) return null;
  const streetLine = [p.name, p.street].filter(Boolean).join(', ');
  const locality = [p.district, p.city, p.state, p.country].filter(Boolean).join(', ');
  const line = [streetLine || p.street, locality].filter(Boolean).join(' · ') || p.name || null;
  if (line) addressCache.set(key, line);
  return line;
};

/** Recentraliza só ao mudar o dispositivo selecionado, não a cada atualização de posição. */
const RecenterOnDeviceChange = ({ deviceId, lat, lon }) => {
  const map = useMap();
  const prevIdRef = useRef(null);

  useEffect(() => {
    if (deviceId == null || lat == null || lon == null) {
      prevIdRef.current = null;
      return;
    }
    if (prevIdRef.current === deviceId) return;
    prevIdRef.current = deviceId;
    map.flyTo([lat, lon], 15, { duration: 0.55 });
  }, [deviceId, lat, lon, map]);

  return null;
};

/** Ajusta o mapa para mostrar todos os veículos quando nenhum está selecionado (evita refit a cada poll). */
const FitBoundsWhenIdle = ({ devices, selectedId }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedId != null) return;
    const pts = devices.filter((d) => d.position).map((d) => [d.position.latitude, d.position.longitude]);
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.setView(pts[0], 14);
      return;
    }
    map.fitBounds(L.latLngBounds(pts), { padding: [56, 56], maxZoom: 15 });
  }, [selectedId, map, devices.length]);

  return null;
};

const deviceStatusClass = (device) => {
  if (device.status !== 'online') return 'offline';
  if (device.speedKmh > 0) return 'moving';
  return 'online';
};

const escapeAttr = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');

const createDeviceDivIcon = (device) => {
  const letter = (device.name || 'V').slice(0, 1).toUpperCase();
  const cls = deviceStatusClass(device);
  const safeLabel = escapeAttr(device.name || 'Veículo');
  return L.divIcon({
    className: 'device-marker-root',
    html: `<div class="device-marker-pin device-marker-pin--${cls}" role="img" aria-label="${safeLabel}"><span class="device-marker-letter">${letter}</span></div>`,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -40],
  });
};

const MapActionMenu = ({ selectedDevice }) => {
  const map = useMap();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleZoomIn = () => map.zoomIn();
  const handleZoomOut = () => map.zoomOut();

  const handleLocateMe = () => {
    map.locate({ setView: true, maxZoom: 16 });
  };

  const handleCenterOnVehicle = () => {
    if (!selectedDevice?.position) return;
    map.flyTo([selectedDevice.position.latitude, selectedDevice.position.longitude], 16, { duration: 0.8 });
  };

  const toggleFullscreen = async () => {
    const mapContainer = document.getElementById('map-section');
    if (!mapContainer) return;

    if (!document.fullscreenElement) {
      await mapContainer.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="map-action-menu">
      <button type="button" onClick={toggleFullscreen} title="Tela cheia">
        {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
      </button>
      <button type="button" onClick={handleLocateMe} title="Minha localização">
        <LocateFixed size={16} />
      </button>
      <button type="button" onClick={handleCenterOnVehicle} title="Seguir veículo selecionado">
        <Navigation size={16} />
      </button>
      <button type="button" onClick={() => map.flyTo([-14.235, -51.9253], 4)} title="Centralizar Brasil">
        <Crosshair size={16} />
      </button>
      <div className="divider" />
      <button type="button" onClick={handleZoomIn} title="Zoom +">
        <Plus size={16} />
      </button>
      <button type="button" onClick={handleZoomOut} title="Zoom -">
        <Minus size={16} />
      </button>
    </div>
  );
};

const POLLING_INTERVAL_MS = 5000;

const formatDateTime = (dateValue) => {
  if (!dateValue) return 'Sem dados';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Sem dados';
  return date.toLocaleString('pt-BR');
};

const formatCoordinates = (lat, lon) => {
  if (lat == null || lon == null) return 'Sem coordenadas';
  return `(${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)})`;
};

const formatRelativeTime = (dateValue) => {
  if (!dateValue) return 'Sem comunicação';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Sem comunicação';

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return 'agora';

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;

  const days = Math.floor(hours / 24);
  return `há ${days} dia(s)`;
};

const toKmH = (speed) => Math.round((speed || 0) * 1.852);

const toKm = (distanceMeters) => {
  if (distanceMeters == null) return '--';
  return `${(distanceMeters / 1000).toFixed(1)} km`;
};

const normalizeBatteryLevel = (raw) => {
  if (raw == null || raw === '') return null;
  const num = Number(raw);
  if (Number.isNaN(num)) return null;
  if (num >= 0 && num <= 100) return Math.round(num);
  return null;
};

const getDeviceSubtitle = (device) => {
  const category = (device.category || '').toString().trim();
  if (category && category.toLowerCase() !== 'default') return category;
  if (device.uniqueId) return device.uniqueId;
  return 'Rastreador';
};

const formatCourse = (deg) => {
  if (deg == null || Number.isNaN(Number(deg))) return '—';
  const d = ((Number(deg) % 360) + 360) % 360;
  const dirs = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'];
  return `${dirs[Math.round(d / 45) % 8]} (${Math.round(d)}°)`;
};

const Mapa = () => {
  const [positions, setPositions] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [search, setSearch] = useState('');
  const [mapTheme, setMapTheme] = useState('clean');
  const [resolvedAddress, setResolvedAddress] = useState(null);
  const [addressError, setAddressError] = useState(false);
  const [devicesPanelOpen, setDevicesPanelOpen] = useState(false);

  const closeDevicesPanel = () => setDevicesPanelOpen(false);
  const toggleDevicesPanel = () => setDevicesPanelOpen((open) => !open);

  // Carregar dados
  const fetchData = async () => {
    try {
      const [devRes, posRes] = await Promise.all([
        fetch('http://localhost:8000/api/traccar/devices/'),
        fetch('http://localhost:8000/api/traccar/positions/')
      ]);
      const devicesArr = await devRes.json();
      const posArr = await posRes.json();
      setDevices(devicesArr);
      setPositions(posArr);
      setLastSync(new Date());
    } catch (err) {
      console.error("Erro ao carregar mapa:", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const pos = selectedDevice?.position;
  const attrs = pos?.attributes || {};

  useEffect(() => {
    setResolvedAddress(null);
    setAddressError(false);
    if (!pos?.latitude || !pos?.longitude) return;

    const fromApi = pos.address || attrs.address;
    if (fromApi) {
      setResolvedAddress(fromApi);
      return;
    }

    const ac = new AbortController();
    const t = setTimeout(() => {
      fetchReverseAddress(pos.latitude, pos.longitude, ac.signal)
        .then((line) => {
          if (line) setResolvedAddress(line);
          else setAddressError(true);
        })
        .catch(() => {
          if (ac.signal.aborted) return;
          setAddressError(true);
        });
    }, 400);

    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [selectedDevice?.id, pos?.latitude, pos?.longitude, pos?.address, pos?.attributes?.address]);

  const positionByDeviceId = useMemo(() => {
    const map = {};
    positions.forEach((pos) => {
      map[pos.deviceId] = pos;
    });
    return map;
  }, [positions]);

  const enrichedDevices = useMemo(() => {
    return devices
      .map((device) => {
        const position = positionByDeviceId[device.id];
        const attrs = position?.attributes || {};
        const engineOn = attrs.ignition === true || attrs.motion === true;
        return {
          ...device,
          position,
          engineOn,
          speedKmh: toKmH(position?.speed),
          totalDistance: toKm(attrs.totalDistance),
          batteryLevel: normalizeBatteryLevel(attrs.batteryLevel ?? attrs.battery),
          lastContact: device.lastUpdate || position?.serverTime || position?.deviceTime,
        };
      })
      .sort((a, b) => {
        if (a.status === 'online' && b.status !== 'online') return -1;
        if (a.status !== 'online' && b.status === 'online') return 1;
        return a.name.localeCompare(b.name);
      });
  }, [devices, positionByDeviceId]);

  const filteredDevices = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return enrichedDevices;

    return enrichedDevices.filter((device) => {
      const byName = device.name?.toLowerCase().includes(normalizedSearch);
      const byUniqueId = device.uniqueId?.toLowerCase().includes(normalizedSearch);
      return byName || byUniqueId;
    });
  }, [enrichedDevices, search]);

  const metrics = useMemo(() => {
    const online = enrichedDevices.filter((d) => d.status === 'online').length;
    const offline = enrichedDevices.length - online;
    const moving = enrichedDevices.filter((d) => d.position && d.speedKmh > 0).length;
    const removed = 0;
    return {
      total: enrichedDevices.length,
      online,
      offline,
      moving,
      removed,
    };
  }, [enrichedDevices]);

  const handleSelectDevice = (device) => setSelectedDevice(device);
  const clearSelectedDevice = () => setSelectedDevice(null);

  const displayAddress = resolvedAddress || (addressError ? 'Endereço indisponível' : 'Buscando endereço…');

  const mapTiles = {
    clean: {
      label: 'Limpo',
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: ['a', 'b', 'c', 'd'],
    },
    google: {
      label: 'Google',
      url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      attribution: '&copy; Google',
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    },
    dark: {
      label: 'Escuro',
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: ['a', 'b', 'c', 'd'],
    },
    street: {
      label: 'OSM',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors',
      subdomains: ['a', 'b', 'c'],
    },
    satellite: {
      label: 'Satélite',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri',
    },
  };

  const activeTile = mapTiles[mapTheme];

  return (
    <div className="mapa-container">
      <div id="map-section">
        {devicesPanelOpen && (
          <aside id="mapa-devices-panel" className="mapa-sidebar" aria-label="Lista de dispositivos">
            <div className="sidebar-header">
              <div className="sidebar-title-block">
                <h3>Dispositivos</h3>
                <span className="sidebar-sub">{metrics.total} na frota</span>
              </div>
              <div className="sidebar-actions">
                <button type="button" className="icon-btn" title="Recolher painel" onClick={closeDevicesPanel}>
                  <ChevronLeft size={14} />
                </button>
                <button type="button" className="close-btn" onClick={closeDevicesPanel}>
                  Fechar
                </button>
              </div>
            </div>

            <div className="stats-strip">
              <div className="stat-pill stat-pill--online">
                <strong>{metrics.online}</strong>
                <span>online</span>
              </div>
              <div className="stat-pill stat-pill--offline">
                <strong>{metrics.offline}</strong>
                <span>offline</span>
              </div>
              <div className="stat-pill stat-pill--moving">
                <strong>{metrics.moving}</strong>
                <span>em mov.</span>
              </div>
              <div className="stat-pill stat-pill--muted">
                <strong>{metrics.removed}</strong>
                <span>removidos</span>
              </div>
              <div className="stats-strip-tools">
                <button type="button" className="icon-btn" title="Configurações">
                  <Settings size={16} />
                </button>
                <button type="button" className="add-btn" title="Adicionar">
                  <PlusCircle size={18} />
                </button>
              </div>
            </div>

            <div className="toolbar">
              <input
                type="text"
                placeholder="Filtrar..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <h4 className="group-title">Grupos</h4>
            <div className="group-empty">Nenhum grupo criado</div>

            <div className="devices-title-row">
              <h4>Dispositivos</h4>
              <button type="button" className="select-btn">
                Selecionar
              </button>
            </div>

            <ul className="device-list">
              {filteredDevices.map((device) => (
                <li
                  key={device.id}
                  className={selectedDevice?.id === device.id ? 'active' : ''}
                  onClick={() => handleSelectDevice(device)}
                >
                  <div className="vehicle-card">
                    <div className="vehicle-avatar">{(device.name || 'V').slice(0, 1).toUpperCase()}</div>
                    <div className="vehicle-info">
                      <div className="vehicle-title-row">
                        <strong>{device.name || 'Sem nome'}</strong>
                        <span className={`connection-pill ${device.status === 'online' ? 'is-online' : 'is-offline'}`}>
                          {device.status === 'online' ? 'Conectado' : 'Offline'}
                        </span>
                      </div>
                      <span className="vehicle-model">ID: {getDeviceSubtitle(device)}</span>
                      <span className="vehicle-time">Última comunicação: {formatRelativeTime(device.lastContact)}</span>
                    </div>
                    <div className="vehicle-side">
                      <div className="vehicle-speed">
                        <strong>{device.speedKmh}</strong>
                        <span>KM/H</span>
                      </div>
                      <div className="vehicle-icons">
                        <span
                          className={`telemetry-icon ${device.engineOn ? 'is-on' : 'is-off'}`}
                          title={device.engineOn ? 'Motor ligado' : 'Motor desligado'}
                        >
                          <Power size={12} />
                        </span>
                        <span
                          className={`telemetry-icon ${
                            device.batteryLevel == null ? 'is-unknown' : device.batteryLevel >= 20 ? 'is-on' : 'is-low'
                          }`}
                          title={device.batteryLevel == null ? 'Bateria sem dado' : `Bateria ${device.batteryLevel}%`}
                        >
                          <BatteryCharging size={12} />
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
              {filteredDevices.length === 0 && <p className="empty-msg">Nenhum veículo encontrado.</p>}
            </ul>
            <p className="sync-info">Atualizado: {lastSync ? lastSync.toLocaleTimeString('pt-BR') : '--:--:--'}</p>
          </aside>
        )}
        <div className="map-overlay-top">
          <div className="theme-switch">
            {Object.entries(mapTiles).map(([key, tile]) => (
              <button
                key={key}
                type="button"
                className={mapTheme === key ? 'active' : ''}
                onClick={() => setMapTheme(key)}
              >
                {tile.label}
              </button>
            ))}
          </div>
        </div>

        {selectedDevice?.position && (
          <div className="vehicle-detail-card">
            <button type="button" className="close-detail-btn" onClick={clearSelectedDevice} aria-label="Fechar">
              ×
            </button>
            <div className="detail-card-head">
              <div>
                <h4>{selectedDevice.name || 'Veículo sem nome'}</h4>
                <p className="id-line">
                  <span className="mono">{selectedDevice.uniqueId || '—'}</span>
                  <span className="dot-sep">·</span>
                  {formatDateTime(selectedDevice.lastContact)}
                </p>
              </div>
              <span className={`status-chip status-chip--${deviceStatusClass(selectedDevice)}`}>
                {selectedDevice.status === 'online'
                  ? selectedDevice.speedKmh > 0
                    ? 'Em movimento'
                    : 'Parado'
                  : 'Offline'}
              </span>
            </div>

            <div className="detail-metrics">
              <div className="metric">
                <Gauge size={16} className="metric-icon" aria-hidden />
                <div>
                  <span className="metric-label">Velocidade</span>
                  <span className="metric-value">{selectedDevice.speedKmh} km/h</span>
                </div>
              </div>
              <div className="metric">
                <Compass size={16} className="metric-icon" aria-hidden />
                <div>
                  <span className="metric-label">Direção</span>
                  <span className="metric-value">{formatCourse(selectedDevice.position.course)}</span>
                </div>
              </div>
              {selectedDevice.position.altitude != null && (
                <div className="metric">
                  <Activity size={16} className="metric-icon" aria-hidden />
                  <div>
                    <span className="metric-label">Altitude</span>
                    <span className="metric-value">{Math.round(selectedDevice.position.altitude)} m</span>
                  </div>
                </div>
              )}
              {selectedDevice.batteryLevel != null && (
                <div className="metric">
                  <Battery size={16} className="metric-icon" aria-hidden />
                  <div>
                    <span className="metric-label">Bateria</span>
                    <span className="metric-value">{String(selectedDevice.batteryLevel)}%</span>
                  </div>
                </div>
              )}
              <div className="metric metric--wide">
                <MapPin size={16} className="metric-icon" aria-hidden />
                <div>
                  <span className="metric-label">Coordenadas</span>
                  <span className="metric-value mono">
                    {formatCoordinates(selectedDevice.position.latitude, selectedDevice.position.longitude)}
                  </span>
                </div>
              </div>
              <div className="metric metric--wide metric--address">
                <MapPin size={16} className="metric-icon" aria-hidden />
                <div>
                  <span className="metric-label">Endereço</span>
                  <span className="metric-value address-text">{displayAddress}</span>
                </div>
              </div>
            </div>

            <p className="detail-extra">
              Ignição:{' '}
              {attrs.ignition === true ? 'ligada' : attrs.ignition === false ? 'desligada' : 'sem dado'}
              {attrs.sat != null && <> · Satélites: {attrs.sat}</>}
              {selectedDevice.totalDistance && selectedDevice.totalDistance !== '--' && (
                <>
                  {' '}
                  · Odômetro: {selectedDevice.totalDistance}
                </>
              )}
            </p>

            <div className="detail-actions">
              <button type="button" className="btn-unfollow" onClick={clearSelectedDevice}>
                Deixar de seguir
              </button>
              <a
                className="btn-route"
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedDevice.position.latitude},${selectedDevice.position.longitude}`}
                target="_blank"
                rel="noreferrer"
              >
                Abrir rota
              </a>
            </div>
          </div>
        )}

        <MapContainer center={[-23.5505, -46.6333]} zoom={5} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <ScaleControl position="bottomright" imperial={false} />
          <FitBoundsWhenIdle devices={enrichedDevices} selectedId={selectedDevice?.id ?? null} />
          <MapActionMenu selectedDevice={selectedDevice} />
          <TileLayer
            key={mapTheme}
            attribution={activeTile.attribution}
            url={activeTile.url}
            subdomains={activeTile.subdomains}
          />
          {enrichedDevices
            .filter((device) => Boolean(device.position))
            .map((device) => (
              <Marker
                key={device.id}
                position={[device.position.latitude, device.position.longitude]}
                icon={createDeviceDivIcon(device)}
                eventHandlers={{ click: () => handleSelectDevice(device) }}
              />
            ))}
          {selectedDevice?.position && (
            <RecenterOnDeviceChange
              deviceId={selectedDevice.id}
              lat={selectedDevice.position.latitude}
              lon={selectedDevice.position.longitude}
            />
          )}
        </MapContainer>

        <button
          type="button"
          className={`map-devices-fab${devicesPanelOpen ? ' map-devices-fab--active' : ''}`}
          onClick={toggleDevicesPanel}
          title={devicesPanelOpen ? 'Ocultar dispositivos' : 'Dispositivos'}
          aria-label={devicesPanelOpen ? 'Ocultar dispositivos' : 'Abrir dispositivos'}
          aria-expanded={devicesPanelOpen}
          aria-controls={devicesPanelOpen ? 'mapa-devices-panel' : undefined}
        >
          <CarFront size={22} strokeWidth={2.2} aria-hidden />
        </button>
      </div>
    </div>
  );
};

export default Mapa;
