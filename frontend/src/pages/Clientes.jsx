import React, { useState, useEffect } from 'react';
import { Plus, User, FileText, X, MapPin, CreditCard, Edit2, Trash2, MoreVertical, Key, ShieldOff, UserCheck, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import './Clientes.css';

const Clientes = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    cpf_cnpj: '',
    name: '',
    contract_name: '',
    rg: '',
    birth_date: '',
    postal_code: '',
    address: '',
    address_number: '',
    complement: '',
    province: '',
    city: '',
    state: '',
    mobile_phone: '',
    phone: '',
    monthly_value: '',
    email: '',
    due_day: '',
    income: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const fetchCustomers = async () => {
    setIsFetching(true);
    try {
      const response = await fetch('/api/asaas/customers/');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (error) {
      toast.error('Erro ao buscar clientes');
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const openNewModal = () => {
    setEditingCustomer(null);
    setFormData({
      cpf_cnpj: '', name: '', contract_name: '', rg: '', birth_date: '',
      postal_code: '', address: '', address_number: '', complement: '',
      province: '', city: '', state: '', mobile_phone: '', phone: '',
      monthly_value: '', email: '', due_day: '', income: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      ...customer,
      birth_date: customer.birth_date ? customer.birth_date.split('T')[0] : '', // format YYYY-MM-DD
      monthly_value: customer.monthly_value || '',
      due_day: customer.due_day || '',
      income: customer.income || ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteCustomer = async (asaas_id) => {
    if (!window.confirm("Tem certeza que deseja excluir este cliente? Essa ação não pode ser desfeita e removerá o cliente também no Asaas.")) {
      return;
    }
    
    const asaasToken = localStorage.getItem('asaasToken');
    const asaasEnv = localStorage.getItem('asaasEnv') || 'sandbox';

    if (!asaasToken) {
      toast.error('Token do Asaas não configurado.');
      return;
    }

    try {
      const response = await fetch(`/api/asaas/customers/${asaas_id}/`, {
        method: 'DELETE',
        headers: {
          'X-Asaas-Token': asaasToken,
          'X-Asaas-Env': asaasEnv
        }
      });
      
      if (!response.ok) throw new Error('Falha ao excluir cliente');
      
      toast.success('Cliente excluído com sucesso');
      fetchCustomers();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleCreateAccess = async (customerId) => {
    try {
      const response = await fetch(`/api/auth/users/${customerId}/`, { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        toast.success(`Acesso criado! Login: ${data.username} Senha: ${data.password}`, { duration: 10000 });
        fetchCustomers();
      } else {
        toast.error(data.error || 'Erro ao criar acesso');
      }
    } catch (error) { toast.error('Erro na requisição'); }
  };

  const handleToggleStatus = async (customerId, currentStatus) => {
    try {
      const response = await fetch(`/api/auth/users/${customerId}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      if (response.ok) {
        toast.success(!currentStatus ? 'Acesso ativado' : 'Acesso desativado');
        fetchCustomers();
      } else { toast.error('Erro ao atualizar status'); }
    } catch (error) { toast.error('Erro na requisição'); }
  };

  const handleResetPassword = async (customerId) => {
    if (!window.confirm("Deseja gerar nova senha aleatória para este cliente?")) return;
    try {
      const response = await fetch(`/api/auth/users/${customerId}/reset-password/`, { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        toast.success(`Nova senha gerada: ${data.new_password}`, { duration: 10000 });
      } else { toast.error(data.error || 'Erro ao resetar senha'); }
    } catch (error) { toast.error('Erro na requisição'); }
  };

  const handleRemove2FA = async (customerId) => {
    if (!window.confirm("Deseja remover a Autenticação em Duas Etapas (2FA) deste usuário? Ele poderá logar apenas com senha até reconfigurar.")) return;
    
    try {
      const response = await fetch(`/api/auth/users/${customerId}/remove-2fa/`, { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        toast.success('Autenticação 2FA removida com sucesso. O cliente pode logar apenas com senha agora.');
        fetchCustomers();
      } else { toast.error(data.error || 'Erro ao remover 2FA'); }
    } catch (error) { toast.error('Erro na requisição'); }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const asaasToken = localStorage.getItem('asaasToken');
    const asaasEnv = localStorage.getItem('asaasEnv') || 'sandbox';

    if (!asaasToken) {
      toast.error('Token do Asaas não configurado. Vá em Gerenciar > Integrações para configurar.');
      setIsLoading(false);
      return;
    }

    // Frontend validations
    if (formData.birth_date) {
      const year = formData.birth_date.split('-')[0];
      if (year.length > 4 || parseInt(year) > new Date().getFullYear() || parseInt(year) < 1900) {
        toast.error('A data de nascimento informada é inválida.');
        setIsLoading(false);
        return;
      }
    }

    try {
      const url = editingCustomer 
        ? `/api/asaas/customers/${editingCustomer.asaas_id}/` 
        : '/api/asaas/customers/';
        
      const response = await fetch(url, {
        method: editingCustomer ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Asaas-Token': asaasToken,
          'X-Asaas-Env': asaasEnv
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMsg = data.error || data.errors?.[0]?.description || 'Erro ao criar cliente';
        
        // Beautify raw Django python error strings like ["..."]
        if (typeof errorMsg === 'string' && errorMsg.startsWith('[\"') && errorMsg.endsWith('\"]')) {
           errorMsg = errorMsg.replace(/\["|"]/g, '').replace(/', '/g, ' ');
           if (errorMsg.includes('invalid date format')) {
               errorMsg = 'Formato de data inválido. Verifique se digitou o ano corretamente.';
           }
        } else if (typeof errorMsg === 'string' && errorMsg.startsWith("['") && errorMsg.endsWith("']")) {
           errorMsg = errorMsg.replace(/\['|']/g, '').replace(/', '/g, ' ');
           if (errorMsg.includes('invalid date format')) {
               errorMsg = 'Formato de data inválido. Verifique se digitou o ano corretamente.';
           }
        }

        throw new Error(errorMsg);
      }

      toast.success(editingCustomer ? 'Cliente atualizado com sucesso!' : (data.subscription ? `Cliente e Assinatura criados com sucesso! (ID: ${data.asaas_id})` : `Cliente criado com sucesso! (ID: ${data.asaas_id})`));
      
      setIsModalOpen(false);
      fetchCustomers();

    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="clientes-page">
      <div className="clientes-header">
        <h1>Meus Clientes</h1>
        <button className="btn-primary" onClick={openNewModal}>
          <Plus size={18} /> Novo Cliente
        </button>
      </div>

      {isFetching ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>Carregando clientes...</div>
      ) : customers.length === 0 ? (
        <div className="clientes-empty-state">
          <User size={48} color="#9CA3AF" style={{ marginBottom: '16px' }} />
          <h3>Nenhum cliente listado</h3>
          <p>Os clientes cadastrados via Asaas aparecerão aqui em breve.</p>
        </div>
      ) : (
        <div className="clientes-table-container">
          <table className="clientes-table">
            <thead>
              <tr>
                <th>Nome / Razão Social</th>
                <th>Documento</th>
                <th>Email / Contato</th>
                <th>Mensalidade</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{c.name}</div>
                    {c.contract_name && <div style={{ fontSize: '12px', color: '#6B7280' }}>{c.contract_name}</div>}
                  </td>
                  <td>{c.cpf_cnpj}</td>
                  <td>
                    <div>{c.email || '-'}</div>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>{c.mobile_phone || c.phone || '-'}</div>
                  </td>
                  <td>{c.monthly_value ? `R$ ${parseFloat(c.monthly_value).toFixed(2).replace('.', ',')}` : '-'}</td>
                  <td>
                    <div className="action-buttons" style={{ position: 'relative' }}>
                      <button className="btn-icon edit" onClick={() => openEditModal(c)} title="Editar"><Edit2 size={16} /></button>
                      
                      {/* Menu de Acessos */}
                      <button 
                        className="btn-icon more" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdown(activeDropdown === c.id ? null : c.id);
                        }} 
                        title="Controle de Acesso"
                      >
                        <MoreVertical size={16} />
                      </button>
                      
                      {activeDropdown === c.id && (
                        <div className="dropdown-menu" onClick={e => e.stopPropagation()}>
                          {!c.has_access ? (
                            <button className="dropdown-item" onClick={() => { handleCreateAccess(c.id); setActiveDropdown(null); }}>
                              <UserCheck size={14} /> Gerar Acesso
                            </button>
                          ) : (
                            <>
                              <button className="dropdown-item" onClick={() => { handleResetPassword(c.id); setActiveDropdown(null); }}>
                                <Key size={14} /> Resetar Senha
                              </button>
                              <button className="dropdown-item" onClick={() => { handleToggleStatus(c.id, c.is_active); setActiveDropdown(null); }}>
                                {c.is_active ? <UserX size={14} color="#DC2626" /> : <UserCheck size={14} color="#10B981" />} 
                                {c.is_active ? 'Bloquear Acesso' : 'Desbloquear Acesso'}
                              </button>
                              <button className="dropdown-item" onClick={() => { handleRemove2FA(c.id); setActiveDropdown(null); }}>
                                <ShieldOff size={14} color="#DC2626" /> Remover Autenticação 2FA
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      <button className="btn-icon delete" onClick={() => handleDeleteCustomer(c.asaas_id)} title="Excluir"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2><User size={24} color="#1F2937" /> {editingCustomer ? 'Editar Cliente' : 'Dados do Cliente'}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} color="#6B7280" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer}>
              
              <div className="section-divider"><User size={16} /> Identificação</div>
              <div className="form-grid">
                <div className="form-group col-span-3">
                  <label>CPF/CNPJ *</label>
                  <input required type="text" name="cpf_cnpj" value={formData.cpf_cnpj} onChange={handleChange} placeholder="000.000.000-00" />
                </div>
                
                <div className="form-group">
                  <label>Nome/Razão Social *</label>
                  <input required type="text" name="name" value={formData.name} onChange={handleChange} placeholder="João da Silva" />
                </div>

                <div className="form-group">
                  <label>Nome para Contrato</label>
                  <input type="text" name="contract_name" value={formData.contract_name} onChange={handleChange} placeholder="Usa a razão social se vazio" />
                </div>

                <div className="form-group">
                  <label>RG</label>
                  <input type="text" name="rg" value={formData.rg} onChange={handleChange} placeholder="00.000.000-0" />
                </div>

                <div className="form-group">
                  <label>Data de nascimento</label>
                  <input type="date" name="birth_date" value={formData.birth_date} onChange={handleChange} />
                </div>
              </div>

              <div className="section-divider"><MapPin size={16} /> Endereço</div>
              <div className="form-grid">
                <div className="form-group">
                  <label>CEP</label>
                  <input type="text" name="postal_code" value={formData.postal_code} onChange={handleChange} placeholder="00000-000" />
                </div>

                <div className="form-group col-span-2"></div> {/* Spacer */}

                <div className="form-group col-span-2">
                  <label>Endereço</label>
                  <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Rua / Avenida" />
                </div>

                <div className="form-group">
                  <label>Nº</label>
                  <input type="text" name="address_number" value={formData.address_number} onChange={handleChange} placeholder="123" />
                </div>

                <div className="form-group col-span-3">
                  <label>Complemento</label>
                  <input type="text" name="complement" value={formData.complement} onChange={handleChange} placeholder="Apto, Sala, Casa 2" />
                </div>

                <div className="form-group">
                  <label>Bairro</label>
                  <input type="text" name="province" value={formData.province} onChange={handleChange} placeholder="Centro" />
                </div>

                <div className="form-group">
                  <label>Cidade</label>
                  <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="São Paulo" />
                </div>

                <div className="form-group">
                  <label>Estado</label>
                  <input type="text" name="state" value={formData.state} onChange={handleChange} placeholder="SP" />
                </div>
              </div>

              <div className="section-divider"><CreditCard size={16} /> Contato & Financeiro</div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Celular</label>
                  <input type="text" name="mobile_phone" value={formData.mobile_phone} onChange={handleChange} placeholder="(11) 99999-9999" />
                </div>

                <div className="form-group">
                  <label>Valor mensalidade (R$)</label>
                  <input type="number" step="0.01" name="monthly_value" value={formData.monthly_value} onChange={handleChange} placeholder="0.00" />
                </div>

                <div className="form-group">
                  <label>Dia de vencimento (Fatura)</label>
                  <select name="due_day" value={formData.due_day} onChange={handleChange}>
                    <option value="">Selecione</option>
                    {[...Array(28).keys()].map(i => (
                      <option key={i+1} value={i+1}>{i+1}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Email de Cobrança</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="email@exemplo.com" />
                </div>

                <div className="form-group">
                  <label>Renda/Faturamento (R$)</label>
                  <input type="number" step="0.01" name="income" value={formData.income} onChange={handleChange} placeholder="0.00" />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={isLoading}>
                  {isLoading ? 'Processando...' : (editingCustomer ? 'Salvar Alterações' : 'Salvar Cadastro e Assinatura')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clientes;
