import React, { useState, useEffect, useRef } from 'react';
import { 
    MapContainer, TileLayer, FeatureGroup, useMap, 
    Polygon, Circle as CircleLayer, Popup, LayersControl 
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw'; 
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import './CercasVirtuais.css';
import { 
    Search, Map as MapIcon, Plus, Trash2, Edit, 
    Car, Crosshair, MapPin, ZoomIn, ZoomOut, Layers, Check, 
    ShieldCheck, ShieldAlert, ShieldBan, Shield,
    Pentagon, Circle
} from 'lucide-react';
import Modal from '../components/Modal';

const { BaseLayer } = LayersControl;

// Controles Extras do Mapa (Localização, Satélite e Ferramentas de Desenho)
// Renderizado FORA do MapContainer para evitar conflitos com eventos do Leaflet
const MapExtraControls = ({ mapLayer, setMapLayer, mapInstance }) => {
    const [isLayerSelectorOpen, setIsLayerSelectorOpen] = useState(false);
    const [activeDrawTool, setActiveDrawTool] = useState(null);
    const activeHandlerRef = useRef(null);

    const handleLocate = () => {
        if (mapInstance) mapInstance.locate({ setView: true, maxZoom: 16 });
    };

    const startDraw = (type) => {
        if (!mapInstance) return;
        // If same tool clicked again, stop it
        if (activeHandlerRef.current) {
            activeHandlerRef.current.disable();
            activeHandlerRef.current = null;
            setActiveDrawTool(null);
            if (activeDrawTool === type) return;
        }
        const opts = { shapeOptions: { color: '#3b82f6', weight: 3 } };
        const handler = type === 'polygon'
            ? new L.Draw.Polygon(mapInstance, { ...opts, allowIntersection: false })
            : new L.Draw.Circle(mapInstance, opts);
        handler.enable();
        activeHandlerRef.current = handler;
        setActiveDrawTool(type);
    };

    const mapTypes = [
        { id: 'streets', name: 'Normal', bg: 'https://mt1.google.com/vt/lyrs=m&x=1&y=1&z=2' },
        { id: 'hybrid', name: 'Híbrido', bg: 'https://mt1.google.com/vt/lyrs=y&x=1&y=1&z=2' },
        { id: 'satellite', name: 'Satélite', bg: 'https://mt1.google.com/vt/lyrs=s&x=1&y=1&z=2' },
        { id: 'terrain', name: 'Terreno', bg: 'https://mt1.google.com/vt/lyrs=p&x=1&y=1&z=2' },
    ];

    return (
        <div className="map-extra-controls">
            {/* Botão Polígono */}
            <button
                type="button"
                className={`map-ctrl-btn ${activeDrawTool === 'polygon' ? 'active' : ''}`}
                title="Desenhar Polígono"
                onClick={() => startDraw('polygon')}
            >
                <Pentagon size={20} />
            </button>

            {/* Botão Círculo */}
            <button
                type="button"
                className={`map-ctrl-btn ${activeDrawTool === 'circle' ? 'active' : ''}`}
                title="Desenhar Círculo"
                onClick={() => startDraw('circle')}
            >
                <Circle size={20} />
            </button>

            {/* Divisor */}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.15)', margin: '2px 0' }} />

            {/* Botão Localização */}
            <button
                type="button"
                className="map-ctrl-btn"
                title="Minha Localização"
                onClick={handleLocate}
            >
                <Crosshair size={20} />
            </button>

            {/* Botão Tipos de Mapa */}
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
        { id: 'hybrid', name: 'Híbrido', icon: <MapPin size={18} /> }
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
        <Circle 
            ref={layerRef}
            center={parsed.center} 
            radius={parsed.radius}
            pathOptions={{ color: '#DC2626', fillColor: color, fillOpacity: 0.4, weight: 3, dashArray: '5, 10' }}
        />
    );
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
    const [mapCenter, setMapCenter] = useState([-2.4552, -54.7085]); // Santarém/Brasil default
    const [zoom, setZoom] = useState(13);
    const [mapLayer, setMapLayer] = useState('streets');
    const [mapInstance, setMapInstance] = useState(null);
    
    // Edição
    const [isEditing, setIsEditing] = useState(false);
    const [editedWkt, setEditedWkt] = useState(null);

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

    const featureGroupRef = useRef();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [geoRes, devRes] = await Promise.all([
                fetch('/api/traccar/entity/geofences/'),
                fetch('/api/traccar/devices/')
            ]);
            setGeofences(await geoRes.json());
            setDevices(await devRes.json());
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
            // Closing the polygon
            const first = latlngs[0];
            wkt = `POLYGON((${points}, ${first.lng} ${first.lat}))`;
        } else if (layerType === 'circle') {
            const center = layer.getLatLng();
            const radius = layer.getRadius();
            wkt = `CIRCLE(${center.lat} ${center.lng}, ${radius})`;
        }

        setFormData({ ...formData, area: wkt });
        setIsModalOpen(true);
        // Clear drawing layer until saved
        if (featureGroupRef.current) {
            featureGroupRef.current.removeLayer(layer);
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.area) {
            alert("Por favor, dê um nome e desenhe a cerca no mapa.");
            return;
        }

        try {
            const res = await fetch('/api/traccar/entity/geofences/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                const newGeo = await res.json();
                
                // Link devices
                if (selectedDevices.length > 0) {
                    await fetch('/api/traccar/permissions/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            geofenceId: newGeo.id,
                            devicesIds: selectedDevices
                        })
                    });
                }

                setIsModalOpen(false);
                resetForm();
                fetchData();
            }
        } catch (err) {
            console.error("Erro ao salvar cerca:", err);
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
        setFormData({ name: '', description: '', area: '', attributes: {} });
        setSelectedDevices([]);
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

    const MapUpdater = ({ center, zoom }) => {
        const map = useMap();
        useEffect(() => {
            if (center) map.setView(center, zoom);
        }, [center, zoom, map]);
        return null;
    };

    if (isMapEditorOpen) {
        return (
            <div className="geofence-fullscreen-editor">
                <MapContainer center={mapCenter} zoom={zoom} className="geofence-fullscreen-map" zoomControl={false}>
                    {mapLayer === 'streets' && <TileLayer url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} />}
                    {mapLayer === 'satellite' && <TileLayer url="https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} />}
                    {mapLayer === 'hybrid' && <TileLayer url="https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} />}
                    {mapLayer === 'terrain' && <TileLayer url="https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} />}
                    
                    <MapUpdater center={mapCenter} zoom={zoom} />
                    <MapInstanceCapture setMap={setMapInstance} />
                    
                    <FeatureGroup />
                </MapContainer>
                
                <DrawingToolbar onCreated={handleCreated} mapInstance={mapInstance} />
                <MapExtraControls mapLayer={mapLayer} setMapLayer={setMapLayer} mapInstance={mapInstance} />

                <div className="geofence-overlay-card">
                    <div className="geofence-overlay-card__header">
                        <div>
                            <h2>Cercas e Perímetros</h2>
                            <p>Seja avisado quando o veículo entrar ou sair</p>
                        </div>
                    </div>

                    <div className="geofence-form-group">
                        <label>Veículos</label>
                        <p className="geofence-help-text">Escolha um veículo para vê-lo no mapa e desenhar a cerca ao redor dele.</p>
                        <div className="devices-dropdown-mock">
                            <span>Toque para escolher um ou mais</span>
                        </div>
                    </div>

                    <div className="geofence-form-group">
                        <label>Localização da área</label>
                        <p className="geofence-help-text">Pesquise um endereço ou delimite a área diretamente no mapa.</p>
                        <div className="geofence-search-mock">
                            <Search size={18} color="#94a3b8" />
                            <input type="text" placeholder="Endereço, cidade ou ponto (lat, lng)" />
                        </div>
                        <div className="geofence-draw-tools">
                            <button className="geofence-draw-btn">Lápis</button>
                            <button className="geofence-draw-btn">Apagar</button>
                            <button className="geofence-draw-btn">Formas</button>
                        </div>
                    </div>

                    <div className="geofence-form-group">
                        <label>Nome da área <span>(obrigatório)</span></label>
                        <input 
                            type="text" 
                            className="geofence-input-mock"
                            placeholder="Ex.: Casa, Sítio, Trabalho..." 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                    </div>

                    <div className="geofence-form-group">
                        <label>Cor da área no mapa</label>
                        <div className="geofence-color-picker">
                            {['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899'].map(c => (
                                <button
                                    type="button"
                                    key={c}
                                    className={`geofence-color-swatch ${formData.attributes.color === c ? 'is-active' : ''}`}
                                    style={{ backgroundColor: c }}
                                    onClick={() => setFormData({...formData, attributes: {...formData.attributes, color: c}})}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="geofence-overlay-actions">
                        <button className="geofence-btn-cancel" onClick={() => { setIsMapEditorOpen(false); resetForm(); }}>
                            Cancelar
                        </button>
                        <button className="geofence-btn-save" onClick={() => { handleSave(); setIsMapEditorOpen(false); }}>
                            Salvar área
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
                            setMapCenter([-2.4552, -54.7085]);
                            setZoom(13);
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
                                <span className="cerca-color-dot" style={{ backgroundColor: g.attributes?.color || '#3b82f6' }} />
                                <span className="cerca-name">{g.name}</span>
                                <span className="cerca-meta">{g.area.startsWith('POLYGON') ? 'Polígono' : 'Círculo'}</span>
                            </div>
                            <div className="cerca-actions">
                                <button className="btn-cerca-action" onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setSelectedGeofence(g);
                                    setIsEditing(true);
                                }}><Edit size={14} /></button>
                                <button className="btn-cerca-action delete" onClick={(e) => { e.stopPropagation(); handleDelete(g.id); }}><Trash2 size={14} /></button>
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
