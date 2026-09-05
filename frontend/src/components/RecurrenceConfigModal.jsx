import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Wallet,
  User,
  CreditCard,
  AlertTriangle,
  Tag,
  Search,
  CheckSquare,
  Plus,
  Pencil,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import CarIcon from './CarIcon';

const PLANS_KEY = 'bl_billing_plans';

const loadPlans = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(PLANS_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
};

const savePlans = (plans) => {
  localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
};

const photoOf = (device) =>
  device?.attributes?.foto ||
  device?.attributes?.photoUrl ||
  device?.attributes?.iconUrl ||
  device?.photo ||
  '';

const plateOf = (device) =>
  String(device?.attributes?.placa || device?.attributes?.plate || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();

const formatMoney = (value) => {
  const n = Number(value) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const RecurrenceConfigModal = ({
  customerName = '',
  vehicles = [],
  onClose,
  onGenerate,
  generating = false,
}) => {
  const [cycle, setCycle] = useState('');
  const [billingType, setBillingType] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [interest, setInterest] = useState('0');
  const [fineType, setFineType] = useState('PERCENTAGE');
  const [fine, setFine] = useState('0');
  const [discountDays, setDiscountDays] = useState('0');
  const [discountType, setDiscountType] = useState('FIXED');
  const [discount, setDiscount] = useState('0');

  const [plans, setPlans] = useState(loadPlans);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [planByDevice, setPlanByDevice] = useState({});

  const [planEditor, setPlanEditor] = useState(null); // { id?, name, value }

  const filteredVehicles = useMemo(() => {
    const term = vehicleSearch.trim().toLowerCase();
    return (vehicles || []).filter((d) => {
      if (!term) return true;
      const hay = [d.name, plateOf(d), d.uniqueId].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(term);
    });
  }, [vehicles, vehicleSearch]);

  const withPlanCount = useMemo(
    () => selectedIds.filter((id) => planByDevice[id]).length,
    [selectedIds, planByDevice]
  );

  const totalValue = useMemo(
    () => selectedIds.reduce((sum, id) => {
      const plan = plans.find((p) => p.id === planByDevice[id]);
      return sum + Number(plan?.value || 0);
    }, 0),
    [selectedIds, planByDevice, plans]
  );

  const toggleDevice = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const ids = filteredVehicles.map((d) => d.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
    }
  };

  const openNewPlan = () => setPlanEditor({ id: null, name: '', value: '' });

  const openEditPlan = () => {
    const firstSelected = selectedIds[0];
    const planId = firstSelected ? planByDevice[firstSelected] : plans[0]?.id;
    const plan = plans.find((p) => p.id === planId);
    if (!plan) {
      toast.error('Selecione um veículo com plano ou crie um plano primeiro.');
      return;
    }
    setPlanEditor({ id: plan.id, name: plan.name, value: String(plan.value) });
  };

  const savePlan = () => {
    const name = String(planEditor?.name || '').trim();
    const value = Number(planEditor?.value);
    if (!name) {
      toast.error('Informe o nome do plano.');
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Informe um valor válido para o plano.');
      return;
    }
    let next;
    if (planEditor.id) {
      next = plans.map((p) => (p.id === planEditor.id ? { ...p, name, value } : p));
    } else {
      next = [...plans, { id: `plan_${Date.now()}`, name, value }];
    }
    setPlans(next);
    savePlans(next);
    setPlanEditor(null);
    toast.success(planEditor.id ? 'Plano atualizado.' : 'Plano criado.');
  };

  const handleGenerate = () => {
    if (!cycle) {
      toast.error('Selecione a periodicidade da cobrança.');
      return;
    }
    if (!billingType) {
      toast.error('Selecione a forma de pagamento.');
      return;
    }
    if (!dueDate) {
      toast.error('Informe a data de vencimento.');
      return;
    }
    if (selectedIds.length === 0) {
      toast.error('Selecione ao menos um veículo.');
      return;
    }
    const missingPlan = selectedIds.some((id) => !planByDevice[id]);
    if (missingPlan) {
      toast.error('Defina um plano para cada veículo selecionado.');
      return;
    }
    if (totalValue <= 0) {
      toast.error('O valor da recorrência precisa ser maior que zero.');
      return;
    }

    const selectedVehicles = vehicles.filter((d) => selectedIds.includes(d.id)).map((d) => {
      const plan = plans.find((p) => p.id === planByDevice[d.id]);
      return { id: d.id, name: d.name, planName: plan?.name, planValue: plan?.value };
    });

    onGenerate({
      cycle,
      billing_type: billingType,
      due_date: dueDate,
      value: totalValue,
      interest,
      fine,
      fine_type: fineType,
      discount,
      discount_type: discountType,
      discount_days: discountDays,
      description: `Recorrência — ${selectedVehicles.map((v) => v.name).join(', ')}`,
      vehicles: selectedVehicles,
    });
  };

  return createPortal(
    <div className="rec-overlay" onClick={onClose}>
      <div className="rec-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header className="rec-head">
          <div>
            <Wallet size={18} />
            <h2>Recorrência de pagamento</h2>
          </div>
          <button type="button" className="rec-close" onClick={onClose} aria-label="Fechar">
            <X size={16} />
          </button>
        </header>

        <div className="rec-body">
          <section className="rec-card">
            <h3><User size={16} /> Informações do Cliente</h3>
            <div className="rec-client">{customerName || 'Cliente'}</div>
          </section>

          <section className="rec-card">
            <h3><CreditCard size={14} /> Configurações de Pagamento</h3>
            <div className="rec-grid rec-grid--3">
              <label>
                Periodicidade da cobrança
                <select value={cycle} onChange={(e) => setCycle(e.target.value)}>
                  <option value="">Selecione uma opção</option>
                  <option value="WEEKLY">Semanal</option>
                  <option value="BIWEEKLY">Quinzenal</option>
                  <option value="MONTHLY">Mensal</option>
                  <option value="BIMONTHLY">Bimestral</option>
                  <option value="QUARTERLY">Trimestral</option>
                  <option value="SEMIANNUALLY">Semestral</option>
                  <option value="YEARLY">Anual</option>
                </select>
              </label>
              <label>
                Forma de pagamento
                <select value={billingType} onChange={(e) => setBillingType(e.target.value)}>
                  <option value="">Selecione uma opção</option>
                  <option value="BOLETO">Boleto</option>
                  <option value="PIX">Pix</option>
                  <option value="CREDIT_CARD">Cartão de crédito</option>
                </select>
              </label>
              <label>
                Data de Vencimento
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </label>
            </div>
          </section>

          <section className="rec-card">
            <h3><AlertTriangle size={16} /> Juros e Multa</h3>
            <div className="rec-grid">
              <label>
                Juros para pagamento após o vencimento
                <input type="number" min="0" step="0.01" value={interest} onChange={(e) => setInterest(e.target.value)} />
              </label>
              <label>
                Tipo de multa
                <select value={fineType} onChange={(e) => setFineType(e.target.value)}>
                  <option value="PERCENTAGE">Percentual</option>
                  <option value="FIXED">Valor fixo</option>
                </select>
              </label>
              <label>
                Multa para pagamento após o vencimento
                <input type="number" min="0" step="0.01" value={fine} onChange={(e) => setFine(e.target.value)} />
              </label>
            </div>
          </section>

          <section className="rec-card">
            <h3><Tag size={16} /> Configurações de Desconto</h3>
            <div className="rec-grid">
              <label>
                Dias para desconto
                <input type="number" min="0" value={discountDays} onChange={(e) => setDiscountDays(e.target.value)} />
                <small>0 = até o vencimento, 1 = até um dia antes, etc.</small>
              </label>
              <label>
                Tipo de desconto
                <select value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                  <option value="FIXED">Valor fixo</option>
                  <option value="PERCENTAGE">Percentual</option>
                </select>
              </label>
              <label>
                Valor desconto
                <input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </label>
            </div>
          </section>

          <section className="rec-card">
            <h3>
              <CarIcon size={16} /> Seleção de Veículos
            </h3>
            <div className="rec-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Buscar veículos..."
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
              />
            </div>
            <div className="rec-vehicle-tools">
              <button type="button" className="rec-tool rec-tool--blue" onClick={selectAll}>
                <CheckSquare size={15} /> Selecionar Todos
              </button>
              <button type="button" className="rec-tool rec-tool--sky" onClick={openNewPlan}>
                <Plus size={15} /> Novo Plano
              </button>
              <button type="button" className="rec-tool rec-tool--teal" onClick={openEditPlan}>
                <Pencil size={15} /> Editar Plano
              </button>
            </div>
            <div className="rec-stats">
              <span>{vehicles.length} Total de Veículos</span>
              <span>{selectedIds.length} Selecionados</span>
              <span>{withPlanCount} Com Plano</span>
            </div>
            <div className="rec-vehicle-list">
              {filteredVehicles.length === 0 && (
                <div className="rec-empty">Nenhum veículo vinculado a este cliente.</div>
              )}
              {filteredVehicles.map((device) => {
                const checked = selectedIds.includes(device.id);
                const photo = photoOf(device);
                const planId = planByDevice[device.id] || '';
                const plan = plans.find((p) => p.id === planId);
                return (
                  <div key={device.id} className={`rec-vehicle ${checked ? 'is-selected' : ''}`}>
                    <label className="rec-vehicle__main">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDevice(device.id)}
                      />
                      <span className={`rec-vehicle__photo ${photo ? 'has-img' : ''}`}>
                        {photo ? <img src={photo} alt="" /> : <CarIcon size={18} />}
                      </span>
                      <span>
                        <strong>
                          {device.name}
                          {plateOf(device) ? ` ${plateOf(device)}` : ''}
                        </strong>
                        <small>IMEI: {device.uniqueId || '—'}</small>
                      </span>
                    </label>
                    <label className="rec-plan-field">
                      Nome do Plano:
                      <select
                        value={planId}
                        onChange={(e) => {
                          const nextPlan = e.target.value;
                          setPlanByDevice((prev) => ({ ...prev, [device.id]: nextPlan }));
                          if (nextPlan && !selectedIds.includes(device.id)) {
                            setSelectedIds((prev) => [...prev, device.id]);
                          }
                        }}
                      >
                        <option value="">Selecione um plano</option>
                        {plans.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </label>
                    <div className="rec-plan-value">Valor do Plano: {formatMoney(plan?.value)}</div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <footer className="rec-foot">
          <button type="button" className="rec-generate" disabled={generating} onClick={handleGenerate}>
            <Save size={16} />
            {generating ? 'Gerando...' : 'Gerar'}
          </button>
          <strong>Total: {formatMoney(totalValue)}</strong>
        </footer>

        {planEditor && (
          <div className="rec-plan-overlay" onClick={() => setPlanEditor(null)}>
            <div className="rec-plan-modal" onClick={(e) => e.stopPropagation()}>
              <h4>{planEditor.id ? 'Editar plano' : 'Novo plano'}</h4>
              <label>
                Nome do plano
                <input
                  type="text"
                  value={planEditor.name}
                  onChange={(e) => setPlanEditor((prev) => ({ ...prev, name: e.target.value }))}
                />
              </label>
              <label>
                Valor (R$)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={planEditor.value}
                  onChange={(e) => setPlanEditor((prev) => ({ ...prev, value: e.target.value }))}
                />
              </label>
              <div className="rec-plan-actions">
                <button type="button" onClick={() => setPlanEditor(null)}>Cancelar</button>
                <button type="button" className="is-primary" onClick={savePlan}>Salvar plano</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default RecurrenceConfigModal;
