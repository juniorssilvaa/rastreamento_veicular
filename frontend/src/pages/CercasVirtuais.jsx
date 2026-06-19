import React, { useState, useEffect, useRef } from 'react';
import { 
    MapContainer, TileLayer, FeatureGroup, useMap, 
    Polygon, Circle, Popup, LayersControl 
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw'; 
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import './CercasVirtuais.css';
import { 
    Search, Map as MapIcon, Plus, Trash2, Edit, 
    Save, X, Car, Crosshair, MapPin, ZoomIn, ZoomOut, Layers, Check
} from 'lucide-react';
import Modal from '../components/Modal';

const { BaseLayer } = LayersControl;

// Botão Flutuante de Localização
const LocateButton = () => {
    const map = useMap();
    
    const handleLocate = () => {
        map.locate({ setView: true, maxZoom: 16 });
    };

    return (
        <div className="leaflet-top leaflet-right" style={{ marginTop: '70px', marginRight: '10px' }}>
            <div className="leaflet-control leaflet-bar">
                <button 
                    onClick={handleLocate}
                    title="Minha Localização"
                    style={{ 
                        backgroundColor: 'white', 
                        border: 'none', 
                        width: '34px', 
                        height: '34px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        cursor: 'pointer',
                        borderRadius: '4px'
                    }}
                >
                    <Crosshair size={18} color="#4B5563" />
                </button>
            </div>
        </div>
    );
};

// Componente Custom para o Toolbar de Desenho
const DrawingToolbar = ({ onCreated }) => {
    const map = useMap();
    
    useEffect(() => {
        const drawControl = new L.Control.Draw({
            position: 'topleft',
            draw: {
                rectangle: false,
                polyline: false,
                marker: false,
                circlemarker: false,
                polygon: {
                    allowIntersection: false,
                    shapeOptions: { color: '#3b82f6' }
                },
                circle: { shapeOptions: { color: '#3b82f6' } }
            }
        });

        map.addControl(drawControl);

        map.on(L.Draw.Event.CREATED, (e) => {
            onCreated(e);
        });

        return () => {
            map.removeControl(drawControl);
            map.off(L.Draw.Event.CREATED);
        };
    }, [map, onCreated]);

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
    const [isModalOpen, setIsModalOpen] = useState(false);
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
                fetch('http://localhost:8000/api/traccar/entity/geofences/'),
                fetch('http://localhost:8000/api/traccar/devices/')
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
            const res = await fetch('http://localhost:8000/api/traccar/entity/geofences/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                const newGeo = await res.json();
                
                // Link devices
                if (selectedDevices.length > 0) {
                    await fetch('http://localhost:8000/api/traccar/permissions/', {
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
            const res = await fetch(`http://localhost:8000/api/traccar/entity/geofences/${selectedGeofence.id}/`, {
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
            const res = await fetch(`http://localhost:8000/api/traccar/entity/geofences/${id}/`, {
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

    const filteredGeofences = geofences.filter(g => 
        g.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const MapUpdater = ({ center, zoom }) => {
        const map = useMap();
        useEffect(() => {
            if (center) map.setView(center, zoom);
        }, [center, zoom, map]);
        return null;
    };

    return (
        <div className="cercas-page">
            <div className="cercas-sidebar">
                <div className="cercas-sidebar-header">
                    <h2><MapIcon size={20} /> Cercas Virtuais</h2>
                    <div className="cercas-search">
                        <Search size={16} className="cercas-search-icon" />
                        <input 
                            type="text" 
                            placeholder="Buscar cercas..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
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
                    {filteredGeofences.length === 0 && <p style={{textAlign: 'center', padding: '20px', color: '#9CA3AF'}}>Nenhuma cerca encontrada</p>}
                </div>
            </div>

            <div className="cercas-map-container">
                <CustomMapControls 
                    map={mapInstance}
                    currentLayer={mapLayer} 
                    setLayer={setMapLayer} 
                    onLocate={() => {
                            if (navigator.geolocation) {
                                navigator.geolocation.getCurrentPosition((pos) => {
                                    if (mapInstance) {
                                        mapInstance.setView([pos.coords.latitude, pos.coords.longitude], 16);
                                    }
                                });
                            }
                    }}
                />

                <MapContainer center={mapCenter} zoom={zoom} className="cercas-map" zoomControl={false}>
                    {mapLayer === 'streets' && <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />}
                    {mapLayer === 'satellite' && <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />}
                    {mapLayer === 'hybrid' && <TileLayer url="https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} />}
                    
                    <MapUpdater center={mapCenter} zoom={zoom} />
                    <MapInstanceCapture setMap={setMapInstance} />
                    
                    <FeatureGroup ref={featureGroupRef}>
                        {!isEditing && <DrawingToolbar onCreated={handleCreated} />}
                        
                        {geofences.map(g => {
                            const isSelected = selectedGeofence?.id === g.id;
                            if (isSelected && isEditing) return (
                                <EditableLayer 
                                    key={`edit-${g.id}`} 
                                    geofence={g} 
                                    onEditComplete={setEditedWkt} 
                                />
                            );
                            
                            const parsed = parseArea(g.area);
                            if (!parsed) return null;
                            const cercaColor = g.attributes?.color || '#3b82f6';
                            
                            return parsed.type === 'polygon' ? (
                                <Polygon 
                                    key={g.id} 
                                    positions={parsed.points} 
                                    pathOptions={{ 
                                        color: isSelected ? '#DC2626' : cercaColor, 
                                        fillColor: cercaColor,
                                        fillOpacity: 0.2,
                                        weight: isSelected ? 3 : 2
                                    }}
                                    eventHandlers={{
                                        click: () => { setSelectedGeofence(g); setIsEditing(false); }
                                    }}
                                >
                                    <Popup>{g.name}</Popup>
                                </Polygon>
                            ) : (
                                <Circle 
                                    key={g.id} 
                                    center={parsed.center} 
                                    radius={parsed.radius}
                                    pathOptions={{ 
                                        color: isSelected ? '#DC2626' : cercaColor, 
                                        fillColor: cercaColor,
                                        fillOpacity: 0.2,
                                        weight: isSelected ? 3 : 2
                                    }}
                                    eventHandlers={{
                                        click: () => { setSelectedGeofence(g); setIsEditing(false); }
                                    }}
                                >
                                    <Popup>{g.name}</Popup>
                                </Circle>
                            );
                        })}
                    </FeatureGroup>
                </MapContainer>

                {isEditing && (
                    <div className="edit-actions-bar">
                        <span className="edit-msg">Modo Edição: Arraste a cerca ou as bordas para ajustar</span>
                        <button className="btn-save-edit" onClick={handleUpdateGeofence}>
                            <Check size={16} /> CONFIRMAR ALTERAÇÕES
                        </button>
                        <button className="btn-cancel-edit" onClick={() => { setIsEditing(false); setEditedWkt(null); }}>
                            Cancelar
                        </button>
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); resetForm(); }}
                title="Configurar Cerca Virtual"
            >
                <div className="geofence-form">
                    <div className="geofence-form-group">
                        <label>Nome da Cerca</label>
                        <input 
                            type="text" 
                            placeholder="Ex: Garagem Principal" 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                    </div>
                    <div className="geofence-form-group">
                        <label>Descrição</label>
                        <input 
                            type="text" 
                            placeholder="Opcional..."
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                    </div>

                    <div className="geofence-form-group">
                        <label>Cor da Cerca</label>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            {['#3b82f6', '#DC2626', '#10b981', '#f59e0b', '#8b5cf6', '#000000'].map(c => (
                                <div 
                                    key={c}
                                    onClick={() => setFormData({...formData, attributes: {...formData.attributes, color: c}})}
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        backgroundColor: c,
                                        borderRadius: '50%',
                                        cursor: 'pointer',
                                        border: formData.attributes.color === c ? '3px solid #111827' : '1px solid #e5e7eb',
                                        boxShadow: formData.attributes.color === c ? '0 0 0 2px white' : 'none'
                                    }}
                                />
                            ))}
                            <input 
                                type="color" 
                                value={formData.attributes.color}
                                onChange={(e) => setFormData({...formData, attributes: {...formData.attributes, color: e.target.value}})}
                                style={{ width: '32px', height: '32px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                            />
                        </div>
                    </div>

                    <div className="geofence-form-group">
                        <label>Vincular Veículos (Quem será monitorado por esta cerca?)</label>
                        <div className="devices-selection">
                            {devices.map(d => (
                                <label key={d.id} className="device-check-item">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedDevices.includes(d.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedDevices([...selectedDevices, d.id]);
                                            else setSelectedDevices(selectedDevices.filter(id => id !== d.id));
                                        }}
                                    />
                                    <Car size={14} />
                                    <span>{d.name} ({d.uniqueId})</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="modal-actions-v2">
                        <button className="btn-confirm-v2" onClick={handleSave}>SALVAR CERCA NO MOTOR</button>
                        <button className="btn-cancel-v2" onClick={() => { setIsModalOpen(false); resetForm(); }}>Cancelar</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default CercasVirtuais;
