import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import './Relatorios.css';
import ReportLoadingOverlay from '../components/reports/ReportLoadingOverlay';
import RelatorioLigadoDesligado from '../components/reports/RelatorioLigadoDesligado';
import { getReportPeriodRange, runReportLoading } from '../utils/reportPeriod';
import {
  Zap,
  Info,
  History,
  Thermometer,
  Map,
  Gauge,
  Car,
  BarChart3,
  GitCompare,
  Hexagon,
  Receipt,
  Laptop,
  CalendarDays,
  Tag,
  ShieldCheck,
  Eye,
  FileText,
  Table2,
  CloudDownload,
  X,
  ChevronDown,
} from 'lucide-react';

const REPORT_SECTIONS = [
  {
    id: 'monitoramento',
    title: 'Monitoramento',
    reports: [
      { id: 'ligado-desligado', label: 'Ligado e desligado', sub: 'Ignição e motor', icon: Zap, color: '#e4a329' },
      { id: 'informacoes-gerais', label: 'Informações Gerais', sub: 'Resumo do veículo', icon: Info, color: '#2563eb' },
      { id: 'historico', label: 'Histórico', sub: 'Posições registradas', icon: History, color: '#7748d8' },
      { id: 'sensores', label: 'Sensores', sub: 'Leituras e eventos', icon: Thermometer, color: '#d86457' },
      { id: 'rotas', label: 'Rotas', sub: 'Trajetos percorridos', icon: Map, color: '#49a94f' },
      { id: 'velocidade', label: 'Velocidade', sub: 'Excessos e médias', icon: Gauge, color: '#2563eb' },
      { id: 'dirigindo-parado', label: 'Dirigindo e parado', sub: 'Tempo em movimento', icon: Car, color: '#71717a' },
    ],
  },
  {
    id: 'analises',
    title: 'Análises',
    reports: [
      { id: 'dirigindo-simplificado', label: 'Dirigindo e parado simplificado', sub: 'Visão resumida', icon: BarChart3, color: '#7748d8' },
      { id: 'comparar-veiculos', label: 'Comparar veículos', sub: 'Side by side', icon: GitCompare, color: '#2563eb' },
      { id: 'cercas-perimetros', label: 'Cercas e Perímetros', sub: 'Entradas e saídas', icon: Hexagon, color: '#49a94f' },
      { id: 'despesas', label: 'Despesas', sub: 'Custos da frota', icon: Receipt, color: '#d86457' },
    ],
  },
  {
    id: 'avancado',
    title: 'Avançado',
    reports: [
      { id: 'comandos', label: 'Comandos', sub: 'Envios e respostas', icon: Laptop, color: '#71717a' },
      { id: 'eventos', label: 'Eventos', sub: 'Alertas do rastreador', icon: CalendarDays, color: '#7748d8' },
      { id: 'tag', label: 'Tag', sub: 'Identificadores', icon: Tag, color: '#2563eb' },
      { id: 'auditoria-logs', label: 'Auditoria de Logs', sub: 'Rastreabilidade', icon: ShieldCheck, color: '#49a94f' },
    ],
  },
];

const PERIOD_OPTIONS = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'ontem', label: 'Ontem' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: 'custom', label: 'Personalizado' },
];

const TIME_OPTIONS = [
  { value: 'full', label: 'Dia completo (00:00 – 23:59)' },
  { value: 'morning', label: 'Manhã (06:00 – 12:00)' },
  { value: 'afternoon', label: 'Tarde (12:00 – 18:00)' },
  { value: 'night', label: 'Noite (18:00 – 06:00)' },
];

const OUTPUT_OPTIONS = [
  { value: 'preview', label: 'Visualização', icon: Eye },
  { value: 'pdf', label: 'PDF', icon: FileText },
  { value: 'excel', label: 'Excel', icon: Table2 },
];

const ALL_REPORTS = REPORT_SECTIONS.flatMap((section) => section.reports);

const REPORT_API = {
  'ligado-desligado': '/api/traccar/reports/ligado-desligado/',
};

const ReportCard = ({ label, sub, icon: Icon, iconColor, active, onClick }) => (
  <button
    type="button"
    className={`rel-rast__card${active ? ' is-active' : ''}`}
    onClick={onClick}
  >
    <div className="rel-rast__metric-top">
      <div className="rel-rast__metric-label">{label}</div>
      <div className="rel-rast__metric-icon">
        <Icon stroke={iconColor} strokeWidth={2} size={22} />
      </div>
    </div>
    <div className="rel-rast__metric-sub">{sub}</div>
  </button>
);

const Relatorios = () => {
  const [devices, setDevices] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState('ligado-desligado');
  const [selectedDeviceIds, setSelectedDeviceIds] = useState([]);
  const [speedLimit, setSpeedLimit] = useState('120');
  const [period, setPeriod] = useState('hoje');
  const [timeRange, setTimeRange] = useState('full');
  const [outputFormat, setOutputFormat] = useState('preview');
  const [propagateDriver, setPropagateDriver] = useState(false);
  const [notifyMe, setNotifyMe] = useState(false);
  const [advancedSettings, setAdvancedSettings] = useState(false);
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [view, setView] = useState('catalog');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [reportData, setReportData] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        const res = await fetch('/api/traccar/devices/');
        if (!res.ok) return;
        const data = await res.json();
        setDevices(Array.isArray(data) ? data : []);
      } catch {
        setDevices([]);
      }
    };
    loadDevices();
  }, []);

  const selectedReport = useMemo(
    () => ALL_REPORTS.find((r) => r.id === selectedReportId) || ALL_REPORTS[0],
    [selectedReportId],
  );

  const selectedDevices = useMemo(
    () => devices.filter((d) => selectedDeviceIds.includes(d.id)),
    [devices, selectedDeviceIds],
  );

  const toggleDevice = (id) => {
    setSelectedDeviceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const removeDevice = (id) => {
    setSelectedDeviceIds((prev) => prev.filter((item) => item !== id));
  };

  const handleGenerate = async () => {
    if (selectedDeviceIds.length === 0) {
      toast.error('Selecione pelo menos um veículo.');
      return;
    }

    if (outputFormat !== 'preview') {
      toast('Exportação PDF/Excel em breve. Gerando visualização.', { icon: 'ℹ️' });
    }

    const reportType = selectedReportId === 'ligado-desligado' ? 'ligado-desligado' : 'ligado-desligado';
    const apiPath = REPORT_API[reportType];
    if (!apiPath) {
      toast.error('Este relatório ainda não possui visualização.');
      return;
    }

    const { from, to } = getReportPeriodRange(period, timeRange);
    const deviceId = selectedDeviceIds[0];

    setGenerating(true);
    setView('loading');
    setLoadingProgress(0);
    setReportData(null);

    const loader = runReportLoading(setLoadingProgress, 1400);

    try {
      const params = new URLSearchParams({
        deviceId: String(deviceId),
        from,
        to,
      });
      if (selectedReportId === 'velocidade' && speedLimit) {
        params.set('speedLimit', speedLimit);
      }

      const response = await fetch(`${apiPath}?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Falha ao gerar relatório');
      }

      const data = await response.json();
      data.meta = {
        ...data.meta,
        title: `Relatório de ${selectedReport.label}`,
      };
      await loader.finish();
      setReportData(data);
      setView('report');
    } catch {
      toast.error('Não foi possível gerar o relatório. Tente novamente.');
      setView('catalog');
    } finally {
      setGenerating(false);
    }
  };

  const handleBackToCatalog = () => {
    setView('catalog');
    setReportData(null);
    setLoadingProgress(0);
  };

  const showSpeedField = selectedReportId === 'velocidade';

  const SelectedIcon = selectedReport.icon;

  if (view === 'report' && reportData) {
    return (
      <div className="rel-rast rel-rast--report">
        <RelatorioLigadoDesligado data={reportData} onBack={handleBackToCatalog} />
      </div>
    );
  }

  return (
    <div className="rel-rast">
      {view === 'loading' && generating && (
        <ReportLoadingOverlay progress={loadingProgress} />
      )}
      <div className="rel-rast__layout">
        <div className="rel-rast__catalog">
          {REPORT_SECTIONS.map((section) => (
            <section key={section.id} className="rel-rast__section">
              <h2 className="rel-rast__section-title">{section.title}</h2>
              <div className="rel-rast__grid">
                {section.reports.map((report) => (
                  <ReportCard
                    key={report.id}
                    label={report.label}
                    sub={report.sub}
                    icon={report.icon}
                    iconColor={report.color}
                    active={selectedReportId === report.id}
                    onClick={() => setSelectedReportId(report.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="rel-rast__panel">
          <div className="rel-rast__panel-head">
            <h2>Dados do relatório</h2>
            <div className="rel-rast__panel-type">
              <SelectedIcon stroke={selectedReport.color} strokeWidth={2} size={18} />
              <span>{selectedReport.label}</span>
            </div>
          </div>

          <div className="rel-rast__field">
            <label>Veículos</label>
            <div className="rel-rast__devices">
              <button
                type="button"
                className="rel-rast__devices-toggle"
                onClick={() => setDevicesOpen((v) => !v)}
              >
                <span>
                  {selectedDevices.length
                    ? `${selectedDevices.length} veículo(s) selecionado(s)`
                    : 'Selecione os veículos'}
                </span>
                <ChevronDown size={16} className={devicesOpen ? 'is-open' : ''} />
              </button>

              {selectedDevices.length > 0 && (
                <div className="rel-rast__device-tags">
                  {selectedDevices.map((device) => (
                    <span key={device.id} className="rel-rast__device-tag">
                      {device.name || device.uniqueId}
                      <button type="button" onClick={() => removeDevice(device.id)} aria-label="Remover">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {devicesOpen && (
                <div className="rel-rast__devices-list">
                  {devices.length === 0 ? (
                    <div className="rel-rast__devices-empty">Nenhum veículo disponível.</div>
                  ) : (
                    devices.map((device) => (
                      <label key={device.id} className="rel-rast__device-option">
                        <input
                          type="checkbox"
                          checked={selectedDeviceIds.includes(device.id)}
                          onChange={() => toggleDevice(device.id)}
                        />
                        <span>{device.name || device.uniqueId}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {showSpeedField && (
            <div className="rel-rast__field">
              <label htmlFor="rel-speed">Velocidade (km/h)</label>
              <input
                id="rel-speed"
                type="number"
                min="1"
                value={speedLimit}
                onChange={(e) => setSpeedLimit(e.target.value)}
                className="rel-rast__input"
                placeholder="Ex: 120"
              />
              <button type="button" className="rel-rast__link-btn">Perímetros</button>
            </div>
          )}

          <div className="rel-rast__field">
            <label htmlFor="rel-period">Período que será analisado</label>
            <select
              id="rel-period"
              className="rel-rast__select"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="rel-rast__field">
            <label htmlFor="rel-time">Horário</label>
            <select
              id="rel-time"
              className="rel-rast__select"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              {TIME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="rel-rast__field">
            <label>O relatório será gerado em</label>
            <div className="rel-rast__outputs">
              {OUTPUT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`rel-rast__output${outputFormat === opt.value ? ' is-active' : ''}`}
                    onClick={() => setOutputFormat(opt.value)}
                  >
                    <Icon size={22} strokeWidth={1.8} />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rel-rast__checks">
            <label className="rel-rast__check">
              <input
                type="checkbox"
                checked={propagateDriver}
                onChange={(e) => setPropagateDriver(e.target.checked)}
              />
              Propagar motorista
            </label>
            <label className="rel-rast__check">
              <input
                type="checkbox"
                checked={notifyMe}
                onChange={(e) => setNotifyMe(e.target.checked)}
              />
              Deseja ser notificado?
            </label>
            <label className="rel-rast__check">
              <input
                type="checkbox"
                checked={advancedSettings}
                onChange={(e) => setAdvancedSettings(e.target.checked)}
              />
              Configurações avançadas
            </label>
          </div>

          <button type="button" className="rel-rast__generate" onClick={handleGenerate}>
            <CloudDownload size={18} />
            Gerar o relatório
          </button>
        </aside>
      </div>
    </div>
  );
};

export default Relatorios;
