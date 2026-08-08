import React from 'react';
import engineIcon from '../assets/engine-icon.png';

/** Ícone de motor (engine) para sensores */
const EngineIcon = ({ size = 24, className = '', ...props }) => (
  <img
    src={engineIcon}
    alt=""
    width={size}
    height={size}
    className={`engine-icon ${className}`.trim()}
    style={{
      width: size,
      height: size,
      objectFit: 'contain',
      display: 'block',
      filter: 'brightness(0) invert(1)',
    }}
    draggable={false}
    {...props}
  />
);

export default EngineIcon;
