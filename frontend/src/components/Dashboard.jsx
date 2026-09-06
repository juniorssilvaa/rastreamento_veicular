import React, { useMemo, useState, useEffect } from 'react';
import './Dashboard.css';
import {
  CheckCircle2,
  XCircle,
  Navigation,
  TriangleAlert,
  Fence,
  Clock,
  Wallet,
} from 'lucide-react';

const TrackerIcon = ({ color = 'currentColor', size = 22 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ color }}
    aria-hidden
  >
    <path
      d="M12 3H20V6H22V9H20V11H12V9H10V6H12V3Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M14 11V15.5M18 11V15.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <rect
      x="9"
      y="15"
      width="14"
      height="14"
      rx="2.5"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path
      d="M12 18H20"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M12.5 22L16 25.5L19.5 22"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13.8 20.5L16 22.7L18.2 20.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const fmtNum = (n) => new Intl.NumberFormat('pt-BR').format(n ?? 0);

const fmtBRL = (n) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n ?? 0);

const pct = (part, total) => {
  if (!total) return '0,0';
  return ((part / total) * 100).toFixed(1).replace('.', ',');
};

const formatRelativeContact = (dateValue) => {
  if (!dateValue) return 'Sem comunicação';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Sem comunicação';

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return 'Agora';

  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Agora';
  if (mins < 60) return `Há ${mins} min`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Há ${hours} h`;

  const days = Math.floor(hours / 24);
  return `Há ${days} d`;
};

const buildDonutGradient = (segments) => {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (!total) return 'conic-gradient(#3b3b3b 0deg 360deg)';

  let cursor = 0;
  const stops = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const from = (cursor / total) * 360;
      cursor += s.value;
      const to = (cursor / total) * 360;
      return `${s.color} ${from}deg ${to}deg`;
    });

  return `conic-gradient(${stops.join(', ')})`;
};

const MetricCard = ({ label, value, sub, icon: Icon, iconColor, IconCustom }) => (
  <article className="dash-rast__card">
    <div className="dash-rast__metric-top">
      <div className="dash-rast__metric-label">{label}</div>
      <div className="dash-rast__metric-icon">
        {IconCustom ? (
          <IconCustom color={iconColor} size={22} />
        ) : (
          <Icon stroke={iconColor} strokeWidth={2} />
        )}
      </div>
    </div>
    <div className="dash-rast__metric-value">{fmtNum(value)}</div>
    <div className="dash-rast__metric-sub">{sub}</div>
  </article>
);

const CompactMetricCard = ({ label, value, sub, icon: Icon, iconColor }) => (
  <article className="dash-rast__card dash-rast__card--compact">
    <div className="dash-rast__metric-top">
      <div className="dash-rast__metric-label">{label}</div>
      <div className="dash-rast__metric-icon">
        <Icon stroke={iconColor} strokeWidth={2} />
      </div>
    </div>
    <div className="dash-rast__metric-value">{fmtNum(value)}</div>
    <div className="dash-rast__metric-sub">{sub}</div>
  </article>
);

const Dashboard = () => {
  const [devices, setDevices] = useState([]);
  const [groups, setGroups] = useState([]);
  const [positions, setPositions] = useState([]);
  const [overdueData, setOverdueData] = useState({ total_in_debt: 0, total_value: 0, customers: [] });
  const [financial, setFinancial] = useState({ receber: 0, a_pagar: 0 });
  const [events, setEvents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [snapshotTime, setSnapshotTime] = useState(0);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const asaasToken = localStorage.getItem('asaasToken') || '';
        const asaasEnv = localStorage.getItem('asaasEnv') || 'sandbox';
        const headers = { 'X-Asaas-Token': asaasToken, 'X-Asaas-Env': asaasEnv };

        const [devicesRes, groupsRes, positionsRes, summaryRes, overdueRes, eventsRes] = await Promise.all([
          fetch('/api/traccar/devices/'),
          fetch('/api/traccar/entity/groups/'),
          fetch('/api/traccar/positions/'),
          fetch('/api/dashboard-v2/'),
          fetch('/api/asaas/overdue-customers/', { headers: asaasToken ? headers : {} }),
          fetch('/api/traccar/events/'),
        ]);

        const devicesData = await devicesRes.json();
        const groupsData = groupsRes.ok ? await groupsRes.json() : [];
        const positionsData = await positionsRes.json();

        setDevices(Array.isArray(devicesData) ? devicesData : []);
        setGroups(Array.isArray(groupsData) ? groupsData : []);
        setPositions(Array.isArray(positionsData) ? positionsData : []);

        if (summaryRes.ok) {
          const summary = await summaryRes.json();
          setFinancial(summary?.faturamento || { receber: 0, a_pagar: 0 });
        }

        setEvents(eventsRes.ok ? await eventsRes.json() : []);

        if (overdueRes?.ok) {
          setOverdueData(await overdueRes.json());
        }

        setSnapshotTime(Date.now());
      } catch (err) {
        console.error('Erro ao carregar dashboard:', err);
      }
    };

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 10000);
    return () => clearInterval(interval);
  }, []);

  const positionByDeviceId = useMemo(() => {
    const map = {};
    positions.forEach((position) => {
      map[position.deviceId] = position;
    });
    return map;
  }, [positions]);

  const groupById = useMemo(() => {
    const map = {};
    groups.forEach((group) => {
      map[group.id] = group;
    });
    return map;
  }, [groups]);

  const enrichedDevices = useMemo(() => {
    return devices.map((device) => {
      const position = positionByDeviceId[device.id];
      const attrs = {
        ...(position?.attributes || {}),
        ...(device.attributes || {}),
      };
      const groupName = groupById[device.groupId]?.name || '';
      return {
        ...device,
        position,
        attributes: attrs,
        speedKmh: Math.round((position?.speed || 0) * 1.852),
        lastContact: device.lastUpdate || position?.serverTime || position?.deviceTime,
        trackerLabel: device.uniqueId || attrs.uniqueId || 'Sem identificador',
        customerName:
          attrs.customerName ||
          attrs.customer ||
          attrs.clienteNome ||
          attrs.cliente ||
          groupName ||
          '',
      };
    });
  }, [devices, groupById, positionByDeviceId]);

  const stats = useMemo(() => {
    const total = enrichedDevices.length;
    const online = enrichedDevices.filter((d) => d.status === 'online').length;
    const offline = total - online;
    const moving = enrichedDevices.filter((d) => d.speedKmh > 0).length;

    const now = snapshotTime || 0;
    const oneDay = 24 * 60 * 60 * 1000;
    const twoDays = 48 * 60 * 60 * 1000;

    const offlineOver24h = enrichedDevices.filter((d) => {
      if (d.status === 'online') return false;
      const t = d.lastContact ? new Date(d.lastContact).getTime() : NaN;
      if (Number.isNaN(t)) return true;
      return now - t > oneDay;
    }).length;

    const offlineOver48h = enrichedDevices.filter((d) => {
      if (d.status === 'online') return false;
      const t = d.lastContact ? new Date(d.lastContact).getTime() : NaN;
      if (Number.isNaN(t)) return true;
      return now - t > twoDays;
    }).length;

    const realEvents = Array.isArray(events) ? events : [];
    const alertsActive = realEvents.length;
    const geofenceViolations = realEvents.filter(
      (e) => e.type === 'geofenceEnter' || e.type === 'geofenceExit'
    ).length;

    const overdueCustomers = Array.isArray(overdueData.customers) ? overdueData.customers : [];

    return {
      total,
      online,
      offline,
      moving,
      offlineOver24h,
      offlineOver48h,
      alertsActive,
      geofenceViolations,
      overdueCount: overdueData.total_in_debt ?? overdueCustomers.length,
      overdueTotalValue: overdueData.total_value ?? 0,
      overdueCustomers,
    };
  }, [enrichedDevices, events, overdueData, snapshotTime]);

  const statusDonut = useMemo(() => {
    const segments = [
      { label: 'Online', value: stats.online, color: '#49a94f' },
      { label: 'Offline', value: stats.offline, color: '#d86457' },
      { label: 'Em movimento', value: stats.moving, color: '#2563eb' },
    ];
    return {
      segments,
      gradient: buildDonutGradient(segments),
    };
  }, [stats]);

  const statusBars = useMemo(() => [
    { label: 'Online', value: stats.online, color: '#49a94f' },
    { label: 'Offline', value: stats.offline, color: '#d86457' },
    { label: 'Em movimento', value: stats.moving, color: '#2563eb' },
  ], [stats]);

  const recentDevices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...enrichedDevices]
      .sort((a, b) => new Date(b.lastContact || 0) - new Date(a.lastContact || 0))
      .filter((device) => {
        if (!q) return true;
        const hay = [
          device.name,
          device.trackerLabel,
          device.customerName,
          device.status,
        ].join(' ').toLowerCase();
        return hay.includes(q);
      });
  }, [enrichedDevices, searchQuery]);

  const getStatusPresentation = (device) => {
    if (device.status !== 'online') {
      return { label: 'Offline', color: '#d86457' };
    }
    if (device.speedKmh > 0) {
      return { label: 'Online', color: '#49a94f' };
    }
    return { label: 'Parado', color: '#71717a' };
  };

  const metricCards = [
    {
      key: 'total',
      label: 'Equipamentos',
      value: stats.total,
      sub: stats.total ? '100% da base' : 'Nenhum cadastrado',
      IconCustom: TrackerIcon,
      iconColor: 'currentColor',
    },
    {
      key: 'online',
      label: 'Online',
      value: stats.online,
      sub: `${pct(stats.online, stats.total)}% conectados`,
      icon: CheckCircle2,
      iconColor: '#49a94f',
    },
    {
      key: 'offline',
      label: 'Offline',
      value: stats.offline,
      sub: `${pct(stats.offline, stats.total)}% sem conexão`,
      icon: XCircle,
      iconColor: '#d86457',
    },
    {
      key: 'moving',
      label: 'Em movimento',
      value: stats.moving,
      sub: `${pct(stats.moving, stats.total)}% da frota`,
      icon: Navigation,
      iconColor: '#2563eb',
    },
    {
      key: 'alerts',
      label: 'Alertas ativos',
      value: stats.alertsActive,
      sub: 'Requerem atenção',
      icon: TriangleAlert,
      iconColor: '#7748d8',
    },
    {
      key: 'geofence',
      label: 'Cercas violadas',
      value: stats.geofenceViolations,
      sub: 'Violações atuais',
      icon: Fence,
      iconColor: '#7748d8',
    },
  ];

  return (
    <div className="dash-rast">
      <div className="dash-rast__inner">
        <div className="dash-rast__grid">
          {metricCards.map((card) => (
            <MetricCard key={card.key} {...card} />
          ))}
        </div>

        <section className="dash-rast__section">
          <h2>Status dos equipamentos</h2>
          <div className="dash-rast__section-sub">Distribuição atual da frota</div>

          <div className="dash-rast__status-wrap">
            <div className="dash-rast__donut-wrap">
              <div
                className="dash-rast__donut"
                style={{ background: statusDonut.gradient }}
              />
              <div className="dash-rast__donut-center">
                <div>
                  <strong>{fmtNum(stats.total)}</strong>
                  <span>total</span>
                </div>
              </div>
            </div>

            <div className="dash-rast__status-list">
              {statusBars.map((row) => (
                <div className="dash-rast__status-row" key={row.label}>
                  <div className="line-one">
                    <span>{row.label}</span>
                    <strong>{fmtNum(row.value)}</strong>
                  </div>
                  <div className="dash-rast__bar">
                    <div
                      className="dash-rast__bar-fill"
                      style={{
                        width: stats.total ? `${(row.value / stats.total) * 100}%` : '0%',
                        background: row.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="dash-rast__panels">
          <div className="dash-rast__critical-stack">
            <section className="dash-rast__section dash-rast__section--critical">
              <h2>Situações críticas</h2>
              <div className="dash-rast__section-sub">Alertas ativos</div>
              <div className="dash-rast__critical-single">
                <div className="dash-rast__ring" style={{ color: '#7748d8' }}>
                  <strong>{fmtNum(stats.alertsActive)}</strong>
                </div>
                <div className="dash-rast__critical-label">Alertas</div>
              </div>
            </section>

            <CompactMetricCard
              label="Off há +48h"
              value={stats.offlineOver48h}
              sub={`${pct(stats.offlineOver48h, stats.total)}% da base`}
              icon={Clock}
              iconColor="#d86457"
            />

            <CompactMetricCard
              label="Off há +24h"
              value={stats.offlineOver24h}
              sub={`${pct(stats.offlineOver24h, stats.total)}% da base`}
              icon={Clock}
              iconColor="#d86457"
            />
          </div>

          <section className="dash-rast__section dash-rast__section--overdue">
            <div className="dash-rast__panel-head">
              <div>
                <h2>Clientes inadimplentes</h2>
                <div className="dash-rast__section-sub">
                  {stats.overdueCount
                    ? `${stats.overdueCount} cliente(s) • ${fmtBRL(stats.overdueTotalValue)} em atraso`
                    : 'Nenhum cliente inadimplente'}
                </div>
              </div>
            </div>

            <div className="dash-rast__overdue-list">
              {stats.overdueCustomers.length === 0 ? (
                <div className="dash-rast__empty">Nenhum cliente inadimplente.</div>
              ) : (
                stats.overdueCustomers.map((customer) => (
                  <div className="dash-rast__overdue-item" key={customer.asaas_id}>
                    <div className="dash-rast__overdue-info">
                      <strong>{customer.name || 'Cliente sem nome'}</strong>
                      <span className="dash-rast__overdue-days">
                        {customer.max_days_overdue} dia(s) em atraso
                      </span>
                    </div>
                    <div className="dash-rast__overdue-value">
                      {fmtBRL(customer.total_value)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="dash-rast__section dash-rast__section--finance">
            <div className="dash-rast__panel-head">
              <div>
                <h2>Financeiro</h2>
                <div className="dash-rast__section-sub">Contas a receber e pagar</div>
              </div>
              <div className="dash-rast__finance-icon">
                <Wallet fill="currentColor" stroke="currentColor" strokeWidth={1.5} size={20} />
              </div>
            </div>

            <div className="dash-rast__finance-grid">
              <div className="dash-rast__finance-item dash-rast__finance-item--receive">
                <span>A receber</span>
                <strong>{fmtBRL(financial.receber)}</strong>
              </div>
              <div className="dash-rast__finance-item dash-rast__finance-item--pay">
                <span>A pagar</span>
                <strong>{fmtBRL(financial.a_pagar)}</strong>
              </div>
            </div>
          </section>
        </div>

        <section className="dash-rast__section dash-rast__section--recent">
          <div className="dash-rast__recent-head">
            <div>
              <h2>Equipamentos recentes</h2>
              <div className="dash-rast__section-sub">Últimas comunicações recebidas</div>
            </div>
            <input
              className="dash-rast__search"
              type="search"
              placeholder="Buscar veículo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="dash-rast__table-wrap">
            <table className="dash-rast__table">
              <thead>
                <tr>
                  <th>Veículo</th>
                  <th>Status</th>
                  <th>Velocidade</th>
                  <th>Última comunicação</th>
                </tr>
              </thead>
              <tbody>
                {recentDevices.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="dash-rast__empty">
                        {searchQuery.trim()
                          ? 'Nenhum veículo encontrado para esta busca.'
                          : 'Sem equipamentos para exibir.'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  recentDevices.map((device) => {
                    const status = getStatusPresentation(device);
                    return (
                      <tr key={device.id}>
                        <td>
                          <strong>{device.name || 'Sem nome'}</strong>
                          <small>
                            {device.trackerLabel}
                            {device.customerName ? ` • ${device.customerName}` : ''}
                          </small>
                        </td>
                        <td>
                          <span className="dash-rast__status-dot" style={{ color: status.color }}>
                            {status.label}
                          </span>
                        </td>
                        <td>
                          {device.status === 'online' ? `${device.speedKmh} km/h` : '—'}
                        </td>
                        <td>{formatRelativeContact(device.lastContact)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
