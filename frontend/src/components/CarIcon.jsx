import React from 'react';
import carIcon from '../assets/car-icon.png';
import './CarIcon.css';

/** Ícone de carro (line-art) para UI — adapta cor ao tema claro/escuro */
const CarIcon = ({
  size = 24,
  className = '',
  invert,
  color,
  strokeWidth,
  absoluteStrokeWidth,
  ...props
}) => {
  // invert explícito: true = branco, false = escuro; undefined = segue o tema
  const invertClass =
    invert === true ? 'car-icon--light' : invert === false ? 'car-icon--dark' : 'car-icon--auto';

  return (
    <img
      src={carIcon}
      alt=""
      width={size}
      height={size}
      className={`car-icon ${invertClass} ${className}`.trim()}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        display: 'block',
      }}
      draggable={false}
      {...props}
    />
  );
};

export default CarIcon;
