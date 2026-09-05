import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  RefreshCw,
  CreditCard,
  Receipt,
  FileText,
  Link2,
  CheckCircle2,
  Send,
  Ban,
  Hourglass,
  Calendar,
  Loader2,
  Mail,
  MessageCircle,
  X,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import RecurrenceConfigModal from './RecurrenceConfigModal';

const STATUS_META = {
  PENDING: { label: 'Cobrança aguardando pagamento', tone: 'pending', Icon: Hourglass },
  OVERDUE: { label: 'Cobrança vencida', tone: 'overdue', Icon: Hourglass },
  RECEIVED: { label: 'Cobrança recebida', tone: 'paid', Icon: CheckCircle2 },
  CONFIRMED: { label: 'Cobrança confirmada', tone: 'paid', Icon: CheckCircle2 },
  RECEIVED_IN_CASH: { label: 'Recebida em dinheiro', tone: 'paid', Icon: CheckCircle2 },
  REFUNDED: { label: 'Estornada', tone: 'canceled', Icon: Ban },
  DELETED: { label: 'Cancelada', tone: 'canceled', Icon: Ban },
  REFUND_REQUESTED: { label: 'Estorno solicitado', tone: 'canceled', Icon: Ban },
};

const BILLING_LABEL = {
  BOLETO: 'Boleto',
  PIX: 'Pix',
  CREDIT_CARD: 'Cartão',
  DEBIT_CARD: 'Débito',
  TRANSFER: 'Transferência',
  DEPOSIT: 'Depósito',
  UNDEFINEDIDO: 'Recebido',
};

const CYCLE_LABEL = {
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quinzenal',
  MONTHLY: 'Mensal',
  BIMONTHLY: 'Bimestral',
  QUARTERLY: 'Trimestral',
  SEMIANNUALLY: 'Semestral',
  YEARLY: 'Anual',
};

const formatMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

const digitsOnly = (v) => String(v || '').replace(/\D/g, '');

const emptyCreate = () => ({
  value: '',
  due_date: '',
  billing_type: 'BOLETO',
  description: '',
  installments: '12',
  cycle: 'MONTHLY',
});

/**
 * Aba Financeiro do editor de cliente — faturas Asaas + ações.
 */
const ClienteFinanceiroTab = ({
  asaasId,
  customerEmail = '',
  customerPhone = '',
  customerName = '',
  vehicles = [],
  getAsaasHeaders,
  onFinanceUpdated,
}) => {
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [createKind, setCreateKind] = useState(null); // recorrencia | carne | avulsa
  const [createForm, setCreateForm] = useState(emptyCreate);
  const [creating, setCreating] = useState(false);

  const [resendPayment, setResendPayment] = useState(null);
  const [cancelPayment, setCancelPayment] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  const loadFinance = useCallback(async () => {
    if (!asaasId) {
      setPayments([]);
      setSubscriptions([]);
      return;
    }
    const { headers, asaasToken } = getAsaasHeaders();
    if (!asaasToken) {
      toast.error('Configure a integração financeira em Gerenciar → Integrações.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/asaas/customers/${asaasId}/finance/`, { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Não foi possível carregar as faturas.');
        return;
      }
      setPayments(Array.isArray(data.payments) ? data.payments : []);
      setSubscriptions(Array.isArray(data.subscriptions) ? data.subscriptions : []);
      onFinanceUpdated?.(data);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar financeiro.');
    } finally {
      setLoading(false);
    }
  }, [asaasId, getAsaasHeaders, onFinanceUpdated]);

  useEffect(() => {
    loadFinance();
  }, [loadFinance]);

  useEffect(() => {
    setPage(1);
  }, [payments.length]);

  const totalPages = Math.max(1, Math.ceil(payments.length / pageSize));
  const paged = useMemo(
    () => payments.slice((page - 1) * pageSize, page * pageSize),
    [payments, page]
  );

  const openCreate = (kind) => {
    if (!asaasId) {
      toast.error('Cliente ainda sem vínculo financeiro. Salve e sincronize o cliente primeiro.');
      return;
    }
    setCreateForm(emptyCreate());
    setCreateKind(kind);
  };

  const submitRecurrence = async (payload) => {
    const { headers, asaasToken } = getAsaasHeaders();
    if (!asaasToken) {
      toast.error('Integração financeira não configurada.');
      return;
    }
    setCreating(true);
    try {
      const body = {
        kind: 'recorrencia',
        customer: asaasId,
        value: payload.value,
        due_date: payload.due_date,
        billing_type: payload.billing_type,
        cycle: payload.cycle,
        description: payload.description,
        interest: payload.interest,
        fine: payload.fine,
        fine_type: payload.fine_type,
        discount: payload.discount,
        discount_type: payload.discount_type,
        discount_days: payload.discount_days,
      };
      const res = await fetch('/api/asaas/payments/', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.errors?.[0]?.description || data.error || 'Falha ao gerar recorrência.';
        throw new Error(msg);
      }
      toast.success('Recorrência gerada com sucesso!');
      setCreateKind(null);
      loadFinance();
    } catch (err) {
      toast.error(err.message || 'Erro ao gerar recorrência.');
    } finally {
      setCreating(false);
    }
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    const { headers, asaasToken } = getAsaasHeaders();
    if (!asaasToken) {
      toast.error('Integração financeira não configurada.');
      return;
    }
    setCreating(true);
    try {
      const body = {
        kind: createKind,
        customer: asaasId,
        value: createForm.value,
        due_date: createForm.due_date,
        billing_type: createForm.billing_type,
        description: createForm.description,
        installments: createForm.installments,
        cycle: createForm.cycle,
      };
      const res = await fetch('/api/asaas/payments/', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.errors?.[0]?.description || data.error || 'Falha ao criar cobrança.';
        throw new Error(msg);
      }
      toast.success(
        createKind === 'recorrencia'
          ? 'Recorrência criada!'
          : createKind === 'carne'
            ? 'Carnê criado!'
            : 'Cobrança avulsa criada!'
      );
      setCreateKind(null);
      loadFinance();
    } catch (err) {
      toast.error(err.message || 'Erro ao criar.');
    } finally {
      setCreating(false);
    }
  };

  const handleViewInvoice = (payment) => {
    const url = payment.invoiceUrl || payment.bankSlipUrl;
    if (!url) {
      toast.error('Fatura sem link disponível.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = async (payment) => {
    const url = payment.invoiceUrl || payment.bankSlipUrl;
    if (!url) {
      toast.error('Link da fatura indisponível.');
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link da fatura copiado.');
    } catch {
      window.prompt('Copie o link da fatura:', url);
    }
  };

  const handleMarkReceived = async (payment) => {
    if (!window.confirm('Marcar esta cobrança como recebida?')) return;
    const { headers, asaasToken } = getAsaasHeaders();
    if (!asaasToken) {
      toast.error('Integração financeira não configurada.');
      return;
    }
    setActionBusy(true);
    try {
      const res = await fetch(`/api/asaas/payments/${payment.id}/`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'receive', value: payment.value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.errors?.[0]?.description || data.error || 'Falha ao marcar recebida.');
      }
      toast.success('Cobrança marcada como recebida.');
      loadFinance();
    } catch (err) {
      toast.error(err.message || 'Erro ao marcar recebida.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleResendChannel = (channel) => {
    if (!resendPayment) return;
    const url = resendPayment.invoiceUrl || resendPayment.bankSlipUrl || '';
    const valor = formatMoney(resendPayment.value);
    const venc = formatDate(resendPayment.dueDate);
    const msg = `Olá${customerName ? ` ${customerName}` : ''}! Segue a cobrança BL Rastreamento no valor de ${valor}, vencimento ${venc}.${url ? ` Link: ${url}` : ''}`;

    if (channel === 'email') {
      const email = (customerEmail || '').trim();
      if (!email) {
        toast.error('Cliente sem e-mail cadastrado.');
        return;
      }
      const subject = encodeURIComponent(`Cobrança BL Rastreamento — ${valor}`);
      const body = encodeURIComponent(msg);
      window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
      toast.success('Abrindo e-mail...');
    } else {
      const phone = digitsOnly(customerPhone);
      if (!phone) {
        toast.error('Cliente sem telefone/WhatsApp cadastrado.');
        return;
      }
      const withCountry = phone.startsWith('55') ? phone : `55${phone}`;
      window.open(`https://wa.me/${withCountry}?text=${encodeURIComponent(msg)}`, '_blank');
      toast.success('Abrindo WhatsApp...');
    }
    setResendPayment(null);
  };

  const submitCancel = async (e) => {
    e.preventDefault();
    if (!cancelPayment) return;
    if (!cancelReason.trim()) {
      toast.error('Informe o motivo do cancelamento.');
      return;
    }
    const { headers, asaasToken } = getAsaasHeaders();
    if (!asaasToken) {
      toast.error('Integração financeira não configurada.');
      return;
    }
    setActionBusy(true);
    try {
      const res = await fetch(`/api/asaas/payments/${cancelPayment.id}/`, {
        method: 'DELETE',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.errors?.[0]?.description || data.error || 'Falha ao cancelar boleto.');
      }
      toast.success('Boleto cancelado.');
      setCancelPayment(null);
      setCancelReason('');
      loadFinance();
    } catch (err) {
      toast.error(err.message || 'Erro ao cancelar.');
    } finally {
      setActionBusy(false);
    }
  };

  const typeOfPayment = (p) => {
    if (p.subscription) return { label: 'Assinatura', Icon: RefreshCw };
    if (p.installment) return { label: 'Carnê', Icon: CreditCard };
    return { label: 'Avulso', Icon: Receipt };
  };

  const cycleOf = (p) => {
    if (!p.subscription) return '—';
    const sub = subscriptions.find((s) => s.id === p.subscription);
    const cycle = sub?.cycle || 'MONTHLY';
    return CYCLE_LABEL[cycle] || cycle;
  };

  const canReceive = (p) => ['PENDING', 'OVERDUE'].includes(p.status);
  const canCancel = (p) => ['PENDING', 'OVERDUE'].includes(p.status);

  if (!asaasId) {
    return (
      <div className="fin-empty">
        <Receipt size={28} />
        <p>Este cliente ainda não está vinculado ao financeiro.</p>
        <span>Salve e sincronize o cliente para gerenciar faturas aqui.</span>
      </div>
    );
  }

  return (
    <div className="fin-tab">
      <div className="fin-create-cards">
        <button type="button" className="fin-create-card fin-create-card--green" onClick={() => openCreate('recorrencia')}>
          <span className="fin-create-card__icon"><RefreshCw size={22} /></span>
          <span className="fin-create-card__text">
            <strong>Recorrência</strong>
            <small>Cadastre uma nova recorrência</small>
          </span>
          <span className="fin-create-card__plus"><Plus size={18} /></span>
        </button>
        <button type="button" className="fin-create-card fin-create-card--blue" onClick={() => openCreate('carne')}>
          <span className="fin-create-card__icon"><CreditCard size={22} /></span>
          <span className="fin-create-card__text">
            <strong>Carnê</strong>
            <small>Cadastre um novo carnê</small>
          </span>
          <span className="fin-create-card__plus"><Plus size={18} /></span>
        </button>
        <button type="button" className="fin-create-card fin-create-card--orange" onClick={() => openCreate('avulsa')}>
          <span className="fin-create-card__icon"><Receipt size={22} /></span>
          <span className="fin-create-card__text">
            <strong>Cobrança Avulsa</strong>
            <small>Cadastre uma nova cobrança</small>
          </span>
          <span className="fin-create-card__plus"><Plus size={18} /></span>
        </button>
      </div>

      <div className="fin-table-head">
        <h3>Faturas</h3>
        <button type="button" className="fin-refresh" onClick={loadFinance} disabled={loading}>
          {loading ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
          Atualizar
        </button>
      </div>

      <div className="fin-table-wrap">
        <table className="fin-table">
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Status</th>
              <th>Forma de pagamento</th>
              <th>Vencimento</th>
              <th>Periodicidade</th>
              <th>Valor</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && payments.length === 0 ? (
              <tr>
                <td colSpan={7} className="fin-td-empty">Carregando faturas...</td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={7} className="fin-td-empty">Nenhuma fatura encontrada neste cliente.</td>
              </tr>
            ) : (
              paged.map((p) => {
                const type = typeOfPayment(p);
                const status = STATUS_META[p.status] || {
                  label: p.status || '—',
                  tone: 'pending',
                  Icon: FileText,
                };
                const StatusIcon = status.Icon;
                const TypeIcon = type.Icon;
                return (
                  <tr key={p.id}>
                    <td>
                      <span className="fin-type">
                        <TypeIcon size={15} />
                        {type.label}
                      </span>
                    </td>
                    <td>
                      <span className={`fin-status fin-status--${status.tone}`}>
                        <StatusIcon size={14} />
                        {status.label}
                      </span>
                    </td>
                    <td>
                      <span className="fin-billing">
                        {BILLING_LABEL[p.billingType] || p.billingType || '—'}
                      </span>
                    </td>
                    <td>{formatDate(p.dueDate)}</td>
                    <td>
                      <span className="fin-cycle">
                        {p.subscription ? <Calendar size={14} /> : null}
                        {cycleOf(p)}
                      </span>
                    </td>
                    <td className="fin-value">{formatMoney(p.value)}</td>
                    <td>
                      <div className="fin-actions">
                        <button
                          type="button"
                          className="fin-act fin-act--view"
                          title="Visualizar fatura"
                          onClick={() => handleViewInvoice(p)}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          className="fin-act fin-act--link"
                          title="Link da fatura"
                          onClick={() => handleCopyLink(p)}
                        >
                          <Link2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="fin-act fin-act--receive"
                          title="Marcar como recebida"
                          disabled={!canReceive(p) || actionBusy}
                          onClick={() => handleMarkReceived(p)}
                        >
                          <CheckCircle2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="fin-act fin-act--resend"
                          title="Reenviar cobrança"
                          onClick={() => setResendPayment(p)}
                        >
                          <Send size={15} />
                        </button>
                        <button
                          type="button"
                          className="fin-act fin-act--cancel"
                          title="Cancelar boleto"
                          disabled={!canCancel(p) || actionBusy}
                          onClick={() => {
                            setCancelReason('');
                            setCancelPayment(p);
                          }}
                        >
                          <Ban size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {payments.length > 0 && (
        <div className="fin-pager">
          <span>
            Visualizando as faturas {(page - 1) * pageSize + 1} a{' '}
            {Math.min(page * pageSize, payments.length)} de {payments.length}
          </span>
          <div>
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              anterior
            </button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              próximo
            </button>
          </div>
        </div>
      )}

      {createKind === 'recorrencia' && (
        <RecurrenceConfigModal
          customerName={customerName}
          vehicles={vehicles}
          generating={creating}
          onClose={() => !creating && setCreateKind(null)}
          onGenerate={submitRecurrence}
        />
      )}

      {createKind && createKind !== 'recorrencia' && (
        <div className="fin-modal-overlay" onClick={() => !creating && setCreateKind(null)}>
          <div className="fin-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="fin-modal__head">
              <h3>
                {createKind === 'carne' && 'Novo carnê'}
                {createKind === 'avulsa' && 'Nova cobrança avulsa'}
              </h3>
              <button type="button" onClick={() => setCreateKind(null)} aria-label="Fechar">
                <X size={18} />
              </button>
            </div>
            <form className="fin-modal__body" onSubmit={submitCreate}>
              <label>
                Valor (R$)
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={createForm.value}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, value: e.target.value }))}
                />
              </label>
              <label>
                Vencimento
                <input
                  type="date"
                  required
                  value={createForm.due_date}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, due_date: e.target.value }))}
                />
              </label>
              {createKind === 'carne' && (
                <label>
                  Parcelas
                  <input
                    type="number"
                    min="2"
                    max="48"
                    required
                    value={createForm.installments}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, installments: e.target.value }))}
                  />
                </label>
              )}
              <label>
                Forma de pagamento
                <select
                  value={createForm.billing_type}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, billing_type: e.target.value }))}
                >
                  <option value="BOLETO">Boleto</option>
                  <option value="PIX">Pix</option>
                  <option value="CREDIT_CARD">Cartão de crédito</option>
                </select>
              </label>
              <label>
                Descrição
                <input
                  type="text"
                  value={createForm.description}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Opcional"
                />
              </label>
              <div className="fin-modal__actions">
                <button type="button" className="fin-btn fin-btn--ghost" onClick={() => setCreateKind(null)}>
                  Cancelar
                </button>
                <button type="submit" className="fin-btn fin-btn--primary" disabled={creating}>
                  {creating ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resendPayment && (
        <div className="fin-modal-overlay" onClick={() => setResendPayment(null)}>
          <div className="fin-modal fin-modal--sm" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="fin-modal__head">
              <h3>Reenviar cobrança</h3>
              <button type="button" onClick={() => setResendPayment(null)} aria-label="Fechar">
                <X size={18} />
              </button>
            </div>
            <div className="fin-modal__body">
              <p className="fin-modal__hint">Escolha o canal. Os dados vêm do cadastro do cliente.</p>
              <button type="button" className="fin-channel" onClick={() => handleResendChannel('email')}>
                <Mail size={20} />
                <span>
                  <strong>E-mail</strong>
                  <small>{customerEmail || 'Sem e-mail cadastrado'}</small>
                </span>
              </button>
              <button type="button" className="fin-channel" onClick={() => handleResendChannel('whatsapp')}>
                <MessageCircle size={20} />
                <span>
                  <strong>WhatsApp</strong>
                  <small>{customerPhone || 'Sem telefone cadastrado'}</small>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelPayment && (
        <div className="fin-modal-overlay" onClick={() => !actionBusy && setCancelPayment(null)}>
          <div className="fin-modal fin-modal--sm" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="fin-modal__head">
              <h3>Cancelar boleto</h3>
              <button type="button" onClick={() => setCancelPayment(null)} aria-label="Fechar">
                <X size={18} />
              </button>
            </div>
            <form className="fin-modal__body" onSubmit={submitCancel}>
              <p className="fin-modal__hint">
                Fatura {formatMoney(cancelPayment.value)} — venc. {formatDate(cancelPayment.dueDate)}
              </p>
              <label>
                Motivo do cancelamento *
                <textarea
                  rows={3}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Descreva o motivo..."
                />
              </label>
              <div className="fin-modal__actions">
                <button type="button" className="fin-btn fin-btn--ghost" onClick={() => setCancelPayment(null)}>
                  Voltar
                </button>
                <button type="submit" className="fin-btn fin-btn--danger" disabled={actionBusy}>
                  {actionBusy ? 'Cancelando...' : 'Confirmar cancelamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClienteFinanceiroTab;
