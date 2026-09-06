import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  ScatterChart,
  Scatter,
  ZAxis,
  Tooltip,
} from 'recharts';
import { ArrowLeft, MapPin, User } from 'lucide-react';
import { formatReportDateTime } from '../../utils/reportPeriod';
import './RelatorioLigadoDesligado.css';

const DONUT_COLORS = {
  ligado: '#2563eb',
  movimento: '#60a5fa',
  parado: '#93c5fd',
  estacionado: '#ef4444',
};

const DonutStat = ({ title, value, data, color }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;

  return (
    <div className="rel-view__donut">
      <div className="rel-view__donut-chart">
        <ResponsiveContainer width="100%" height={88}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={28}
              outerRadius={40}
              startAngle={90}
              endAngle={-270}
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="rel-view__donut-center">{Math.round((data[0]?.value / total) * 100)}%</div>
      </div>
      <div className="rel-view__donut-label">{title}</div>
      <div className="rel-view__donut-value" style={{ color }}>{value}</div>
    </div>
  );
};

const SparklineCard = ({ title, unit, data, color = '#2563eb' }) => (
  <div className="rel-view__spark">
    <div className="rel-view__spark-title">{title}</div>
    <ResponsiveContainer width="100%" height={56}>
      <LineChart data={data.map((value, index) => ({ index, value }))}>
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
    <div className="rel-view__spark-axis">
      <span>{Math.max(...data, 0)}{unit}</span>
      <span>{Math.min(...data, 0)}{unit}</span>
    </div>
  </div>
);

const RelatorioLigadoDesligado = ({ data, onBack }) => {
  if (!data) return null;

  const { meta, vehicle, period, summary, hourlyUsage, dynamics, trips } = data;
  const engine = summary.engineHours;

  const donutData = (activeMs, inactiveMs, activeColor) => [
    { name: 'active', value: activeMs || 1, color: activeColor },
    { name: 'inactive', value: inactiveMs || 1, color: '#e5e7eb' },
  ];

  return (
    <div className="rel-view">
      <div className="page-back-header rel-view__back">
        <button type="button" className="page-back-btn" onClick={onBack}>
          <ArrowLeft size={16} />
          Voltar
        </button>
      </div>

      <h1 className="rel-view__title">{meta.title}</h1>

      <section className="rel-view__hero">
        <div className="rel-view__brand">
          <div className="rel-view__logo">BL</div>
          <div>
            <strong>{meta.company}</strong>
            <div className="rel-view__muted">CNPJ: {meta.cnpj}</div>
            <div className="rel-view__muted">Criado em {formatReportDateTime(meta.generatedAt)}</div>
          </div>
        </div>

        <div className="rel-view__vehicle-grid">
          <div>
            <div className="rel-view__vehicle-name">{vehicle.name}</div>
            <div className="rel-view__muted">{vehicle.model}</div>
          </div>
          <div>
            <div className="rel-view__muted">Período analisado</div>
            <div>{period.label}</div>
            <div className="rel-view__muted">{formatReportDateTime(period.from)} – {formatReportDateTime(period.to)}</div>
          </div>
          <div>
            <div className="rel-view__muted">Total de {summary.ignitionCount} ignições obtidas</div>
          </div>
          <div className="rel-view__token">
            <span>Token de validação</span>
            <strong>{meta.token}</strong>
          </div>
        </div>
      </section>

      <section className="rel-view__cards">
        <article className="rel-view__card rel-view__card--wide">
          <h3>Horas de Motor</h3>
          <div className="rel-view__donuts">
            <DonutStat
              title="LIGADO"
              value={engine.ligado}
              color={DONUT_COLORS.ligado}
              data={donutData(engine.ligadoMs, engine.estacionadoMs, DONUT_COLORS.ligado)}
            />
            <DonutStat
              title="LIGADOS EM MOVIMENTO"
              value={engine.movimento}
              color={DONUT_COLORS.movimento}
              data={donutData(engine.movimentoMs, Math.max(engine.ligadoMs - engine.movimentoMs, 0), DONUT_COLORS.movimento)}
            />
            <DonutStat
              title="LIGADOS E PARADO"
              value={engine.parado}
              color={DONUT_COLORS.parado}
              data={donutData(engine.paradoMs, Math.max(engine.ligadoMs - engine.paradoMs, 0), DONUT_COLORS.parado)}
            />
            <DonutStat
              title="ESTACIONADO"
              value={engine.estacionado}
              color={DONUT_COLORS.estacionado}
              data={donutData(engine.estacionadoMs, engine.ligadoMs, DONUT_COLORS.estacionado)}
            />
          </div>
        </article>

        <article className="rel-view__card">
          <h3>Velocidade</h3>
          <div className="rel-view__metric-stack">
            <div><strong>{summary.speed.max} km/h</strong><span>MÁXIMA</span></div>
            <div><strong>{summary.speed.avg} km/h</strong><span>MÉDIA</span></div>
            <div><strong>{summary.speed.excess}</strong><span>EXCESSO</span></div>
          </div>
        </article>

        <article className="rel-view__card">
          <h3>Distância</h3>
          <div className="rel-view__metric-stack">
            <div><strong>{summary.distance.total} km</strong><span>PERCURSO</span></div>
            <div><strong>{summary.distance.odometer} km</strong><span>ODÔMETRO</span></div>
            <div><strong>{summary.distance.dailyAvg} km</strong><span>MÉDIA PERCURSO por dia</span></div>
          </div>
        </article>
      </section>

      <section className="rel-view__card rel-view__timeline">
        <h3>Horários com maior utilização</h3>
        <ResponsiveContainer width="100%" height={120}>
          <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <XAxis
              type="category"
              dataKey="hour"
              allowDuplicatedCategory={false}
              tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
              interval={2}
            />
            <YAxis type="number" dataKey="y" hide domain={[0, 2]} />
            <ZAxis type="number" dataKey="size" range={[80, 420]} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={hourlyUsage} fill="#60a5fa" />
          </ScatterChart>
        </ResponsiveContainer>
      </section>

      <section className="rel-view__card rel-view__dynamics">
        <h3>Dinâmica por acionamento</h3>
        <div className="rel-view__dynamics-head">
          <div className="rel-view__day-badge">
            <strong>{String(dynamics.day).padStart(2, '0')}</strong>
            <span>{dynamics.monthLabel}</span>
          </div>
          <div className="rel-view__spark-grid">
            <SparklineCard title="Velocidade Média (km/h)" unit="" data={dynamics.sparklines.speed} />
            <SparklineCard title="Nível de bateria (%)" unit="" data={dynamics.sparklines.battery} color="#49a94f" />
            <SparklineCard title="Conectividade (rssi)" unit="" data={dynamics.sparklines.rssi} color="#7748d8" />
            <SparklineCard title="Temperatura (°C)" unit="" data={dynamics.sparklines.temperature} color="#d86457" />
          </div>
        </div>
      </section>

      <section className="rel-view__trips">
        {trips.length === 0 ? (
          <div className="rel-view__empty">Nenhum acionamento encontrado no período selecionado.</div>
        ) : (
          trips.map((trip, index) => (
            <article key={`${trip.onTime}-${index}`} className="rel-view__trip">
              <div className="rel-view__trip-side rel-view__trip-side--on">
                <span className="rel-view__pill rel-view__pill--on">{trip.durationOn}</span>
                <div>
                  <strong>Ligado</strong>
                  <div className="rel-view__muted">{formatReportDateTime(trip.onTime)}</div>
                  <div className="rel-view__address"><MapPin size={14} /> {trip.onAddress}</div>
                </div>
              </div>

              <div className="rel-view__trip-side rel-view__trip-side--off">
                <span className="rel-view__pill rel-view__pill--off">{trip.durationOff}</span>
                <div>
                  <strong>Desligado</strong>
                  <div className="rel-view__muted">{formatReportDateTime(trip.offTime)}</div>
                  <div className="rel-view__address"><MapPin size={14} /> {trip.offAddress}</div>
                </div>
              </div>

              <div className="rel-view__trip-metrics">
                <div>
                  <span>Velocidade média</span>
                  <strong>{trip.avgSpeed} km/h</strong>
                </div>
                <div>
                  <span>Distância</span>
                  <strong>{trip.distance} km</strong>
                </div>
              </div>

              <div className="rel-view__trip-driver">
                <div className="rel-view__avatar"><User size={18} /></div>
                <span>{trip.driver}</span>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
};

export default RelatorioLigadoDesligado;
