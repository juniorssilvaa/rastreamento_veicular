import React from 'react';
import './ReportLoadingOverlay.css';

const ReportLoadingOverlay = ({ progress = 0 }) => (
  <div className="rel-loading">
    <div className="rel-loading__card">
      <p className="rel-loading__text">
        Por favor, aguarde um momento que estamos gerando o seu Relatório para a
        {' '}
        <strong>BLRASTREAMENTO</strong>
      </p>
      <div className="rel-loading__percent">{Math.min(progress, 100)}%</div>
      <div className="rel-loading__track">
        <div className="rel-loading__fill" style={{ width: `${Math.min(progress, 100)}%` }} />
        <div
          className="rel-loading__knob"
          style={{ left: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  </div>
);

export default ReportLoadingOverlay;
