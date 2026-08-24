import { useEffect, useMemo, useRef, useState } from 'react';
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
        'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors, © CARTO',
    },
  },
  layers: [
    {
      id: 'carto-voyager-layer',
      type: 'raster',
      source: 'carto-voyager',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

const MARABA = { lat: -5.36885, lng: -49.11715 };

const LNG_WEST = -49.1212;
const LNG_EAST = -49.1126;

/** Rua horizontal (sempre nas vias E↔W) — ícone nunca fica de cabeça para baixo */
const ewPath = (lat) => [
  [lat, LNG_WEST],
  [lat, -49.1190],
  [lat, -49.1168],
  [lat, -49.1146],
  [lat, LNG_EAST],
];

/**
 * 11 veículos, ícones únicos (sem repetir).
 * facesLeft: direção natural da foto (¾).
 */
const RAW_ROUTES = [
  { id: 'v01', icon: '/incon/5e9b3abcc485f3.55226871.png', size: 50, facesLeft: true, path: ewPath(-5.3656) },
  { id: 'v02', icon: '/incon/5e9b3bbb4cc2e8.43193984.png', size: 54, facesLeft: true, path: ewPath(-5.3664) },
  { id: 'v03', icon: '/incon/5f7b8da8f37250.36016355.png', size: 46, facesLeft: true, path: ewPath(-5.3672) },
  { id: 'v04', icon: '/incon/5e9b74bd8d5a70.95243390.png', size: 56, facesLeft: true, path: ewPath(-5.3680) },
  { id: 'v05', icon: '/incon/5e9b73a59fdeb2.97537852.png', size: 54, facesLeft: false, path: ewPath(-5.3688) },
  { id: 'v06', icon: '/incon/5e9b7384b1aff4.64910377.png', size: 50, facesLeft: true, path: ewPath(-5.3696) },
  { id: 'v07', icon: '/incon/5e9b7310463442.11601848.png', size: 54, facesLeft: false, path: ewPath(-5.3704) },
  { id: 'v08', icon: '/incon/5e9b730a74a872.66050492.png', size: 50, facesLeft: false, path: ewPath(-5.3712) },
  { id: 'v09', icon: '/incon/5e9b3bd35e0654.52738310.png', size: 46, facesLeft: false, path: ewPath(-5.3720) },
  { id: 'v10', icon: '/incon/5e9b3be9d89ae3.03298919.png', size: 46, facesLeft: true, path: ewPath(-5.3728) },
  { id: 'v11', icon: '/incon/5e9b3b0844a525.81990613.png', size: 46, facesLeft: false, path: ewPath(-5.3736) },
];

const MIN_SEP = 0.00038;

const dist = (a, b) => {
  const dy = b[0] - a[0];
  const dx = b[1] - a[1];
  return Math.sqrt(dy * dy + dx * dx);
};

const buildRoute = (raw, index) => {
  const segs = [];
  let total = 0;
  for (let i = 0; i < raw.path.length - 1; i++) {
    const len = dist(raw.path[i], raw.path[i + 1]);
    segs.push({ from: raw.path[i], to: raw.path[i + 1], len, start: total });
    total += len;
  }
  return {
    ...raw,
    segs,
    total: Math.max(total, 1e-9),
    progress: (index * 0.09) % 1,
    direction: index % 2 === 0 ? 1 : -1,
    baseSpeed: 0.002 + (index % 3) * 0.00035,
  };
};

const pointOnRoute = (route, progress, direction) => {
  const t = Math.max(0, Math.min(1, progress));
  const target = t * route.total;
  const seg =
    route.segs.find((s) => target >= s.start && target <= s.start + s.len) ||
    route.segs[route.segs.length - 1];
  const local = seg.len > 0 ? (target - seg.start) / seg.len : 0;
  const lat = seg.from[0] + (seg.to[0] - seg.from[0]) * local;
  const lng = seg.from[1] + (seg.to[1] - seg.from[1]) * local;

  const from = direction === 1 ? seg.from : seg.to;
  const to = direction === 1 ? seg.to : seg.from;
  const movingEast = to[1] - from[1] >= 0;

  // Nunca gira 180° (evita cabeça para baixo): só espelha no eixo X
  let flipX = 1;
  if (route.facesLeft) {
    flipX = movingEast ? -1 : 1;
  } else {
    flipX = movingEast ? 1 : -1;
  }

  return { lat, lng, flipX };
};

const VehicleIcon = ({ src, size, flipX }) => (
  <div
    style={{
      width: size,
      height: size * 0.7,
      transform: `scaleX(${flipX})`,
      transition: 'transform 0.15s ease',
      willChange: 'transform',
      pointerEvents: 'none',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
    }}
  >
    <img
      src={src}
      alt=""
      draggable={false}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        display: 'block',
        mixBlendMode: 'lighten',
        filter: 'contrast(1.06) drop-shadow(0 2px 4px rgba(0,0,0,0.55))',
      }}
    />
  </div>
);

const LoginMapBackground = () => {
  const routes = useMemo(() => RAW_ROUTES.map(buildRoute), []);
  const [vehicles, setVehicles] = useState(() =>
    routes.map((r) => ({
      ...r,
      ...pointOnRoute(r, r.progress, r.direction),
    })),
  );
  const vehiclesRef = useRef(null);

  useEffect(() => {
    vehiclesRef.current = vehicles;
  }, [vehicles]);

  useEffect(() => {
    const id = setInterval(() => {
      const current = vehiclesRef.current;
      if (!current) return;

      const next = current.map((v) => {
        let { progress, direction } = v;
        let speed = v.baseSpeed;

        const lookAhead = pointOnRoute(
          v,
          Math.min(1, Math.max(0, progress + 0.05 * direction)),
          direction,
        );
        for (const other of current) {
          if (other.id === v.id) continue;
          // só freia se estiver na mesma faixa (lat próxima) e à frente
          if (Math.abs(other.lat - v.lat) > 0.00015) continue;
          if (dist([lookAhead.lat, lookAhead.lng], [other.lat, other.lng]) < MIN_SEP) {
            speed = 0;
            break;
          }
        }

        progress += speed * direction;
        if (progress >= 1) {
          progress = 1;
          direction = -1;
        } else if (progress <= 0) {
          progress = 0;
          direction = 1;
        }

        return { ...v, progress, direction, ...pointOnRoute(v, progress, direction) };
      });

      vehiclesRef.current = next;
      setVehicles(next);
    }, 50);

    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
      <Map
        initialViewState={{
          longitude: MARABA.lng,
          latitude: MARABA.lat,
          zoom: 15.2,
          pitch: 0,
          bearing: 0,
        }}
        mapStyle={mapStyle}
        interactive={false}
        attributionControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        {vehicles.map((v) => (
          <Marker key={v.id} longitude={v.lng} latitude={v.lat} anchor="center">
            <VehicleIcon src={v.icon} size={v.size} flipX={v.flipX} />
          </Marker>
        ))}
      </Map>
      <div
        style={{
          position: 'absolute',
          left: 16,
          bottom: 16,
          zIndex: 2,
          background: 'rgba(17,24,39,0.72)',
          color: '#fff',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.04em',
          padding: '8px 12px',
          borderRadius: 8,
          backdropFilter: 'blur(6px)',
          pointerEvents: 'none',
        }}
      >
        MARABÁ · PA
      </div>
    </div>
  );
};

export default LoginMapBackground;
