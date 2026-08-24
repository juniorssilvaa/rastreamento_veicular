import React, { useMemo } from "react";
import "./AnimatedMarabaMap.css";
import mapaMaraba from "./assets/mapa-maraba-referencia.png";

const ROUTES = {
  vpTres: "M 514 356 C 558 369,609 384,663 397 C 711 407,758 416,812 424",
  vpOito: "M 291 500 C 338 505,379 511,423 518 C 469 525,520 532,571 540",
  vpSete: "M 474 116 C 500 167,530 223,558 274 C 585 322,613 365,646 409",
  rodovia: "M 772 2 C 766 76,775 149,793 219 C 812 295,839 369,866 442 C 881 484,894 522,904 560",
  novaMaraba: "M 939 302 C 972 329,1008 351,1045 370 C 1085 390,1125 405,1167 419"
};

function Car({ routeId, duration, delay, color }) {
  return (
    <g className="maraba-vehicle">
      <animateMotion dur={`${duration}s`} begin={`${delay}s`} repeatCount="indefinite" rotate="auto">
        <mpath href={`#${routeId}`} />
      </animateMotion>
      <rect x="-13" y="-6" width="26" height="12" rx="4" fill={color} />
      <rect x="-5" y="-4" width="10" height="8" rx="2" fill="#dce7ed" opacity=".92" />
    </g>
  );
}

function Moto({ routeId, duration, delay, color }) {
  return (
    <g className="maraba-vehicle">
      <animateMotion dur={`${duration}s`} begin={`${delay}s`} repeatCount="indefinite" rotate="auto">
        <mpath href={`#${routeId}`} />
      </animateMotion>
      <circle cx="-6" cy="0" r="2.6" fill="#202020" />
      <circle cx="6" cy="0" r="2.6" fill="#202020" />
      <rect x="-5" y="-2.2" width="10" height="4.4" rx="2.2" fill={color} />
    </g>
  );
}

export default function AnimatedMarabaMap({ mapSrc = mapaMaraba, className = "" }) {
  const vehicles = useMemo(() => [
    { type: "car", routeId: "vpTres", duration: 14, delay: -1, color: "#1f2937" },
    { type: "car", routeId: "vpOito", duration: 16, delay: -7, color: "#b91c1c" },
    { type: "moto", routeId: "vpSete", duration: 15, delay: -4, color: "#b45309" },
    { type: "car", routeId: "rodovia", duration: 18, delay: -9, color: "#334155" },
    { type: "car", routeId: "novaMaraba", duration: 13, delay: -3, color: "#0f766e" }
  ], []);

  return (
    <div className={`maraba-map ${className}`}>
      <img src={mapSrc} className="maraba-map__image" alt="" draggable={false} />
      <svg className="maraba-map__traffic" viewBox="0 0 1283 593" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          {Object.entries(ROUTES).map(([id, d]) => <path key={id} id={id} d={d} fill="none" />)}
        </defs>
        {vehicles.map((v, i) => v.type === "moto" ? <Moto key={i} {...v} /> : <Car key={i} {...v} />)}
      </svg>
    </div>
  );
}
