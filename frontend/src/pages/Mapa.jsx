import React, { useMemo, useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, ScaleControl, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './Mapa.css';
import Modal from '../components/Modal';
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
  KeyRound,
  Activity,
  MoreHorizontal,
  X,
  Pencil,
  Lock,
  Wallet,
  UserRound,
  BarChart3,
  Bell,
  Route,
  Wrench,
  Fuel,
  ExternalLink,
  CircleDot,
} from 'lucide-react';
import CarIcon from '../components/CarIcon';
import toast from 'react-hot-toast';
import SensorIcon from '../components/SensorIcon';

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
    map.flyTo([lat, lon], 18, { duration: 0.55 });
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
  const safeLabel = escapeAttr(device.name || 'Veículo');
  const rawIcon = device.attributes?.iconUrl || device.iconUrl || '';

  if (rawIcon) {
    const iconUrl = escapeAttr(rawIcon);
    return L.divIcon({
      className: 'device-custom-icon-root',
      html: `<div class="device-map-icon" role="img" aria-label="${safeLabel}"><img src="${iconUrl}" alt="${safeLabel}" /></div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -22],
    });
  }

  const letter = (device.name || 'V').slice(0, 1).toUpperCase();
  const cls = deviceStatusClass(device);
  return L.divIcon({
    className: 'device-marker-root',
    html: `<div class="device-marker-pin device-marker-pin--${cls}" role="img" aria-label="${safeLabel}"><span class="device-marker-letter">${letter}</span></div>`,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -40],
  });
};

const MapActionMenu = ({ selectedDevice, onOpenViewConfig }) => {
  const map = useMap();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleLocateMe = () => {
    map.locate({ setView: true, maxZoom: 19 });
  };

  const handleCenterOnVehicle = () => {
    if (!selectedDevice?.position) return;
    map.flyTo([selectedDevice.position.latitude, selectedDevice.position.longitude], 19, { duration: 0.8 });
  };

  const handleZoomIn = () => {
    map.setZoom(Math.min((map.getZoom() || 0) + 1, map.getMaxZoom()));
  };

  const handleZoomOut = () => {
    map.setZoom(Math.max((map.getZoom() || 0) - 1, map.getMinZoom()));
  };

  const handleStreetView = () => {
    const lat = selectedDevice?.position?.latitude ?? map.getCenter().lat;
    const lon = selectedDevice?.position?.longitude ?? map.getCenter().lng;
    window.open(
      `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`,
      '_blank',
      'noopener,noreferrer'
    );
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
      <button type="button" onClick={handleZoomIn} title="Aproximar">
        <Plus size={16} />
      </button>
      <button type="button" onClick={handleZoomOut} title="Afastar">
        <Minus size={16} />
      </button>
      <button type="button" onClick={handleStreetView} title="Ver a rua (Street View)">
        <Crosshair size={16} />
      </button>
      <button type="button" onClick={toggleFullscreen} title="Tela cheia">
        {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
      </button>
      <button type="button" onClick={handleLocateMe} title="Minha localização">
        <LocateFixed size={16} />
      </button>
      <button type="button" onClick={handleCenterOnVehicle} title="Seguir veículo selecionado">
        <Navigation size={16} />
      </button>
      <button type="button" onClick={onOpenViewConfig} title="Visualização dos carros">
        <Settings size={16} />
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

const formatShortStamp = (dateValue) => {
  if (!dateValue) return '—';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '—';
  return date
    .toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
    .replace('.', '')
    .replace(' de ', '/');
};

const getMotionStatus = (device) => {
  if (!device) return { label: 'Sem dados', tone: 'idle' };
  if (device.status !== 'online') return { label: 'Offline', tone: 'offline' };
  if (device.speedKmh > 0) return { label: `Em movimento · ${device.speedKmh} km/h`, tone: 'moving' };
  const stoppedFor = formatRelativeTime(device.lastContact).replace(/^há /, '');
  return {
    label: stoppedFor === 'agora' ? 'Parado agora' : `Parado · ${stoppedFor}`,
    tone: 'stopped',
  };
};

/** Texto de status no estilo da listagem (Parado - 15 min / +14h). */
const getListStatusLabel = (device) => {
  if (!device) return 'Sem dados';
  if (device.status !== 'online') return 'Offline';
  if ((device.speedKmh || 0) > 0) return `Em movimento · ${device.speedKmh} km/h`;

  if (!device.lastContact) return 'Parado';
  const date = new Date(device.lastContact);
  if (Number.isNaN(date.getTime())) return 'Parado';

  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return 'Parado - agora';
  if (minutes < 60) return `Parado - ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Parado - +${hours}h`;
  const days = Math.floor(hours / 24);
  return `Parado - +${days}d`;
};

const DEVICE_LIST_PAGE_SIZE = 30;

const MapClickOpenList = ({ onOpen }) => {
  useMapEvents({
    click: () => onOpen(),
  });
  return null;
};

/** Recalcula o tamanho do Leaflet quando o menu lateral abre/fecha ou a janela muda. */
const InvalidateMapSizeOnLayout = () => {
  const map = useMap();

  useEffect(() => {
    const refresh = () => {
      map.invalidateSize({ animate: false });
    };

    const delayedRefresh = () => {
      refresh();
      window.setTimeout(refresh, 50);
      window.setTimeout(refresh, 250);
    };

    delayedRefresh();
    window.addEventListener('resize', delayedRefresh);
    window.addEventListener('sidebar-toggle', delayedRefresh);

    const el = map.getContainer()?.parentElement;
    let observer;
    if (el && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => delayedRefresh());
      observer.observe(el);
    }

    return () => {
      window.removeEventListener('resize', delayedRefresh);
      window.removeEventListener('sidebar-toggle', delayedRefresh);
      if (observer) observer.disconnect();
    };
  }, [map]);

  return null;
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

const normalizeMapDeviceLabelMode = (value) => {
  if (value === 'cliente') return 'nome';
  if (value === 'placa') return 'placa';
  if (value === 'nome' || value === 'nome_placa') return value;
  return 'nome_placa';
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
  const [groups, setGroups] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [search, setSearch] = useState('');
  const [mapTheme, setMapTheme] = useState(() => {
    const saved = localStorage.getItem('mapTheme');
    const allowed = ['clean', 'google', 'dark', 'street', 'satellite', 'hybrid'];
    return allowed.includes(saved) ? saved : 'clean';
  });
  const [resolvedAddress, setResolvedAddress] = useState(null);
  const [addressError, setAddressError] = useState(false);
  const [devicesPanelOpen, setDevicesPanelOpen] = useState(true);
  const [listLimit, setListLimit] = useState(DEVICE_LIST_PAGE_SIZE);
  const [detailTab, setDetailTab] = useState('geral');
  const [blocking, setBlocking] = useState(false);
  const [isViewConfigOpen, setIsViewConfigOpen] = useState(false);
  const [mapDeviceLabelMode, setMapDeviceLabelMode] = useState(() =>
    normalizeMapDeviceLabelMode(localStorage.getItem('mapDeviceLabelMode'))
  );
  const [pendingMapDeviceLabelMode, setPendingMapDeviceLabelMode] = useState(() =>
    normalizeMapDeviceLabelMode(localStorage.getItem('mapDeviceLabelMode'))
  );

  const closeDevicesPanel = () => setDevicesPanelOpen(false);
  const openViewConfig = () => {
    setPendingMapDeviceLabelMode(mapDeviceLabelMode);
    setIsViewConfigOpen(true);
  };
  const closeViewConfig = () => setIsViewConfigOpen(false);
  const saveViewConfig = () => {
    setMapDeviceLabelMode(pendingMapDeviceLabelMode);
    localStorage.setItem('mapDeviceLabelMode', pendingMapDeviceLabelMode);
    setIsViewConfigOpen(false);
  };

  // Carregar dados
  const fetchData = async () => {
    try {
      const [devRes, groupRes, posRes] = await Promise.all([
        fetch('/api/traccar/devices/'),
        fetch('/api/traccar/entity/groups/'),
        fetch('/api/traccar/positions/')
      ]);
      const devicesArr = await devRes.json();
      const groupsArr = groupRes.ok ? await groupRes.json() : [];
      const posArr = await posRes.json();
      setDevices(devicesArr);
      setGroups(Array.isArray(groupsArr) ? groupsArr : []);
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

  const groupById = useMemo(() => {
    const map = {};
    groups.forEach((group) => {
      map[group.id] = group;
    });
    return map;
  }, [groups]);

  const enrichedDevices = useMemo(() => {
    return devices
      .map((device) => {
        const position = positionByDeviceId[device.id];
        const attrs = {
          ...(position?.attributes || {}),
          ...(device.attributes || {}),
        };
        const engineOn = attrs.ignition === true || attrs.motion === true;
        const customerName =
          attrs.customerName ||
          attrs.customer ||
          attrs.clienteNome ||
          attrs.cliente ||
          groupById[device.groupId]?.name ||
          '';
        const plate =
          attrs.placa ||
          attrs.plate ||
          attrs.licensePlate ||
          attrs.vehiclePlate ||
          attrs.registration ||
          '';
        return {
          ...device,
          position,
          attributes: attrs,
          engineOn,
          speedKmh: toKmH(position?.speed),
          totalDistance: toKm(attrs.totalDistance),
          batteryLevel: normalizeBatteryLevel(attrs.batteryLevel ?? attrs.battery),
          lastContact: device.lastUpdate || position?.serverTime || position?.deviceTime,
          customerName,
          plate,
        };
      })
      .sort((a, b) => {
        if (a.status === 'online' && b.status !== 'online') return -1;
        if (a.status !== 'online' && b.status === 'online') return 1;
        return a.name.localeCompare(b.name);
      });
  }, [devices, groupById, positionByDeviceId]);

  const filteredDevices = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return enrichedDevices;

    return enrichedDevices.filter((device) => {
      const byName = device.name?.toLowerCase().includes(normalizedSearch);
      const byUniqueId = device.uniqueId?.toLowerCase().includes(normalizedSearch);
      const byPlate = device.plate?.toLowerCase().includes(normalizedSearch);
      const byModel = (device.model || device.attributes?.modelo || '')
        .toLowerCase()
        .includes(normalizedSearch);
      return byName || byUniqueId || byPlate || byModel;
    });
  }, [enrichedDevices, search]);

  useEffect(() => {
    setListLimit(DEVICE_LIST_PAGE_SIZE);
  }, [search]);

  const visibleDevices = useMemo(
    () => filteredDevices.slice(0, listLimit),
    [filteredDevices, listLimit]
  );

  const metrics = useMemo(() => {
    const online = enrichedDevices.filter((d) => d.status === 'online').length;
    const offline = enrichedDevices.length - online;
    const engineOn = enrichedDevices.filter((d) => d.engineOn === true).length;
    const engineOff = Math.max(enrichedDevices.length - engineOn, 0);
    return {
      total: enrichedDevices.length,
      online,
      offline,
      engineOn,
      engineOff,
    };
  }, [enrichedDevices]);

  // Mantém o veículo selecionado sincronizado com o polling
  useEffect(() => {
    if (!selectedDevice?.id) return;
    const fresh = enrichedDevices.find((d) => d.id === selectedDevice.id);
    if (fresh) setSelectedDevice(fresh);
  }, [enrichedDevices, selectedDevice?.id]);

  const handleSelectDevice = (device) => {
    setSelectedDevice(device);
    setDetailTab('geral');
    setDevicesPanelOpen(false);
  };

  const openDevicesFromMap = () => {
    setSelectedDevice(null);
    setDevicesPanelOpen(true);
  };

  const clearSelectedDevice = () => {
    setSelectedDevice(null);
    setDetailTab('geral');
  };

  const handleBackToDevices = () => {
    clearSelectedDevice();
    setDevicesPanelOpen(true);
  };

  const handleEditDevice = () => {
    if (!selectedDevice?.id) return;
    window.history.pushState(null, '', `/veiculos/editar/${selectedDevice.id}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleBlockDevice = async () => {
    if (!selectedDevice?.id || blocking) return;
    setBlocking(true);
    try {
      const res = await fetch('/api/traccar/commands/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: selectedDevice.id, type: 'engineStop' }),
      });
      if (!res.ok) throw new Error('command');
      toast.success('Comando de bloqueio enviado');
    } catch {
      toast.error('Não foi possível enviar o bloqueio');
    } finally {
      setBlocking(false);
    }
  };

  const displayAddress = resolvedAddress || (addressError ? 'Endereço indisponível' : 'Buscando endereço…');
  const selectedPrimaryLabel =
    mapDeviceLabelMode === 'placa'
      ? selectedDevice?.plate || selectedDevice?.name || selectedDevice?.uniqueId || 'Sem placa'
      : mapDeviceLabelMode === 'nome'
        ? selectedDevice?.name || selectedDevice?.plate || selectedDevice?.uniqueId || 'Veículo sem nome'
        : [selectedDevice?.name, selectedDevice?.plate].filter(Boolean).join(' • ') ||
          selectedDevice?.name ||
          selectedDevice?.plate ||
          selectedDevice?.uniqueId ||
          'Veículo sem nome';
  const selectedSecondaryLabel =
    mapDeviceLabelMode === 'placa'
      ? selectedDevice?.name || selectedDevice?.customerName || selectedDevice?.uniqueId || 'Veículo sem nome'
      : mapDeviceLabelMode === 'nome'
        ? selectedDevice?.plate || selectedDevice?.customerName || selectedDevice?.uniqueId || 'Sem placa'
        : selectedDevice?.customerName || selectedDevice?.uniqueId || 'Sem cliente';
  const selectedIgnitionText = selectedDevice?.engineOn ? 'ligado' : 'desligado';
  const motionStatus = getMotionStatus(selectedDevice);
  const selectedPhoto =
    selectedDevice?.attributes?.foto || selectedDevice?.attributes?.iconUrl || '';
  const selectedModel =
    selectedDevice?.model ||
    selectedDevice?.attributes?.modelo ||
    selectedDevice?.attributes?.model ||
    '';
  const gmapsKey = (typeof localStorage !== 'undefined' && localStorage.getItem('gmapsKey')) || '';
  const streetViewImg =
    selectedDevice?.position && gmapsKey
      ? `https://maps.googleapis.com/maps/api/streetview?size=640x280&location=${selectedDevice.position.latitude},${selectedDevice.position.longitude}&fov=80&pitch=0&key=${encodeURIComponent(gmapsKey)}`
      : null;
  const streetViewLink = selectedDevice?.position
    ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${selectedDevice.position.latitude},${selectedDevice.position.longitude}`
    : null;
  const fuelLevel =
    selectedDevice?.attributes?.fuel ??
    selectedDevice?.attributes?.fuelLevel ??
    selectedDevice?.attributes?.io3 ??
    null;

  const mapTiles = {
    clean: {
      label: 'Limpo',
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: ['a', 'b', 'c', 'd'],
      maxNativeZoom: 20,
      maxZoom: 21,
    },
    google: {
      label: 'Google',
      url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
      attribution: '&copy; Google',
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      maxNativeZoom: 21,
      maxZoom: 21,
    },
    dark: {
      label: 'Escuro',
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: ['a', 'b', 'c', 'd'],
      maxNativeZoom: 20,
      maxZoom: 21,
    },
    street: {
      label: 'OSM',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors',
      subdomains: ['a', 'b', 'c'],
      maxNativeZoom: 19,
      maxZoom: 21,
    },
    satellite: {
      label: 'Satélite',
      url: 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      attribution: '&copy; Google',
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      maxNativeZoom: 21,
      maxZoom: 21,
    },
    hybrid: {
      label: 'Híbrido',
      url: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      attribution: '&copy; Google',
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      maxNativeZoom: 21,
      maxZoom: 21,
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
              <div className="stat-pill stat-pill--engine-on">
                <strong>{metrics.engineOn}</strong>
                <span>ligados</span>
                <KeyRound size={12} className="stat-pill__icon" />
              </div>
              <div className="stat-pill stat-pill--engine-off">
                <strong>{metrics.engineOff}</strong>
                <span>desligados</span>
                <KeyRound size={12} className="stat-pill__icon" />
              </div>
              <div className="stats-strip-tools">
                <button type="button" className="icon-btn" title="Configurações" onClick={openViewConfig}>
                  <Settings size={16} />
                </button>
                <button
                  type="button"
                  className="add-btn"
                  title="Adicionar"
                  onClick={() => {
                    window.history.pushState(null, '', '/veiculos/novo');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                >
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
            <div className="group-empty">
              {groups.length === 0 ? 'Nenhum grupo criado' : `${groups.length} grupo(s)`}
            </div>

            <div className="devices-title-row">
              <h4>Dispositivos</h4>
              <button type="button" className="select-btn">
                Selecionar
              </button>
            </div>

            <ul className="device-list">
              {visibleDevices.map((device) => {
                const model = device.model || device.attributes?.modelo || device.attributes?.model || '';
                return (
                <li
                  key={device.id}
                  className={selectedDevice?.id === device.id ? 'active' : ''}
                  onClick={() => handleSelectDevice(device)}
                >
                  <div className="vehicle-card-v2">
                    <div className="v2-avatar-wrapper">
                      <div className="v2-avatar">
                        {device.attributes && (device.attributes.foto || device.attributes.iconUrl) ? (
                          <img src={device.attributes.foto || device.attributes.iconUrl} alt={device.name} />
                        ) : (
                          (device.name || 'V').slice(0, 1).toUpperCase()
                        )}
                      </div>
                      <div className={`v2-status-dot is-${device.status}`} />
                    </div>

                    <div className="v2-info">
                      <div className="v2-title-row">
                        <div className="v2-title-text">
                          <strong>{device.name || 'Sem nome'}</strong>
                          {model ? <span className="v2-model">· {model}</span> : null}
                        </div>
                        <button type="button" className="v2-more-btn" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal size={16} />
                        </button>
                      </div>

                      <div className="v2-status-row">
                        <span className={`v2-state-text is-${device.status}`}>
                          {getListStatusLabel(device)}
                        </span>
                        <span className="v2-separator">·</span>
                        <span className="v2-time">{formatRelativeTime(device.lastContact)}</span>
                        {device.lastContact && (
                          <>
                            <span className="v2-separator">·</span>
                            <span className="v2-date">{formatShortStamp(device.lastContact)}</span>
                          </>
                        )}
                      </div>

                      <div className="v2-address-row">
                        <MapPin size={12} className="v2-pin-icon" />
                        <span>{device.position?.address || device.attributes?.address || 'Endereço não disponível'}</span>
                      </div>
                    </div>
                  </div>
                </li>
              );})}
              {filteredDevices.length === 0 && <p className="empty-msg">Nenhum veículo encontrado.</p>}
            </ul>
            {listLimit < filteredDevices.length && (
              <button
                type="button"
                className="select-btn"
                style={{ width: '100%', marginTop: 8 }}
                onClick={() => setListLimit((n) => n + DEVICE_LIST_PAGE_SIZE)}
              >
                Mostrar mais ({Math.min(listLimit, filteredDevices.length)} de {filteredDevices.length})
              </button>
            )}
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
                onClick={() => {
                  setMapTheme(key);
                  localStorage.setItem('mapTheme', key);
                }}
              >
                {tile.label}
              </button>
            ))}
          </div>
        </div>

        {selectedDevice && (
          <aside className="vehicle-detail-panel" aria-label="Detalhes do veículo">
            <div className="vdp-toolbar">
              <button type="button" className="vdp-tool-btn" onClick={handleBackToDevices} title="Voltar">
                <ChevronLeft size={18} />
                <span>Voltar</span>
              </button>
              <div className="vdp-toolbar__actions">
                <button type="button" className="vdp-icon-btn" onClick={handleEditDevice} title="Editar">
                  <Pencil size={16} />
                </button>
                <button type="button" className="vdp-icon-btn" onClick={clearSelectedDevice} title="Fechar">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className={`vdp-status vdp-status--${motionStatus.tone}`}>
              <CircleDot size={14} aria-hidden />
              <span>{motionStatus.label}</span>
            </div>

            <div className="vdp-identity">
              <div className="vdp-photo">
                {selectedPhoto ? (
                  <img src={selectedPhoto} alt={selectedPrimaryLabel} />
                ) : (
                  <CarIcon size={28} />
                )}
              </div>
              <div className="vdp-identity__copy">
                <h3>{selectedPrimaryLabel}</h3>
                {(selectedModel || selectedSecondaryLabel) && (
                  <p className="vdp-model">{selectedModel || selectedSecondaryLabel}</p>
                )}
                {selectedDevice.customerName && (
                  <p className="vdp-user">
                    <UserRound size={13} aria-hidden />
                    <span>Usuário: {selectedDevice.customerName}</span>
                  </p>
                )}
                <p className="vdp-stamps">
                  Comunicou: {formatShortStamp(selectedDevice.lastContact)}
                  {selectedDevice.position?.deviceTime || selectedDevice.position?.fixTime ? (
                    <> · Posicionou: {formatShortStamp(selectedDevice.position.deviceTime || selectedDevice.position.fixTime)}</>
                  ) : null}
                </p>
              </div>
            </div>

            <div className="vdp-actions">
              <button type="button" className="vdp-action" onClick={handleBlockDevice} disabled={blocking}>
                <span className="vdp-action__icon vdp-action__icon--lock">
                  <Lock size={20} strokeWidth={1.75} />
                </span>
                <span>{blocking ? 'Enviando…' : 'Bloquear'}</span>
              </button>
              <button
                type="button"
                className="vdp-action"
                onClick={() => toast('Despesas em breve')}
              >
                <span className="vdp-action__icon vdp-action__icon--wallet">
                  <Wallet size={20} strokeWidth={1.75} />
                </span>
                <span>Despesas</span>
              </button>
              <button
                type="button"
                className="vdp-action"
                onClick={() => toast('Motorista em breve')}
              >
                <span className="vdp-action__icon vdp-action__icon--driver">
                  <UserRound size={20} strokeWidth={1.75} />
                </span>
                <span>Motorista</span>
              </button>
            </div>

            <div className="vdp-tabs" role="tablist" aria-label="Seções do veículo">
              {[
                { id: 'geral', label: 'Geral', Icon: BarChart3 },
                { id: 'alertas', label: 'Alertas', Icon: Bell },
                { id: 'viagens', label: 'Viagens', Icon: Route },
                { id: 'sensores', label: 'Sensores', Icon: SensorIcon },
                { id: 'servicos', label: 'Serviços', Icon: Wrench },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={detailTab === id}
                  className={`vdp-tab ${detailTab === id ? 'is-active' : ''}`}
                  onClick={() => setDetailTab(id)}
                >
                  <span className="vdp-tab__icon"><Icon size={18} strokeWidth={1.8} /></span>
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <div className="vdp-body">
              {detailTab === 'geral' && (
                <>
                  <div className="vdp-metrics">
                    <div className="vdp-metric">
                      <Gauge size={15} aria-hidden />
                      <div>
                        <span>Velocidade</span>
                        <strong>{selectedDevice.speedKmh ?? 0} km/h</strong>
                      </div>
                    </div>
                    <div className="vdp-metric">
                      <KeyRound size={15} aria-hidden />
                      <div>
                        <span>Ignição</span>
                        <strong>{selectedIgnitionText}</strong>
                      </div>
                    </div>
                    {selectedDevice.position?.course != null && (
                      <div className="vdp-metric">
                        <Compass size={15} aria-hidden />
                        <div>
                          <span>Direção</span>
                          <strong>{formatCourse(selectedDevice.position.course)}</strong>
                        </div>
                      </div>
                    )}
                    {selectedDevice.batteryLevel != null && (
                      <div className="vdp-metric">
                        <Battery size={15} aria-hidden />
                        <div>
                          <span>Bateria</span>
                          <strong>{String(selectedDevice.batteryLevel)}%</strong>
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedDevice.position ? (
                    <>
                      <a
                        className="vdp-address"
                        href={streetViewLink || `https://www.google.com/maps?q=${selectedDevice.position.latitude},${selectedDevice.position.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MapPin size={14} aria-hidden />
                        <span>{displayAddress}</span>
                        <ExternalLink size={13} aria-hidden />
                      </a>

                      <a
                        className="vdp-streetview"
                        href={streetViewLink}
                        target="_blank"
                        rel="noreferrer"
                        title="Abrir Street View"
                      >
                        {streetViewImg ? (
                          <img src={streetViewImg} alt="Street View" />
                        ) : (
                          <div className="vdp-streetview__fallback">
                            <Navigation size={18} />
                            <span>Ver no Street View</span>
                          </div>
                        )}
                      </a>

                      <p className="vdp-coords mono">
                        {formatCoordinates(selectedDevice.position.latitude, selectedDevice.position.longitude)}
                        {selectedDevice.totalDistance && selectedDevice.totalDistance !== '--' && (
                          <> · Odômetro: {selectedDevice.totalDistance}</>
                        )}
                      </p>
                    </>
                  ) : (
                    <p className="vdp-empty">Este veículo ainda não enviou posição GPS.</p>
                  )}
                </>
              )}

              {detailTab === 'alertas' && (
                <p className="vdp-empty">Nenhum alerta recente para este veículo.</p>
              )}
              {detailTab === 'viagens' && (
                <p className="vdp-empty">Histórico de viagens em breve.</p>
              )}
              {detailTab === 'sensores' && (
                <div className="vdp-metrics">
                  <div className="vdp-metric">
                    <KeyRound size={15} aria-hidden />
                    <div>
                      <span>Ignição</span>
                      <strong>{selectedIgnitionText}</strong>
                    </div>
                  </div>
                  {selectedDevice.batteryLevel != null && (
                    <div className="vdp-metric">
                      <Battery size={15} aria-hidden />
                      <div>
                        <span>Bateria</span>
                        <strong>{String(selectedDevice.batteryLevel)}%</strong>
                      </div>
                    </div>
                  )}
                  {selectedDevice.attributes?.sat != null && (
                    <div className="vdp-metric">
                      <Activity size={15} aria-hidden />
                      <div>
                        <span>Satélites</span>
                        <strong>{selectedDevice.attributes.sat}</strong>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {detailTab === 'servicos' && (
                <p className="vdp-empty">Nenhum serviço agendado.</p>
              )}
            </div>

            <div className="vdp-fuel">
              <div className="vdp-fuel__left">
                <Fuel size={16} aria-hidden />
                <div>
                  <span>Nível do tanque</span>
                  <strong>{fuelLevel != null && fuelLevel !== '' ? String(fuelLevel) : '—'}</strong>
                </div>
              </div>
              <button type="button" className="vdp-fuel__btn" onClick={() => toast('Calibração em breve')}>
                Calibrar
              </button>
            </div>
          </aside>
        )}

        <MapContainer
          center={[-23.5505, -46.6333]}
          zoom={5}
          maxZoom={21}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <ScaleControl position="bottomright" imperial={false} />
          <InvalidateMapSizeOnLayout />
          <FitBoundsWhenIdle devices={enrichedDevices} selectedId={selectedDevice?.id ?? null} />
          <MapClickOpenList onOpen={openDevicesFromMap} />
          <MapActionMenu selectedDevice={selectedDevice} onOpenViewConfig={openViewConfig} />
          <TileLayer
            key={mapTheme}
            attribution={activeTile.attribution}
            url={activeTile.url}
            subdomains={activeTile.subdomains}
            maxNativeZoom={activeTile.maxNativeZoom}
            maxZoom={activeTile.maxZoom}
          />
          {enrichedDevices
            .filter((device) => Boolean(device.position))
            .map((device) => (
              <Marker
                key={`${device.id}-${device.attributes?.iconUrl || 'default'}`}
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

        <Modal isOpen={isViewConfigOpen} onClose={closeViewConfig} title="Visualização dos Veículos no Mapa">
          <div className="map-view-config">
            <p className="map-view-config__desc">
              Escolha como os veículos devem ser identificados na visualização do mapa
            </p>

            <label className="map-view-option">
              <input
                type="radio"
                name="map-device-label-mode"
                value="nome_placa"
                checked={pendingMapDeviceLabelMode === 'nome_placa'}
                onChange={(event) => setPendingMapDeviceLabelMode(event.target.value)}
              />
              <div>
                <strong>Nome + placa</strong>
                <span>Exibe o nome do veículo junto com a placa.</span>
              </div>
            </label>

            <label className="map-view-option">
              <input
                type="radio"
                name="map-device-label-mode"
                value="nome"
                checked={pendingMapDeviceLabelMode === 'nome'}
                onChange={(event) => setPendingMapDeviceLabelMode(event.target.value)}
              />
              <div>
                <strong>Apenas nome</strong>
                <span>Mostra somente o nome do veículo.</span>
              </div>
            </label>

            <label className="map-view-option">
              <input
                type="radio"
                name="map-device-label-mode"
                value="placa"
                checked={pendingMapDeviceLabelMode === 'placa'}
                onChange={(event) => setPendingMapDeviceLabelMode(event.target.value)}
              />
              <div>
                <strong>Apenas placa</strong>
                <span>Exibe somente a placa quando disponível.</span>
              </div>
            </label>

            <div className="map-view-config__actions">
              <button type="button" className="map-view-config__btn map-view-config__btn--ghost" onClick={closeViewConfig}>
                Cancelar
              </button>
              <button type="button" className="map-view-config__btn map-view-config__btn--primary" onClick={saveViewConfig}>
                Salvar
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default Mapa;
