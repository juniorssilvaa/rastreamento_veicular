import React, { useMemo, useState, useEffect } from 'react';
import './Dashboard.css';
import { Car, CarFront, Fence, Gauge, LocateFixed, Navigation, Signal, TriangleAlert, WifiOff } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const Dashboard = () => {
  const [devices, setDevices] = useState([]);
  const [groups, setGroups] = useState([]);
  const [positions, setPositions] = useState([]);
  const [lastSync, setLastSync] = useState(null);
  const [financial, setFinancial] = useState({ receber: 0, a_pagar: 0 });
  const [overdueData, setOverdueData] = useState({ total_in_debt: 0, total_value: 0, customers: [] });
  const [events, setEvents] = useState([]);

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
          fetch('/api/traccar/events/')
        ]);

        const devicesData = await devicesRes.json();
        const groupsData = groupsRes.ok ? await groupsRes.json() : [];
        const positionsData = await positionsRes.json();
        const summaryData = await summaryRes.json();

        setDevices(devicesData);
        setGroups(Array.isArray(groupsData) ? groupsData : []);
        setPositions(positionsData);
        setFinancial(summaryData?.faturamento || { receber: 0, a_pagar: 0 });
        setEvents(eventsRes.ok ? await eventsRes.json() : []);
        
        if (overdueRes && overdueRes.ok) {
            const overdueJson = await overdueRes.json();
            setOverdueData(overdueJson);
        }

        setLastSync(new Date());
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
        ignition: attrs.ignition === true || attrs.motion === true,
        lastContact: device.lastUpdate || position?.serverTime || position?.deviceTime,
        customerName:
          attrs.customerName ||
          attrs.customer ||
          attrs.clienteNome ||
          attrs.cliente ||
          groupName ||
          'Sem cliente',
        photo: attrs.foto || attrs.iconUrl || '',
      };
    });
  }, [devices, groupById, positionByDeviceId]);

  const kpis = useMemo(() => {
    const total = enrichedDevices.length;
    const online = enrichedDevices.filter((d) => d.status === 'online').length;
    const offline = total - online;
    const movingDevices = enrichedDevices.filter((d) => d.speedKmh > 0);
    const moving = movingDevices.length;
    const withGps = enrichedDevices.filter((d) => Boolean(d.position?.latitude && d.position?.longitude)).length;
    const avgSpeed = moving
      ? Math.round(movingDevices.reduce((sum, d) => sum + d.speedKmh, 0) / moving)
      : 0;

    const criticalTypes = new Set(['alarm', 'deviceOverspeed', 'deviceFuelDrop', 'geofenceExit']);
    const realEvents = Array.isArray(events) ? events : [];
    const alertsActive = realEvents.length;
    const alertsCritical = realEvents.filter((e) => criticalTypes.has(e.type)).length;
    const geofenceViolations = realEvents.filter(
      (e) => e.type === 'geofenceEnter' || e.type === 'geofenceExit'
    ).length;

    return {
      total,
      online,
      offline,
      moving,
      withGps,
      avgSpeed,
      alertsActive,
      alertsCritical,
      geofenceViolations,
    };
  }, [enrichedDevices, events]);

  const devicePortfolio = useMemo(() => {
    const total = enrichedDevices.length;
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const fifteenMin = 15 * 60 * 1000;
    const oneDay = 24 * 60 * 60 * 1000;

    const inStock = enrichedDevices.filter((d) => {
      const attrs = d.attributes || {};
      return attrs.inStock === true || attrs.stock === true || attrs.emEstoque === true;
    }).length;

    const maintenance = enrichedDevices.filter((d) => {
      const attrs = d.attributes || {};
      return (
        attrs.maintenance === true ||
        attrs.manutencao === true ||
        attrs.status === 'maintenance' ||
        attrs.status === 'manutencao'
      );
    }).length;

    const technicians = enrichedDevices.filter((d) => {
      const attrs = d.attributes || {};
      return attrs.technician === true || attrs.tecnico === true;
    }).length;

    const movingOnline = enrichedDevices.filter(
      (d) => d.status === 'online' && d.speedKmh > 0
    ).length;

    const stoppedOnline = enrichedDevices.filter(
      (d) => d.status === 'online' && d.speedKmh === 0
    ).length;

    const staleOnline = enrichedDevices.filter((d) => {
      if (d.status !== 'online') return false;
      const t = d.lastContact ? new Date(d.lastContact).getTime() : NaN;
      if (Number.isNaN(t)) return true;
      return now - t > fifteenMin;
    }).length;

    const offline = enrichedDevices.filter((d) => d.status !== 'online').length;

    const criticalOffline = enrichedDevices.filter((d) => {
      if (d.status === 'online') return false;
      const t = d.lastContact ? new Date(d.lastContact).getTime() : NaN;
      if (Number.isNaN(t)) return true;
      return now - t > oneDay;
    }).length;

    const donutData = [
      { name: 'Parado (online)', value: stoppedOnline, color: '#6e56e0' },
      { name: 'Em movimento', value: movingOnline, color: '#22c55e' },
      { name: 'Offline', value: offline, color: '#74b9ff' },
      { name: 'Manutenção', value: maintenance, color: '#f38a2b' },
      { name: 'Em estoque', value: inStock, color: '#007ee5' },
    ].filter((s) => s.value > 0);

    const onlinePct = total ? Math.round((stoppedOnline + movingOnline) * 1000 / total) / 10 : 0;

    return {
      total,
      offline,
      inStock,
      maintenance,
      technicians,
      donutData,
      movingOnline,
      stoppedOnline,
      staleOnline,
      criticalOffline,
      onlinePct,
    };
  }, [enrichedDevices]);

  const statusChartData = [
    { name: 'Online', value: kpis.online, color: '#10b981' },
    { name: 'Offline', value: kpis.offline, color: '#DC2626' },
  ];

  const operationChartData = [
    { name: 'Em movimento', total: kpis.moving },
    { name: 'Parados', total: Math.max(kpis.total - kpis.moving, 0) },
    { name: 'Com GPS', total: kpis.withGps },
  ];

  const latestDevices = [...enrichedDevices]
    .sort((a, b) => new Date(b.lastContact || 0) - new Date(a.lastContact || 0))
    .slice(0, 6);

  const [now] = useState(() => Date.now());
  const offlineHighlights = useMemo(() => {
    const oneDay = 24 * 60 * 60 * 1000;
    const twoDays = 48 * 60 * 60 * 1000;

    const offlineDevices = enrichedDevices
      .filter((device) => device.status !== 'online')
      .map((device) => {
        const lastContactTs = device.lastContact ? new Date(device.lastContact).getTime() : NaN;
        const offlineDurationMs = Number.isNaN(lastContactTs) ? Number.POSITIVE_INFINITY : Math.max(now - lastContactTs, 0);

        return {
          ...device,
          offlineDurationMs,
        };
      })
      .sort((a, b) => b.offlineDurationMs - a.offlineDurationMs);

    return {
      over24h: offlineDevices.filter(
        (device) => device.offlineDurationMs > oneDay && device.offlineDurationMs <= twoDays
      ),
      over48h: offlineDevices.filter((device) => device.offlineDurationMs > twoDays),
    };
  }, [enrichedDevices]);

  const formatLastContact = (dateValue) => {
    if (!dateValue) return 'Sem comunicação';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 'Sem comunicação';
    return date.toLocaleString('pt-BR');
  };

  const formatOfflineDuration = (durationMs) => {
    if (!Number.isFinite(durationMs)) return 'Sem registro de comunicação';

    const totalHours = Math.floor(durationMs / (60 * 60 * 1000));
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    if (days > 0) {
      return `${days}d ${hours}h offline`;
    }

    return `${totalHours}h offline`;
  };

  const renderOfflineList = (devicesList, emptyText) => {
    if (!devicesList.length) {
      return <div className="empty-state-overdue">{emptyText}</div>;
    }

    return devicesList.slice(0, 8).map((device) => (
      <div className="offline-device-item" key={`${device.id}-${device.lastContact || 'sem-contato'}`}>
        <div className="offline-device-photo">
          {device.photo ? (
            <img src={device.photo} alt={device.name} />
          ) : (
            <Car size={18} />
          )}
        </div>
        <div className="offline-device-info">
          <strong>{device.name}</strong>
          <span>{device.customerName}</span>
          <small>{formatOfflineDuration(device.offlineDurationMs)}</small>
        </div>
        <div className="offline-device-meta">
          <span>Última comunicação</span>
          <strong>{formatLastContact(device.lastContact)}</strong>
        </div>
      </div>
    ));
  };

  return (
    <div className="dashboard-v2">


      <section className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-body">
            <p className="kpi-label">Equipamentos</p>
            <strong className="kpi-value">{kpis.total}</strong>
            <span className="kpi-trend">Total cadastrados</span>
          </div>
          <div className="kpi-icon" aria-hidden>
            <CarFront size={22} strokeWidth={2} />
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-body">
            <p className="kpi-label">Online</p>
            <strong className="kpi-value">{kpis.online}</strong>
            <span className="kpi-trend">Conectados agora</span>
          </div>
          <div className="kpi-icon" aria-hidden>
            <Signal size={22} strokeWidth={2} />
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-body">
            <p className="kpi-label">Offline</p>
            <strong className="kpi-value">{kpis.offline}</strong>
            <span className="kpi-trend">Sem comunicação</span>
          </div>
          <div className="kpi-icon" aria-hidden>
            <WifiOff size={22} strokeWidth={2} />
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-body">
            <p className="kpi-label">Em movimento</p>
            <strong className="kpi-value">{kpis.moving}</strong>
            <span className="kpi-trend">Velocidade maior que 0</span>
          </div>
          <div className="kpi-icon" aria-hidden>
            <Navigation size={22} strokeWidth={2} />
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-body">
            <p className="kpi-label">Com GPS</p>
            <strong className="kpi-value">{kpis.withGps}</strong>
            <span className="kpi-trend">Posição válida</span>
          </div>
          <div className="kpi-icon" aria-hidden>
            <LocateFixed size={22} strokeWidth={2} />
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-body">
            <p className="kpi-label">Velocidade média</p>
            <strong className="kpi-value">{kpis.avgSpeed} <span className="kpi-unit">km/h</span></strong>
            <span className="kpi-trend">Frota em movimento</span>
          </div>
          <div className="kpi-icon" aria-hidden>
            <Gauge size={22} strokeWidth={2} />
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-body">
            <p className="kpi-label">Alertas ativos</p>
            <strong className="kpi-value">{kpis.alertsActive}</strong>
            <span className="kpi-trend">{kpis.alertsCritical} críticos</span>
          </div>
          <div className="kpi-icon" aria-hidden>
            <TriangleAlert size={22} strokeWidth={2} />
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-body">
            <p className="kpi-label">Cercas violadas</p>
            <strong className="kpi-value">{kpis.geofenceViolations}</strong>
            <span className="kpi-trend">Últimas 24 horas</span>
          </div>
          <div className="kpi-icon" aria-hidden>
            <Fence size={22} strokeWidth={2} />
          </div>
        </div>
      </section>

      <section className="devices-overview-section">
        <div className="overview-grid">
          <div className="overview-column">
            <p className="devices-overview-label">Dispositivos</p>
            <div className="card-box devices-overview-card">
              <div className="devices-overview-head">
                <h3 className="box-title flat">Visão operacional</h3>
                <div className="devices-total-pill">
                  <span>Total</span>
                  <strong>{devicePortfolio.total}</strong>
                </div>
              </div>
              <div className="devices-donut-wrap">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={devicePortfolio.donutData.length ? devicePortfolio.donutData : [{ name: 'Sem dados', value: 1, color: '#e5e7eb' }]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={72}
                      outerRadius={96}
                      paddingAngle={2}
                    >
                      {(devicePortfolio.donutData.length ? devicePortfolio.donutData : [{ name: 'Sem dados', value: 1, color: '#e5e7eb' }]).map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="devices-donut-center">
                  <strong>{devicePortfolio.onlinePct}%</strong>
                  <span>Online na frota</span>
                </div>
              </div>

              <div className="status-bar-list">
                <div className="status-bar online">
                  <span>Online (parado)</span>
                  <strong>{devicePortfolio.stoppedOnline}</strong>
                </div>
                <div className="status-bar moving">
                  <span>Em movimento</span>
                  <strong>{devicePortfolio.movingOnline}</strong>
                </div>
                <div className="status-bar stale">
                  <span>Online sem pacote &gt; 15 min</span>
                  <strong>{devicePortfolio.staleOnline}</strong>
                </div>
                <div className="status-bar offline">
                  <span>Offline</span>
                  <strong>{devicePortfolio.offline}</strong>
                </div>
                <div className="status-bar critical">
                  <span>Offline crítico &gt; 24 h</span>
                  <strong>{devicePortfolio.criticalOffline}</strong>
                </div>
                <div className="status-bar stock">
                  <span>Em estoque</span>
                  <strong>{devicePortfolio.inStock}</strong>
                </div>
                <div className="status-bar tech">
                  <span>Técnicos (atributo)</span>
                  <strong>{devicePortfolio.technicians}</strong>
                </div>
                <div className="status-bar maintenance">
                  <span>Manutenção</span>
                  <strong>{devicePortfolio.maintenance}</strong>
                </div>
              </div>
            </div>
          </div>
          
          <div className="overview-column">
            <p className="devices-overview-label">Inadimplência</p>
            <div className="card-box overdue-customers-card">
              <div className="devices-overview-head">
                <h3 className="box-title flat">Clientes Inadimplentes</h3>
                <div className="devices-total-pill overdue-total-pill">
                  <span>Total em Atraso</span>
                  <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(overdueData.total_value || 0)}</strong>
                </div>
              </div>
              
              <div className="overdue-list">
                {overdueData.customers && overdueData.customers.length > 0 ? (
                  overdueData.customers.map(c => (
                    <div className="overdue-item" key={c.asaas_id}>
                      <div className="overdue-item-info">
                        <strong>{c.name}</strong>
                        <span className="overdue-badge">{c.max_days_overdue} dias de atraso</span>
                      </div>
                      <div className="overdue-item-value">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(c.total_value)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state-overdue">Nenhum cliente inadimplente.</div>
                )}
              </div>
            </div>

            <div className="card-box offline-watch-card">
              <div className="devices-overview-head">
                <h3 className="box-title flat">Off há mais de 24h</h3>
                <div className="devices-total-pill offline-watch-pill">
                  <span>Veículos</span>
                  <strong>{offlineHighlights.over24h.length}</strong>
                </div>
              </div>
              <div className="offline-watch-list">
                {renderOfflineList(offlineHighlights.over24h, 'Nenhum veículo offline há mais de 24 horas.')}
              </div>
            </div>

            <div className="card-box offline-watch-card">
              <div className="devices-overview-head">
                <h3 className="box-title flat">Off há mais de 48h</h3>
                <div className="devices-total-pill offline-watch-pill offline-watch-pill-critical">
                  <span>Veículos</span>
                  <strong>{offlineHighlights.over48h.length}</strong>
                </div>
              </div>
              <div className="offline-watch-list">
                {renderOfflineList(offlineHighlights.over48h, 'Nenhum veículo offline há mais de 48 horas.')}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="dashboard-top-row">
        <div className="card-box">
          <h3 className="box-title">Status da Frota</h3>
          <div className="pie-wrap">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  dataKey="value"
                  nameKey="name"
                  cx="45%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {statusChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                <Legend formatter={(value) => <span style={{ color: 'var(--text-primary)' }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-box">
          <h3 className="box-title">Operação</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={operationChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
              <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <YAxis allowDecimals={false} stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)' }} />
              <Bar dataKey="total" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="dashboard-bottom-row">
        <div className="card-box">
          <h3 className="box-title">Equipamentos Recentes</h3>
          <div className="device-table">
            <div className="table-head">
              <span>Veículo</span>
              <span>Status</span>
              <span>Velocidade</span>
              <span>Última comunicação</span>
            </div>
            {latestDevices.map((device) => (
              <div className="table-row" key={device.id}>
                <span>{device.name}</span>
                <span className={`status-pill ${device.status === 'online' ? 'online' : 'offline'}`}>
                  {device.status === 'online' ? 'Online' : 'Offline'}
                </span>
                <span>{device.speedKmh} km/h</span>
                <span>{formatLastContact(device.lastContact)}</span>
              </div>
            ))}
            {latestDevices.length === 0 && (
              <p className="empty-devices">Sem equipamentos para exibir.</p>
            )}
          </div>
        </div>

        <div className="card-box">
          <h3 className="box-title">Financeiro (placeholder para módulo comercial)</h3>
          <div className="financial-panel">
            <div>
              <p>A receber</p>
              <strong>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financial.receber)}
              </strong>
            </div>
            <div>
              <p>Contas a pagar</p>
              <strong>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(financial.a_pagar)}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
