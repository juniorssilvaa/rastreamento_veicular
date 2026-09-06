import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, UserCog } from 'lucide-react';
import './Tecnicos.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const Tecnicos = () => {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('Todos');
  const [stateFilter, setStateFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    cep: '',
    numero: '',
    bairro: '',
    city: '',
    state: '',
    rua: '',
    complemento: '',
    email: '',
    celular: '',
    whatsapp: '',
    stock_total: 0,
    is_active: true,
    permitir_finalizar_os: false,
    ponto_fixo: false,
    has_contract: false
  });

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const fetchTechnicians = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/api/technicians/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Erro ao buscar técnicos');
      const data = await response.json();
      setTechnicians(data);
    } catch (error) {
      console.error(error);
      alert('Não foi possível carregar os técnicos.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (tech = null) => {
    if (tech) {
      setEditingId(tech.id);
      setFormData({
        name: tech.name || '',
        cpf: tech.cpf || '',
        cep: tech.cep || '',
        numero: tech.numero || '',
        bairro: tech.bairro || '',
        city: tech.city || '',
        state: tech.state || '',
        rua: tech.rua || '',
        complemento: tech.complemento || '',
        email: tech.email || '',
        celular: tech.celular || '',
        whatsapp: tech.whatsapp || '',
        stock_total: tech.stock_total || 0,
        is_active: tech.is_active ?? true,
        permitir_finalizar_os: tech.permitir_finalizar_os ?? false,
        ponto_fixo: tech.ponto_fixo ?? false,
        has_contract: tech.has_contract ?? false
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        cpf: '',
        cep: '',
        numero: '',
        bairro: '',
        city: '',
        state: '',
        rua: '',
        complemento: '',
        email: '',
        celular: '',
        whatsapp: '',
        stock_total: 0,
        is_active: true,
        permitir_finalizar_os: false,
        ponto_fixo: false,
        has_contract: false
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('access_token');
      const url = editingId ? `${API_URL}/api/technicians/${editingId}/` : `${API_URL}/api/technicians/`;
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erro ao salvar técnico');
      }

      await fetchTechnicians();
      handleCloseModal();
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  const handleToggleStatus = async (tech) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/api/technicians/${tech.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...tech, is_active: !tech.is_active })
      });
      
      if (!response.ok) throw new Error('Erro ao alterar status');
      
      await fetchTechnicians();
    } catch (error) {
      console.error(error);
      alert('Não foi possível alterar o status do técnico.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este técnico?')) return;
    
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/api/technicians/${id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Erro ao excluir técnico');
      
      await fetchTechnicians();
    } catch (error) {
      console.error(error);
      alert('Não foi possível excluir o técnico.');
    }
  };

  // Filtragem
  const filteredTechnicians = technicians.filter(tech => {
    const matchName = tech.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      tech.cpf.includes(searchTerm);
    const matchCity = cityFilter === 'Todos' || tech.city === cityFilter;
    const matchState = stateFilter === 'Todos' || tech.state === stateFilter;
    const matchStatus = statusFilter === 'Todos' 
                        ? true 
                        : (statusFilter === 'Ativo' ? tech.is_active : !tech.is_active);
    
    return matchName && matchCity && matchState && matchStatus;
  });

  // Extract unique cities and states for filters
  const cities = ['Todos', ...new Set(technicians.map(t => t.city).filter(Boolean))];
  const states = ['Todos', ...new Set(technicians.map(t => t.state).filter(Boolean))];

  return (
    <div className="tecnicos-page">
      <div className="tecnicos-shell">
        <div className="tecnicos-toolbar">
          <div className="tecnicos-toolbar__left">
            <div className="tecnicos-toolbar__icon">
              <UserCog size={20} />
            </div>
            <div>
              <h2>Técnicos</h2>
              <p>Equipe de instalação e manutenção</p>
            </div>
          </div>

          <div className="tecnicos-toolbar__right">
            <div className="tecnicos-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Buscar por nome ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="tecnicos-filters">
              <div className="tecnicos-filter">
                <label>Cidade</label>
                <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="tecnicos-filter">
                <label>Estado</label>
                <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
                  {states.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="tecnicos-filter">
                <label>Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="Todos">Todos</option>
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
            </div>

            <button type="button" className="tecnicos-btn-add" onClick={() => handleOpenModal()}>
              <Plus size={16} />
              Novo técnico
            </button>
          </div>
        </div>

        <div className="tecnicos-table-wrap">
          {loading ? (
            <div className="tecnicos-loading">Carregando técnicos...</div>
          ) : (
            <table className="tecnicos-table">
              <thead>
                <tr>
                  <th width="40"><input type="checkbox" aria-label="Selecionar todos" /></th>
                  <th>Nome do Técnico</th>
                  <th>CPF do Técnico</th>
                  <th>Cidade</th>
                  <th>Estado</th>
                  <th>Total de Estoque</th>
                  <th>Status do Técnico</th>
                  <th className="actions-col">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredTechnicians.map(tech => (
                  <tr key={tech.id}>
                    <td><input type="checkbox" aria-label={`Selecionar ${tech.name}`} /></td>
                    <td className="uppercase">{tech.name}</td>
                    <td>{tech.cpf}</td>
                    <td>{tech.city || '—'}</td>
                    <td>{tech.state || '—'}</td>
                    <td>
                      <span className="stock-badge">{tech.stock_total}</span>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${tech.is_active ? 'active' : 'inactive'}`}
                        onClick={() => handleToggleStatus(tech)}
                        style={{ cursor: 'pointer' }}
                      >
                        {tech.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button type="button" className="btn-icon edit" onClick={() => handleOpenModal(tech)} aria-label="Editar">
                        <Edit2 size={16} />
                      </button>
                      <button type="button" className="btn-icon delete" onClick={() => handleDelete(tech.id)} aria-label="Excluir">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredTechnicians.length === 0 && (
                  <tr>
                    <td colSpan="8" className="empty-message">Nenhum técnico encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content technician-modal">
            <div className="modal-header">
              <h2>
                <UserCog size={20} />
                {editingId ? 'Editar Técnico' : 'Adicionar novo'}
              </h2>
              <button className="btn-close" onClick={handleCloseModal}>&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-row checkboxes-top">
                <label className="checkbox-label">
                  <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} />
                  Status do Técnico
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" name="permitir_finalizar_os" checked={formData.permitir_finalizar_os} onChange={handleChange} />
                  Permitir Finalizar OS
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" name="ponto_fixo" checked={formData.ponto_fixo} onChange={handleChange} />
                  Ponto Fixo
                </label>
              </div>

              <div className="form-row">
                <div className="form-group full-width">
                  <label>Nome do Técnico:</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} required />
                </div>
              </div>

              <div className="form-row triple">
                <div className="form-group">
                  <label>CEP:</label>
                  <input type="text" name="cep" value={formData.cep} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Número:</label>
                  <input type="text" name="numero" value={formData.numero} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Bairro:</label>
                  <input type="text" name="bairro" value={formData.bairro} onChange={handleChange} />
                </div>
              </div>

              <div className="form-row triple">
                <div className="form-group">
                  <label>Cidade:</label>
                  <input type="text" name="city" value={formData.city} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Estado:</label>
                  <input type="text" name="state" value={formData.state} onChange={handleChange} maxLength="2" />
                </div>
                <div className="form-group">
                  <label>Rua:</label>
                  <input type="text" name="rua" value={formData.rua} onChange={handleChange} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group full-width">
                  <label>Complemento:</label>
                  <input type="text" name="complemento" value={formData.complemento} onChange={handleChange} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group half-width">
                  <label>Email:</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} />
                </div>
              </div>

              <div className="form-row triple">
                <div className="form-group">
                  <label>Celular do Técnico:</label>
                  <input type="text" name="celular" value={formData.celular} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>WhatsApp do Técnico:</label>
                  <input type="text" name="whatsapp" value={formData.whatsapp} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>CPF do Técnico:</label>
                  <input type="text" name="cpf" value={formData.cpf} onChange={handleChange} required />
                </div>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-save">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tecnicos;
