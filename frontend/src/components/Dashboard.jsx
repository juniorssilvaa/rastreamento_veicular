import React, { useMemo, useState, useEffect } from 'react';
import './Dashboard.css';
import { Activity, Gauge, MapPin, Wifi, WifiOff } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const Dashboard = () => {
  const [devices, setDevices] = useState([]);
  const [positions, setPositions] = useState([]);
  const [lastSync, setLastSync] = useState(null);
  const [financial, setFinancial] = useState({ receber: 0, a_pagar: 0 });
  const [overdueData, setOverdueData] = useState({ total_in_debt: 0, total_value: 0, customers: [] });

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const asaasToken = localStorage.getItem('asaasToken') || '';
        const asaasEnv = localStorage.getItem('asaasEnv') || 'sandbox';
        const headers = { 'X-Asaas-Token': asaasToken, 'X-Asaas-Env': asaasEnv };

        const [devicesRes, positionsRes, summaryRes, overdueRes] = await Promise.all([
          fetch('/api/traccar/devices/'),
          fetch('/api/traccar/positions/'),
          fetch('/api/dashboard-v2/'),
          fetch('/api/asaas/overdue-customers/', { headers: asaasToken ? headers : {} })
        ]);

        const devicesData = await devicesRes.json();
        const positionsData = await positionsRes.json();
        const summaryData = await summaryRes.json();

        setDevices(devicesData);
        setPositions(positionsData);
        setFinancial(summaryData?.faturamento || { receber: 0, a_pagar: 0 });
        
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

  const enrichedDevices = useMemo(() => {
    return devices.map((device) => {
      const position = positionByDeviceId[device.id];
      const attrs = position?.attributes || {};
      return {
        ...device,
        position,
        speedKmh: Math.round((position?.speed || 0) * 1.852),
        ignition: attrs.ignition === true || attrs.motion === true,
        lastContact: device.lastUpdate || position?.serverTime || position?.deviceTime,
      };
    });
  }, [devices, positionByDeviceId]);

  const kpis = useMemo(() => {
    const total = enrichedDevices.length;
    const online = enrichedDevices.filter((d) => d.status === 'online').length;
    const offline = total - online;
    const moving = enrichedDevices.filter((d) => d.speedKmh > 0).length;
    const withGps = enrichedDevices.filter((d) => Boolean(d.position?.latitude && d.position?.longitude)).length;
    return { total, online, offline, moving, withGps };
  }, [enrichedDevices]);

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

  const formatLastContact = (dateValue) => {
    if (!dateValue) return 'Sem comunicação';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 'Sem comunicação';
    return date.toLocaleString('pt-BR');
  };

  return (
    <div className="dashboard-v2">
      <header className="dashboard-v2-header">
        <span className="sync-tag">
          Última atualização: {lastSync ? lastSync.toLocaleTimeString('pt-BR') : '--:--:--'}
        </span>
      </header>

      <section className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label"><Activity size={16} /> Equipamentos</div>
          <strong>{kpis.total}</strong>
          <span>Total cadastrados</span>
        </div>
        <div className="kpi-card online">
          <div className="kpi-label"><Wifi size={16} /> Online</div>
          <strong>{kpis.online}</strong>
          <span>Conectados agora</span>
        </div>
        <div className="kpi-card offline">
          <div className="kpi-label"><WifiOff size={16} /> Offline</div>
          <strong>{kpis.offline}</strong>
          <span>Sem comunicação</span>
        </div>
        <div className="kpi-card moving">
          <div className="kpi-label"><Gauge size={16} /> Em movimento</div>
          <strong>{kpis.moving}</strong>
          <span>Velocidade maior que zero</span>
        </div>
        <div className="kpi-card gps">
          <div className="kpi-label"><MapPin size={16} /> Com GPS</div>
          <strong>{kpis.withGps}</strong>
          <span>Com posição válida</span>
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
            <p className="devices-overview-label">Inadimplência (Asaas)</p>
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
