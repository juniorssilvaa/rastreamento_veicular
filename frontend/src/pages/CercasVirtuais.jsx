import React, { useState, useEffect, useRef } from 'react';
import { 
    MapContainer, TileLayer, FeatureGroup, useMap, 
    Polygon, Circle as CircleLayer, Popup, LayersControl, Marker 
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw'; 
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import './CercasVirtuais.css';
import { 
    Search, Map as MapIcon, Plus, Trash2, Edit, 
    Crosshair, MapPin, ZoomIn, ZoomOut, Layers, Check, 
    ShieldCheck, ShieldAlert, ShieldBan, Shield,
    Pentagon, Circle, Pencil, Eraser, X, ChevronDown, ArrowRight
} from 'lucide-react';
import Modal from '../components/Modal';
import CarIcon from '../components/CarIcon';

const { BaseLayer } = LayersControl;

const GEOFENCE_MAP_TYPES = [
    { id: 'streets', name: 'Normal', bg: 'https://mt1.google.com/vt/lyrs=m&x=58&y=94&z=8' },
    { id: 'hybrid', name: 'Híbrido', bg: 'https://mt1.google.com/vt/lyrs=y&x=58&y=94&z=8' },
    { id: 'satellite', name: 'Satélite', bg: 'https://mt1.google.com/vt/lyrs=s&x=58&y=94&z=8' },
    // Preview montanhoso para Terreno não parecer igual ao Normal
    { id: 'terrain', name: 'Terreno', bg: 'https://mt1.google.com/vt/lyrs=p&x=78&y=120&z=8' },
];

const GEOFENCE_MAP_TILES = {
    streets: {
        url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        maxNativeZoom: 21,
        maxZoom: 21,
    },
    hybrid: {
        url: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        maxNativeZoom: 21,
        maxZoom: 21,
    },
    satellite: {
        url: 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        maxNativeZoom: 21,
        maxZoom: 21,
    },
    terrain: {
        // Google Terrain (relevo + vias)
        url: 'https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        maxNativeZoom: 15,
        maxZoom: 21,
    },
};

const normalizeGeofenceMapLayer = (value) => (
    GEOFENCE_MAP_TILES[value] ? value : 'streets'
);

// Controles Extras do Mapa (Localização, Satélite e Ferramentas de Desenho)
// Renderizado FORA do MapContainer para evitar conflitos com eventos do Leaflet
const MapExtraControls = ({
    mapLayer,
    setMapLayer,
    mapInstance,
    onLocate,
    activeDrawTool,
    onStartDraw,
}) => {
    const [isLayerSelectorOpen, setIsLayerSelectorOpen] = useState(false);

    const handleLocate = () => {
        if (onLocate) onLocate();
        if (mapInstance) mapInstance.locate({ setView: true, maxZoom: 16 });
    };

    const mapTypes = GEOFENCE_MAP_TYPES;

    return (
        <div className="map-extra-controls">
            <button
                type="button"
                className={`map-ctrl-btn ${activeDrawTool === 'polygon' ? 'active' : ''}`}
                title="Desenhar Polígono"
                onClick={() => onStartDraw('polygon')}
            >
                <Pentagon size={20} />
            </button>

            <button
                type="button"
                className={`map-ctrl-btn ${activeDrawTool === 'circle' ? 'active' : ''}`}
                title="Desenhar Círculo"
                onClick={() => onStartDraw('circle')}
            >
                <Circle size={20} />
            </button>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.15)', margin: '2px 0' }} />

            <button
                type="button"
                className="map-ctrl-btn"
                title="Minha Localização"
                onClick={handleLocate}
            >
                <Crosshair size={20} />
            </button>

            <div style={{ position: 'relative' }}>
                <button
                    type="button"
                    className={`map-ctrl-btn ${isLayerSelectorOpen ? 'active' : ''}`}
                    title="Tipos de Mapa"
                    onClick={() => setIsLayerSelectorOpen(!isLayerSelectorOpen)}
                >
                    <Layers size={20} />
                </button>

                {isLayerSelectorOpen && (
                    <div className="layer-selector-card">
                        <span>TIPOS DE MAPA</span>
                        <div className="layer-selector-options">
                            {mapTypes.map(type => (
                                <button
                                    key={type.id}
                                    type="button"
                                    className={`layer-selector-item ${mapLayer === type.id ? 'active' : ''}`}
                                    onClick={() => {
                                        setMapLayer(type.id);
                                        localStorage.setItem('geofenceMapLayer', type.id);
                                        setIsLayerSelectorOpen(false);
                                    }}
                                >
                                    <div
                                        className="layer-selector-thumb"
                                        style={{ backgroundImage: `url(${type.bg})` }}
                                    />
                                    <span className="layer-selector-label">{type.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


// DrawingToolbar - only registers the CREATED event, no visual toolbar
const DrawingToolbar = ({ onCreated, mapInstance }) => {
    useEffect(() => {
        if (!mapInstance) return;
        const handler = (e) => onCreated(e);
        mapInstance.on(L.Draw.Event.CREATED, handler);
        return () => {
            mapInstance.off(L.Draw.Event.CREATED, handler);
        };
    }, [mapInstance, onCreated]);
    return null;
};

// --- CONTROLES PREMIUM CUSTOMIZADOS ---

const CustomMapControls = ({ map, currentLayer, setLayer, onLocate }) => {
    if (!map) return null;

    const layers = [
        { id: 'streets', name: 'Ruas', icon: <MapIcon size={18} /> },
        { id: 'satellite', name: 'Satélite', icon: <Layers size={18} /> },
        { id: 'hybrid', name: 'Híbrido', icon: <MapPin size={18} /> },
        { id: 'terrain', name: 'Terreno', icon: <MapPin size={18} /> },
    ];

    return (
        <>
            <div className="map-controls-group">
                <button className="btn-map-control" onClick={() => map.zoomIn()} title="Aumentar Zoom">
                    <ZoomIn size={20} />
                </button>
                <button className="btn-map-control" onClick={() => map.zoomOut()} title="Diminuir Zoom">
                    <ZoomOut size={20} />
                </button>
            </div>

            <div className="map-controls-group map-controls-bottom">
                {layers.map(l => (
                    <button 
                        key={l.id}
                        className={`btn-map-control ${currentLayer === l.id ? 'active' : ''}`}
                        onClick={() => setLayer(l.id)}
                        title={l.name}
                    >
                        {l.icon}
                        <span className="tooltip">{l.name}</span>
                    </button>
                ))}
            </div>

            <div className="map-controls-group map-controls-bottom map-controls-left">
                <button className="btn-map-control" onClick={onLocate} title="Minha Localização">
                    <Crosshair size={20} />
                </button>
            </div>
        </>
    );
};

// Componente para capturar a instância do mapa
const MapInstanceCapture = ({ setMap }) => {
    const map = useMap();
    useEffect(() => {
        setMap(map);
    }, [map, setMap]);
    return null;
};

// --- COMPONENTE PARA CAMADA EDITÁVEL ---

const EditableLayer = ({ geofence, onEditComplete }) => {
    const map = useMap();
    const layerRef = useRef();
    const [tempWkt, setTempWkt] = useState(null);

    const parseArea = (areaString) => {
        if (!areaString) return null;
        if (areaString.startsWith('POLYGON')) {
            const coordsString = areaString.match(/\(\((.*)\)\)/)[1];
            return {
                type: 'polygon',
                points: coordsString.split(',').map(pair => {
                    const [lng, lat] = pair.trim().split(' ').map(Number);
                    return [lat, lng];
                })
            };
        } else if (areaString.startsWith('CIRCLE')) {
            const match = areaString.match(/CIRCLE\s*\(([^,]+),\s*([^)]+)\)/);
            if (match) {
                const [lat, lng] = match[1].trim().split(' ').map(Number);
                const radius = Number(match[2]);
                return { type: 'circle', center: [lat, lng], radius };
            }
        }
        return null;
    };

    const parsed = parseArea(geofence.area);
    const color = geofence.attributes?.color || '#3b82f6';

    useEffect(() => {
        if (layerRef.current) {
            const layer = layerRef.current;
            layer.editing.enable();

            const updateWkt = () => {
                let wkt = '';
                if (parsed.type === 'polygon') {
                    const latlngs = layer.getLatLngs()[0];
                    const points = latlngs.map(ll => `${ll.lng} ${ll.lat}`).join(', ');
                    wkt = `POLYGON((${points}, ${latlngs[0].lng} ${latlngs[0].lat}))`;
                } else if (parsed.type === 'circle') {
                    const center = layer.getLatLng();
                    const radius = layer.getRadius();
                    wkt = `CIRCLE(${center.lat} ${center.lng}, ${radius})`;
                }
                setTempWkt(wkt);
                onEditComplete(wkt);
            };

            layer.on('edit', updateWkt);
            layer.on('dragend', updateWkt);

            return () => {
                layer.editing.disable();
                layer.off('edit', updateWkt);
                layer.off('dragend', updateWkt);
            };
        }
    }, [geofence.id]);

    if (!parsed) return null;

    return parsed.type === 'polygon' ? (
        <Polygon 
            ref={layerRef}
            positions={parsed.points} 
            pathOptions={{ color: '#DC2626', fillColor: color, fillOpacity: 0.4, weight: 3, dashArray: '5, 10' }}
        />
    ) : (
        <CircleLayer 
            ref={layerRef}
            center={parsed.center} 
            radius={parsed.radius}
            pathOptions={{ color: '#DC2626', fillColor: color, fillOpacity: 0.4, weight: 3, dashArray: '5, 10' }}
        />
    );
};

const DEFAULT_CENTER = [-2.4552, -54.7085]; // Fallback quando não há GPS nem veículos

// Definido fora do componente para manter a identidade estável entre renders.
// Se ficar dentro, o React remonta o componente a cada render e o flyTo
// dispara repetidamente para o centro antigo (mapa "preso" na primeira busca).
const MapUpdater = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        if (center) map.flyTo(center, zoom, { duration: 0.6 });
    }, [center, zoom, map]);
    return null;
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]
));

const escapeAttr = (s) =>
    String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');

const getDevicePhoto = (device) =>
    device?.attributes?.foto || device?.attributes?.iconUrl || device?.iconUrl || '';

const getDeviceMapIcon = (device) =>
    device?.attributes?.iconUrl || device?.iconUrl || '';

const createVehicleIcon = (device, position) => {
    const speed = Math.round((position.speed || 0) * 1.852);
    const isMoving = speed > 0;
    const label = escapeHtml(device.name || 'Veículo');
    const iconUrl = getDeviceMapIcon(device);

    if (iconUrl) {
        const safeUrl = escapeAttr(iconUrl);
        return L.divIcon({
            className: 'geofence-vehicle-marker-root',
            html: `
                <div class="geofence-vehicle-marker geofence-vehicle-marker--icon ${isMoving ? 'is-moving' : ''}">
                    <div class="geofence-vehicle-marker__icon">
                        <img src="${safeUrl}" alt="${label}" />
                    </div>
                    <span class="geofence-vehicle-marker__label">${label} · ${speed} km/h</span>
                </div>
            `,
            iconSize: [44, 44],
            iconAnchor: [22, 22],
            popupAnchor: [0, -22],
        });
    }

    return L.divIcon({
        className: 'geofence-vehicle-marker-root',
        html: `
            <div class="geofence-vehicle-marker ${isMoving ? 'is-moving' : ''}">
                <span class="geofence-vehicle-marker__pulse"></span>
                <span class="geofence-vehicle-marker__dot"></span>
                <span class="geofence-vehicle-marker__label">${label} · ${speed} km/h</span>
            </div>
        `,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
    });
};

// Fix Leaflet drawing icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const CercasVirtuais = () => {
    const [geofences, setGeofences] = useState([]);
    const [devices, setDevices] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('todas');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMapEditorOpen, setIsMapEditorOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedGeofence, setSelectedGeofence] = useState(null);
    const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
    const [zoom, setZoom] = useState(13);
    const [mapLayer, setMapLayer] = useState(() =>
        normalizeGeofenceMapLayer(localStorage.getItem('geofenceMapLayer'))
    );
    const [mapInstance, setMapInstance] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [followDeviceId, setFollowDeviceId] = useState(null);
    
    // Edição
    const [isEditing, setIsEditing] = useState(false);
    const [editedWkt, setEditedWkt] = useState(null);
    const [editingGeofenceId, setEditingGeofenceId] = useState(null);

    // Form data
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        area: '',
        attributes: {
            color: '#3b82f6' // Default Blue
        }
    });
    const [selectedDevices, setSelectedDevices] = useState([]);
    const [positions, setPositions] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [activeDrawTool, setActiveDrawTool] = useState(null);
    const [locationQuery, setLocationQuery] = useState('');
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);
    const [searchError, setSearchError] = useState('');

    const featureGroupRef = useRef();
    const drawHandlerRef = useRef(null);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    const requestUserLocation = (onSuccess) => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const coords = [pos.coords.latitude, pos.coords.longitude];
                setUserLocation(coords);
                if (onSuccess) onSuccess(coords);
            },
            (err) => console.warn('Não foi possível obter a localização atual:', err.message),
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
        );
    };

    // Centraliza na localização do usuário assim que ela estiver disponível
    useEffect(() => {
        requestUserLocation((coords) => {
            setMapCenter((prev) => (prev === DEFAULT_CENTER ? coords : prev));
        });
    }, []);

    // Acompanha em tempo real o veículo selecionado
    useEffect(() => {
        if (!followDeviceId) return;
        const pos = positions.find((p) => p.deviceId === followDeviceId);
        if (!pos) return;
        setMapCenter((prev) => (
            prev && prev[0] === pos.latitude && prev[1] === pos.longitude
                ? prev
                : [pos.latitude, pos.longitude]
        ));
    }, [positions, followDeviceId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [geoRes, devRes, posRes] = await Promise.all([
                fetch('/api/traccar/entity/geofences/'),
                fetch('/api/traccar/devices/'),
                fetch('/api/traccar/positions/')
            ]);
            setGeofences(await geoRes.json());
            setDevices(await devRes.json());
            setPositions(await posRes.json());
        } catch (err) {
            console.error("Erro ao carregar cercas:", err);
        } finally {
            setLoading(false);
        }
    };

    // Helper to parse WKT area string
    const parseArea = (areaString) => {
        if (!areaString) return null;
        if (areaString.startsWith('POLYGON')) {
            // POLYGON((lon lat, lon lat...))
            const coordsString = areaString.match(/\(\((.*)\)\)/)[1];
            return {
                type: 'polygon',
                points: coordsString.split(',').map(pair => {
                    const [lng, lat] = pair.trim().split(' ').map(Number);
                    return [lat, lng];
                })
            };
        } else if (areaString.startsWith('CIRCLE')) {
            // CIRCLE(lat lon, radius)
            const match = areaString.match(/CIRCLE\s*\(([^,]+),\s*([^)]+)\)/);
            if (match) {
                const [lat, lng] = match[1].trim().split(' ').map(Number);
                const radius = Number(match[2]);
                return { type: 'circle', center: [lat, lng], radius };
            }
        }
        return null;
    };

    const handleCreated = (e) => {
        const { layerType, layer } = e;
        let wkt = '';

        if (layerType === 'polygon') {
            const latlngs = layer.getLatLngs()[0];
            const points = latlngs.map(ll => `${ll.lng} ${ll.lat}`).join(', ');
            const first = latlngs[0];
            wkt = `POLYGON((${points}, ${first.lng} ${first.lat}))`;
        } else if (layerType === 'circle') {
            const center = layer.getLatLng();
            const radius = layer.getRadius();
            wkt = `CIRCLE(${center.lat} ${center.lng}, ${radius})`;
        }

        setFormData((prev) => ({ ...prev, area: wkt }));
        stopDraw();
        if (layer) {
            try {
                layer.remove();
            } catch (_) {
                /* ignore */
            }
        }
    };

    const stopDraw = () => {
        if (drawHandlerRef.current) {
            try {
                drawHandlerRef.current.disable();
            } catch (_) {
                /* ignore */
            }
            drawHandlerRef.current = null;
        }
        setActiveDrawTool(null);
    };

    const startDraw = (type) => {
        if (!mapInstance) {
            alert('Aguarde o mapa carregar e tente novamente.');
            return;
        }

        if (activeDrawTool === type) {
            stopDraw();
            return;
        }

        stopDraw();
        setFollowDeviceId(null);

        const color = formData.attributes?.color || '#3b82f6';
        const opts = {
            shapeOptions: {
                color,
                weight: 3,
                fillOpacity: 0.25,
            },
        };

        const handler = type === 'polygon'
            ? new L.Draw.Polygon(mapInstance, { ...opts, allowIntersection: false })
            : new L.Draw.Circle(mapInstance, opts);

        handler.enable();
        drawHandlerRef.current = handler;
        setActiveDrawTool(type);
    };

    const clearDrawnArea = () => {
        stopDraw();
        setFormData((prev) => ({ ...prev, area: '' }));
    };

    useEffect(() => {
        if (!isMapEditorOpen) {
            stopDraw();
        }
    }, [isMapEditorOpen]);

    const parseLatLngQuery = (query) => {
        const match = query.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/);
        if (!match) return null;
        const a = Number(match[1]);
        const b = Number(match[2]);
        if (Number.isNaN(a) || Number.isNaN(b)) return null;
        if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return [a, b];
        if (Math.abs(b) <= 90 && Math.abs(a) <= 180) return [b, a];
        return null;
    };

    const handleLocationSearch = async (event) => {
        event?.preventDefault?.();
        const query = locationQuery.trim();
        if (!query) return;

        setSearchError('');
        setIsSearchingLocation(true);
        setFollowDeviceId(null);

        try {
            const latlng = parseLatLngQuery(query);
            if (latlng) {
                setMapCenter(latlng);
                setZoom(15);
                return;
            }

            const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`;
            const res = await fetch(url, {
                headers: {
                    Accept: 'application/json',
                    'Accept-Language': 'pt-BR',
                },
            });
            if (!res.ok) throw new Error('Falha na busca');
            const data = await res.json();
            if (!Array.isArray(data) || data.length === 0) {
                setSearchError('Local não encontrado. Tente outro endereço.');
                return;
            }

            setMapCenter([Number(data[0].lat), Number(data[0].lon)]);
            setZoom(14);
        } catch (err) {
            console.error('Erro na busca de localização:', err);
            setSearchError('Erro ao buscar localização. Tente novamente.');
        } finally {
            setIsSearchingLocation(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.name.trim()) {
            alert("Dê um nome para a área antes de salvar.");
            return false;
        }
        if (!formData.area) {
            alert("Desenhe a cerca no mapa usando o Lápis.");
            return false;
        }

        try {
            const isUpdate = Boolean(editingGeofenceId);
            const payload = { ...formData, name: formData.name.trim() };
            if (isUpdate) payload.id = editingGeofenceId;

            const res = await fetch(
                isUpdate
                    ? `/api/traccar/entity/geofences/${editingGeofenceId}/`
                    : '/api/traccar/entity/geofences/',
                {
                    method: isUpdate ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }
            );

            if (!res.ok) {
                const errText = await res.text().catch(() => '');
                console.error('Erro ao salvar cerca:', res.status, errText);
                alert(`Não foi possível salvar a cerca (${res.status}). ${errText || 'Tente novamente.'}`);
                return false;
            }

            const savedGeo = await res.json().catch(() => ({ id: editingGeofenceId }));

            // Link devices
            if (selectedDevices.length > 0 && (savedGeo?.id || editingGeofenceId)) {
                await fetch('/api/traccar/permissions/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        geofenceId: savedGeo?.id || editingGeofenceId,
                        devicesIds: selectedDevices
                    })
                });
            }

            setIsModalOpen(false);
            resetForm();
            fetchData();
            return true;
        } catch (err) {
            console.error("Erro ao salvar cerca:", err);
            alert("Erro de conexão ao salvar a cerca. Verifique o servidor e tente novamente.");
            return false;
        }
    };

    const handleUpdateGeofence = async () => {
        if (!selectedGeofence || !editedWkt) return;
        try {
            const res = await fetch(`/api/traccar/entity/geofences/${selectedGeofence.id}/`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...selectedGeofence,
                    area: editedWkt
                })
            });
            if (res.ok) {
                setIsEditing(false);
                setEditedWkt(null);
                fetchData();
            }
        } catch (err) {
            console.error("Erro ao atualizar:", err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Deseja realmente excluir esta cerca?")) return;
        try {
            const res = await fetch(`/api/traccar/entity/geofences/${id}/`, {
                method: 'DELETE'
            });
            if (res.ok) fetchData();
        } catch (err) {
            console.error("Erro ao excluir:", err);
        }
    };

    const resetForm = () => {
        stopDraw();
        setLocationQuery('');
        setSearchError('');
        setEditingGeofenceId(null);
        setFormData({ name: '', description: '', area: '', attributes: { color: '#3b82f6' } });
        setSelectedDevices([]);
    };

    // Abre o editor de mapa com uma cerca existente carregada para edição
    const openEditGeofence = (geofence) => {
        const parsed = parseArea(geofence.area);
        setEditingGeofenceId(geofence.id);
        setFormData({
            name: geofence.name || '',
            description: geofence.description || '',
            area: geofence.area || '',
            attributes: {
                ...(geofence.attributes || {}),
                color: geofence.attributes?.color || '#3b82f6',
            },
        });
        setFollowDeviceId(null);
        setSelectedDevices([]);
        if (parsed) {
            const center = parsed.type === 'polygon' ? parsed.points[0] : parsed.center;
            setMapCenter(center);
            setZoom(15);
        }
        setIsMapEditorOpen(true);
    };

    const getGeofenceFlags = (geofence) => {
        const attrs = geofence.attributes || {};
        const searchableText = [
            geofence.name,
            geofence.description,
            attrs.type,
            attrs.status,
            attrs.action,
            attrs.alarm,
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        const isBlocked = /bloque|block|immobili|corte|desliga/.test(searchableText);
        const isInactive =
            attrs.disabled === true ||
            attrs.enabled === false ||
            attrs.active === false ||
            attrs.status === 'inactive' ||
            attrs.state === 'inactive';

        return {
            isBlocked,
            isInactive,
            isActive: !isInactive,
        };
    };

    const geofenceStats = geofences.reduce((acc, geofence) => {
        const flags = getGeofenceFlags(geofence);
        acc.total += 1;
        if (flags.isActive) acc.active += 1;
        if (flags.isBlocked) acc.blocked += 1;
        if (flags.isInactive) acc.inactive += 1;
        return acc;
    }, { total: 0, active: 0, blocked: 0, inactive: 0 });

    const filteredGeofences = geofences.filter((g) => {
        const matchesSearch = g.name.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;

        const flags = getGeofenceFlags(g);
        if (statusFilter === 'bloqueio') return flags.isBlocked;
        if (statusFilter === 'ativas') return flags.isActive;
        if (statusFilter === 'inativas') return flags.isInactive;
        return true;
    });

    const statCards = [
        { id: 'ativas', label: 'ATIVAS', value: geofenceStats.active, colorClass: 'is-active' },
        { id: 'bloqueio', label: 'COM BLOQUEIO', value: geofenceStats.blocked, colorClass: 'is-blocked' },
        { id: 'inativas', label: 'INATIVAS', value: geofenceStats.inactive, colorClass: 'is-inactive' },
    ];

    const filterTabs = [
        { id: 'todas', label: 'Todas' },
        { id: 'bloqueio', label: 'Com bloqueio' },
        { id: 'ativas', label: 'Ativas' },
        { id: 'inativas', label: 'Inativas' },
    ];

    if (isMapEditorOpen) {
        return (
            <div className="geofence-fullscreen-editor">
                <MapContainer center={mapCenter} zoom={zoom} className="geofence-fullscreen-map" zoomControl={false} maxZoom={21}>
                    {(() => {
                        const tile = GEOFENCE_MAP_TILES[mapLayer] || GEOFENCE_MAP_TILES.streets;
                        return (
                            <TileLayer
                                key={mapLayer}
                                url={tile.url}
                                subdomains={tile.subdomains}
                                maxNativeZoom={tile.maxNativeZoom}
                                maxZoom={tile.maxZoom}
                                attribution="&copy; Google"
                            />
                        );
                    })()}
                    
                    <MapUpdater center={mapCenter} zoom={zoom} />
                    <MapInstanceCapture setMap={setMapInstance} />
                    
                    <FeatureGroup ref={featureGroupRef} />

                    {(() => {
                        const draft = parseArea(formData.area);
                        if (!draft) return null;
                        const color = formData.attributes?.color || '#3b82f6';
                        const pathOptions = { color, fillColor: color, fillOpacity: 0.28, weight: 3 };
                        return draft.type === 'polygon' ? (
                            <Polygon positions={draft.points} pathOptions={pathOptions} />
                        ) : (
                            <CircleLayer center={draft.center} radius={draft.radius} pathOptions={pathOptions} />
                        );
                    })()}

                    {selectedDevices.map(deviceId => {
                        const device = devices.find(d => d.id === deviceId);
                        const pos = positions.find(p => p.deviceId === deviceId);
                        if (!device || !pos) return null;
                        const speedKmh = Math.round((pos.speed || 0) * 1.852);
                        const lastUpdate = pos.deviceTime || pos.serverTime || device.lastUpdate;
                        return (
                            <Marker 
                                key={`${deviceId}-${getDeviceMapIcon(device) || 'dot'}`} 
                                position={[pos.latitude, pos.longitude]}
                                icon={createVehicleIcon(device, pos)}
                                eventHandlers={{ click: () => setFollowDeviceId(deviceId) }}
                            >
                                <Popup>
                                    <strong>{device.name}</strong>
                                    <br />
                                    {speedKmh > 0 ? `Em movimento · ${speedKmh} km/h` : 'Parado'}
                                    <br />
                                    {lastUpdate && `Atualizado: ${new Date(lastUpdate).toLocaleTimeString('pt-BR')}`}
                                </Popup>
                            </Marker>
                        );
                    })}
                </MapContainer>
                
                <DrawingToolbar onCreated={handleCreated} mapInstance={mapInstance} />
                <MapExtraControls
                    mapLayer={mapLayer}
                    setMapLayer={setMapLayer}
                    mapInstance={mapInstance}
                    onLocate={() => setFollowDeviceId(null)}
                    activeDrawTool={activeDrawTool}
                    onStartDraw={startDraw}
                />

                <div className="geofence-overlay-card">
                    <div className="geofence-overlay-card__header">
                        <div className="geofence-overlay-card__title">
                            <h2>{editingGeofenceId ? 'Editar cerca' : 'Cercas e Perímetros'}</h2>
                            <p>{editingGeofenceId ? `Editando "${formData.name}" — ajuste e salve` : 'Seja avisado quando o veículo entrar ou sair'}</p>
                        </div>
                        <button
                            type="button"
                            className="geofence-overlay-card__close"
                            title="Fechar"
                            onClick={() => { setIsMapEditorOpen(false); resetForm(); }}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="geofence-form-group">
                        <label><span className="geofence-step">1</span> Veículos</label>
                        <p className="geofence-help-text">Escolha um veículo para vê-lo no mapa e desenhar a cerca ao redor dele.</p>
                        <div className="devices-dropdown-container" style={{position: 'relative'}}>
                            <div 
                                className="devices-dropdown-mock" 
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <CarIcon size={16} />
                                    {selectedDevices.length === 0 
                                        ? 'Toque para escolher um ou mais' 
                                        : `${selectedDevices.length} veículo(s) selecionado(s)`}
                                </span>
                                <ChevronDown size={16} style={{ transition: 'transform 0.2s', transform: isDropdownOpen ? 'rotate(180deg)' : 'none' }} />
                            </div>
                            {isDropdownOpen && (
                                <div className="devices-dropdown-list" style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    background: '#26262b',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    marginTop: '6px',
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                    zIndex: 1000,
                                    boxShadow: '0 16px 32px rgba(0, 0, 0, 0.5)'
                                }}>
                                    {devices.map(device => {
                                        const isSelected = selectedDevices.includes(device.id);
                                        const photo = getDevicePhoto(device);
                                        return (
                                            <div 
                                                key={device.id}
                                                className={`geofence-device-option ${isSelected ? 'is-selected' : ''}`}
                                                onClick={() => {
                                                    let newSelected;
                                                    if (isSelected) {
                                                        newSelected = selectedDevices.filter(id => id !== device.id);
                                                    } else {
                                                        newSelected = [...selectedDevices, device.id];
                                                    }
                                                    setSelectedDevices(newSelected);

                                                    if (isSelected) {
                                                        // Deixa de acompanhar o veículo desmarcado
                                                        if (followDeviceId === device.id) setFollowDeviceId(null);
                                                        return;
                                                    }

                                                    // Passa a acompanhar em tempo real o veículo escolhido
                                                    setFollowDeviceId(device.id);
                                                    const pos = positions.find(p => p.deviceId === device.id);
                                                    if (pos) {
                                                        setZoom(16);
                                                        setMapCenter([pos.latitude, pos.longitude]);
                                                    }
                                                }}
                                            >
                                                <input 
                                                    type="checkbox" 
                                                    checked={isSelected} 
                                                    readOnly 
                                                />
                                                <span className="geofence-device-option__photo" aria-hidden>
                                                    {photo
                                                        ? <img src={photo} alt="" />
                                                        : <CarIcon size={18} />}
                                                </span>
                                                <span className="geofence-device-option__name">{device.name}</span>
                                            </div>
                                        );
                                    })}
                                    {devices.length === 0 && (
                                        <div className="geofence-device-option geofence-device-option--empty">
                                            Nenhum veículo encontrado
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="geofence-form-group">
                        <label><span className="geofence-step">2</span> Localização da área</label>
                        <p className="geofence-help-text">Pesquise um endereço ou delimite a área diretamente no mapa.</p>
                        <form className="geofence-search-field" onSubmit={handleLocationSearch}>
                            <Search size={16} className="geofence-search-field__icon" />
                            <input
                                type="text"
                                placeholder="Buscar cidade ou endereço..."
                                value={locationQuery}
                                onChange={(e) => {
                                    setLocationQuery(e.target.value);
                                    if (searchError) setSearchError('');
                                }}
                            />
                            {locationQuery && !isSearchingLocation && (
                                <button
                                    type="button"
                                    className="geofence-search-field__clear"
                                    title="Limpar"
                                    onClick={() => { setLocationQuery(''); setSearchError(''); }}
                                >
                                    <X size={13} />
                                </button>
                            )}
                            <button
                                type="submit"
                                className="geofence-search-field__go"
                                title="Buscar localização"
                                disabled={isSearchingLocation || !locationQuery.trim()}
                            >
                                {isSearchingLocation
                                    ? <span className="geofence-search-field__spinner" />
                                    : <ArrowRight size={15} strokeWidth={2.5} />}
                            </button>
                        </form>
                        {searchError && <p className="geofence-search-error">{searchError}</p>}
                        {formData.area && (
                            <p className="geofence-area-ok">Área desenhada no mapa. Ajuste com as ferramentas se precisar.</p>
                        )}
                        <div className="geofence-draw-tools">
                            <button
                                type="button"
                                className={`geofence-draw-btn ${activeDrawTool === 'polygon' ? 'is-active' : ''}`}
                                onClick={() => startDraw('polygon')}
                                title="Desenhar polígono livre"
                            >
                                <Pencil size={15} /> Lápis
                            </button>
                            <button
                                type="button"
                                className="geofence-draw-btn"
                                onClick={clearDrawnArea}
                                title="Cancelar desenho e limpar área"
                            >
                                <Eraser size={15} /> Apagar
                            </button>
                        </div>
                        {activeDrawTool && (
                            <p className="geofence-draw-hint">
                                {activeDrawTool === 'polygon'
                                    ? 'Clique no mapa para marcar os pontos. Clique no primeiro ponto para fechar.'
                                    : 'Clique e arraste no mapa para desenhar o círculo.'}
                            </p>
                        )}
                    </div>

                    <div className="geofence-form-group">
                        <label><span className="geofence-step">3</span> Nome da área <span className="geofence-required">obrigatório</span></label>
                        <input 
                            type="text" 
                            className="geofence-input-mock"
                            placeholder="Ex.: Casa, Sítio, Trabalho..." 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                    </div>

                    <div className="geofence-form-group">
                        <label><span className="geofence-step">4</span> Cor da área no mapa</label>
                        <div className="geofence-color-picker">
                            {['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899'].map(c => (
                                <button
                                    type="button"
                                    key={c}
                                    title="Selecionar cor"
                                    className={`geofence-color-swatch ${formData.attributes.color === c ? 'is-active' : ''}`}
                                    style={{ backgroundColor: c }}
                                    onClick={() => setFormData({...formData, attributes: {...formData.attributes, color: c}})}
                                >
                                    {formData.attributes.color === c && <Check size={14} strokeWidth={3} />}
                                </button>
                            ))}
                            {(() => {
                                const presets = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899'];
                                const currentColor = formData.attributes.color || '#3b82f6';
                                const isCustom = !presets.includes(currentColor);
                                return (
                                    <label
                                        className={`geofence-color-custom-swatch ${isCustom ? 'is-active' : ''}`}
                                        title="Cor personalizada"
                                        style={isCustom ? { background: currentColor } : undefined}
                                    >
                                        {isCustom ? <Check size={14} strokeWidth={3} /> : <Plus size={15} strokeWidth={2.5} />}
                                        <input
                                            type="color"
                                            value={currentColor}
                                            onChange={(e) => setFormData({ ...formData, attributes: { ...formData.attributes, color: e.target.value } })}
                                        />
                                    </label>
                                );
                            })()}
                        </div>
                    </div>

                    <div className="geofence-overlay-actions">
                        <button className="geofence-btn-cancel" onClick={() => { setIsMapEditorOpen(false); resetForm(); }}>
                            <X size={16} /> Cancelar
                        </button>
                        <button
                            className="geofence-btn-save"
                            onClick={async () => {
                                const ok = await handleSave();
                                if (ok) setIsMapEditorOpen(false);
                            }}
                        >
                            <Check size={16} /> {editingGeofenceId ? 'Salvar alterações' : 'Salvar área'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="cercas-page">
            <div className="cercas-top-header">
                <div className="cercas-stats-grid">
                    {statCards.map((card) => {
                        return (
                            <div key={card.id} className={`cercas-stat-card ${card.colorClass}`}>
                                <div className="cercas-stat-card__top">
                                    <div className="cercas-stat-card__icon" />
                                    <strong>{card.value}</strong>
                                </div>
                                <span>{card.label}</span>
                            </div>
                        );
                    })}
                </div>

                <div className="cercas-toolbar-actions">
                    <div className="cercas-search">
                        <Search size={16} className="cercas-search-icon" />
                        <input 
                            type="text" 
                            placeholder="Buscar cercas..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        type="button"
                        className="btn-new-cerca"
                        onClick={() => {
                            setSelectedGeofence(null);
                            setIsEditing(false);
                            setEditedWkt(null);
                            setFollowDeviceId(null);
                            setZoom(15);
                            if (userLocation) {
                                setMapCenter(userLocation);
                            } else {
                                requestUserLocation((coords) => setMapCenter(coords));
                            }
                            setIsMapEditorOpen(true);
                        }}
                    >
                        <Plus size={16} />
                        Nova cerca
                    </button>
                </div>
            </div>

            <div className="cercas-list-shell">
                <div className="cercas-list-toolbar">
                    <div className="cercas-filter-tabs">
                        {filterTabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                className={`cercas-filter-tab cercas-filter-tab--${tab.id} ${statusFilter === tab.id ? 'active' : ''}`}
                                onClick={() => setStatusFilter(tab.id)}
                            >
                                {tab.icon && <span>{tab.icon}</span>}{tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="cercas-list">
                    {filteredGeofences.map(g => (
                        <div 
                            key={g.id} 
                            className={`cerca-item ${selectedGeofence?.id === g.id ? 'active' : ''}`}
                            onClick={() => {
                                const parsed = parseArea(g.area);
                                if (parsed) {
                                    const center = parsed.type === 'polygon' ? parsed.points[0] : parsed.center;
                                    setMapCenter(center);
                                    setZoom(15);
                                    setSelectedGeofence(g);
                                    setIsEditing(false);
                                }
                            }}
                        >
                            <div className="cerca-info">
                                <span
                                    className="cerca-shape-chip"
                                    style={{
                                        color: g.attributes?.color || '#3b82f6',
                                        background: `${g.attributes?.color || '#3b82f6'}1f`,
                                    }}
                                >
                                    {g.area.startsWith('POLYGON') ? <Pentagon size={16} /> : <Circle size={16} />}
                                </span>
                                <div className="cerca-text">
                                    <span className="cerca-name">{g.name}</span>
                                    <span className="cerca-meta">{g.area.startsWith('POLYGON') ? 'Polígono' : 'Círculo'}{g.description ? ` · ${g.description}` : ''}</span>
                                </div>
                            </div>
                            <div className="cerca-actions">
                                <button
                                    className="btn-cerca-action"
                                    title="Editar cerca"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openEditGeofence(g);
                                    }}
                                ><Edit size={15} /></button>
                                <button
                                    className="btn-cerca-action delete"
                                    title="Excluir cerca"
                                    onClick={(e) => { e.stopPropagation(); handleDelete(g.id); }}
                                ><Trash2 size={15} /></button>
                            </div>
                        </div>
                    ))}
                    {filteredGeofences.length === 0 && (
                        <div className="cercas-empty-state">
                            <span>Nenhuma cerca criada ainda.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

};

export default CercasVirtuais;
