import React from 'react';
import carIcon from '../assets/car-icon.png';

/** Ícone de carro (line-art) para UI */
const CarIcon = ({ size = 24, className = '', color, strokeWidth, absoluteStrokeWidth, ...props }) => (
  <img
    src={carIcon}
    alt=""
    width={size}
    height={size}
    className={`car-icon ${className}`.trim()}
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

export default CarIcon;
