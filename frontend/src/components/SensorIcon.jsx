import React from 'react';

/** Ícone de sensor (outline) — usado em abas e seções de Sensores */
const SensorIcon = ({ size = 24, color = 'currentColor', strokeWidth = 2, className = '', ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <rect x="9" y="10" width="6" height="9" rx="1.5" />
    <path d="M12 10V7.8" />
    <circle cx="12" cy="6.6" r="1.1" />
    <path d="M6.8 12.2a3.2 3.2 0 0 0 0 4.6" />
    <path d="M4.4 10.4a5.6 5.6 0 0 0 0 8.2" />
    <path d="M17.2 12.2a3.2 3.2 0 0 1 0 4.6" />
    <path d="M19.6 10.4a5.6 5.6 0 0 1 0 8.2" />
    <path d="M9.6 5.2a3.4 3.4 0 0 1 4.8 0" />
    <path d="M7.6 3.2a6.2 6.2 0 0 1 8.8 0" />
  </svg>
);

export default SensorIcon;
