import React, { useEffect, useState } from 'react';
import Map, { Marker } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const mapStyle = {
  version: 8,
  sources: {
    'carto-voyager': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors, © CARTO'
    }
  },
  layers: [
    {
      id: 'carto-voyager-layer',
      type: 'raster',
      source: 'carto-voyager',
      minzoom: 0,
      maxzoom: 22
    }
  ]
};

const VehicleIcon = ({ type, rotation }) => {
  const iconUrl = type === 'car' ? '/car.svg' : '/moto.svg';
  const size = type === 'car' ? [20, 40] : [14, 30];
  
  return (
    <div style={{
      transform: `rotate(${rotation}deg)`,
      width: `${size[0]}px`,
      height: `${size[1]}px`,
      transition: 'transform 0.1s linear'
    }}>
      <img src={iconUrl} style={{ width: '100%', height: '100%', filter: 'drop-shadow(0px 4px 4px rgba(0,0,0,0.4))' }} alt="vehicle" />
    </div>
  );
};

// Definição de rotas exatas (ruas retas) para garantir que fiquem nas ruas
const routes = [
  // 5 Carros
  { id: 1, type: 'car', start: [-23.5529, -46.6388], end: [-23.5592, -46.6398] }, // Av 23 de Maio
  { id: 2, type: 'car', start: [-23.5573, -46.6268], end: [-23.5591, -46.6226] }, // Viaduto do Glicério
  { id: 3, type: 'car', start: [-23.5487, -46.6288], end: [-23.5463, -46.6221] }, // Av Rangel Pestana
  { id: 4, type: 'car', start: [-23.5562, -46.6341], end: [-23.5601, -46.6322] }, // Rua da Glória
  { id: 5, type: 'car', start: [-23.5531, -46.6322], end: [-23.5583, -46.6301] }, // Conselheiro Furtado
  // 5 Motos
  { id: 6, type: 'moto', start: [-23.5592, -46.6398], end: [-23.5529, -46.6388] }, // Av 23 de Maio (inverso)
  { id: 7, type: 'moto', start: [-23.5591, -46.6226], end: [-23.5573, -46.6268] }, // Viaduto Glicério (inverso)
  { id: 8, type: 'moto', start: [-23.5505, -46.6366], end: [-23.5522, -46.6333] }, // Rua Riachuelo
  { id: 9, type: 'moto', start: [-23.5539, -46.6366], end: [-23.5581, -46.6381] }, // Brig Luis Antonio
  { id: 10, type: 'moto', start: [-23.5451, -46.6277], end: [-23.5422, -46.6244] }, // Radial Leste
].map(r => ({ ...r, progress: Math.random(), direction: 1, speed: 0.005 + Math.random() * 0.005 }));

const getRotation = (p1, p2) => {
  const dy = p2[0] - p1[0];
  const dx = p2[1] - p1[1];
  let theta = Math.atan2(dy, dx) * (180 / Math.PI); 
  // Adjusted for top-down map orientation (North is up)
  return 90 - theta;
};

const LoginMapBackground = () => {
  const [vehicles, setVehicles] = useState(routes);

  useEffect(() => {
    const interval = setInterval(() => {
      setVehicles(prev => prev.map(v => {
        let newProgress = v.progress + (v.speed * v.direction);
        let newDir = v.direction;
        if (newProgress >= 1) { newProgress = 1; newDir = -1; }
        if (newProgress <= 0) { newProgress = 0; newDir = 1; }
        
        const currentLat = v.start[0] + (v.end[0] - v.start[0]) * newProgress;
        const currentLng = v.start[1] + (v.end[1] - v.start[1]) * newProgress;
        
        // Calculate rotation based on direction
        const rot = newDir === 1 ? getRotation(v.start, v.end) : getRotation(v.end, v.start);

        return { ...v, progress: newProgress, direction: newDir, lat: currentLat, lng: currentLng, rot };
      }));
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
      <Map
        initialViewState={{
          longitude: -46.632,
          latitude: -23.553,
          zoom: 15,
          pitch: 0, 
          bearing: 0
        }}
        mapStyle={mapStyle}
        interactive={false}
        attributionControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        {vehicles.map(v => (
          <Marker 
            key={v.id} 
            longitude={v.lng || v.start[1]} 
            latitude={v.lat || v.start[0]} 
            anchor="center"
          >
            <VehicleIcon type={v.type} rotation={v.rot || getRotation(v.start, v.end)} />
          </Marker>
        ))}
      </Map>
    </div>
  );
};

export default LoginMapBackground;
