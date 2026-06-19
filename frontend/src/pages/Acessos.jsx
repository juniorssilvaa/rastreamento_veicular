import React, { useState, useEffect } from 'react';
import { Key, ShieldOff, Power, RefreshCw, UserCheck, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import './Acessos.css';

const Acessos = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/users/');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      toast.error('Erro ao buscar usuários');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateAccess = async (customerId) => {
    try {
      const response = await fetch(`/api/auth/users/${customerId}/`, {
        method: 'POST',
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(`Acesso criado! Login: ${data.username} Senha: ${data.password}`, { duration: 10000 });
        fetchUsers();
      } else {
        toast.error(data.error || 'Erro ao criar acesso');
      }
    } catch (error) {
      toast.error('Erro na requisição');
    }
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
        fetchUsers();
      } else {
        toast.error('Erro ao atualizar status');
      }
    } catch (error) {
      toast.error('Erro na requisição');
    }
  };

  const handleResetPassword = async (customerId) => {
    if (!window.confirm("Deseja realmente gerar uma nova senha aleatória para este cliente?")) return;
    
    try {
      const response = await fetch(`/api/auth/users/${customerId}/reset-password/`, {
        method: 'POST',
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(`Nova senha gerada: ${data.new_password}`, { duration: 10000 });
      } else {
        toast.error(data.error || 'Erro ao resetar senha');
      }
    } catch (error) {
      toast.error('Erro na requisição');
    }
  };

  const handleRemove2FA = async (customerId) => {
    if (!window.confirm("Deseja remover o 2FA deste usuário? Ele fará login apenas com senha até configurar novamente.")) return;
    
    try {
      const response = await fetch(`/api/auth/users/${customerId}/remove-2fa/`, {
        method: 'POST',
      });
      if (response.ok) {
        toast.success('2FA removido com sucesso');
        fetchUsers();
      } else {
        toast.error('Erro ao remover 2FA');
      }
    } catch (error) {
      toast.error('Erro na requisição');
    }
  };

  return (
    <div className="acessos-page">
      <div className="acessos-header">
        <h1>Controle de Acessos</h1>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>Carregando...</div>
      ) : (
        <div className="acessos-table-container">
          <table className="acessos-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Email / Login</th>
                <th>Status</th>
                <th>2FA</th>
                <th>Ações de Segurança</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.name}</td>
                  <td>{u.email || '-'}</td>
                  <td>
                    {!u.has_access ? (
                      <span className="badge badge-gray">Sem Acesso</span>
                    ) : u.is_active ? (
                      <span className="badge badge-green">Ativo</span>
                    ) : (
                      <span className="badge badge-red">Bloqueado</span>
                    )}
                  </td>
                  <td>
                    {u.has_2fa ? (
                      <span className="badge badge-blue">Ativo</span>
                    ) : (
                      <span className="badge badge-gray">Inativo</span>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      {!u.has_access ? (
                        <button className="btn-create" onClick={() => handleCreateAccess(u.id)}>
                          <UserCheck size={16} /> Gerar Acesso
                        </button>
                      ) : (
                        <>
                          <button className="btn-icon" title="Resetar Senha" onClick={() => handleResetPassword(u.id)}>
                            <Key size={16} color="#4B5563" />
                          </button>
                          
                          {u.has_2fa && (
                            <button className="btn-icon" title="Remover 2FA" onClick={() => handleRemove2FA(u.id)}>
                              <ShieldOff size={16} color="#DC2626" />
                            </button>
                          )}
                          
                          <button 
                            className={`btn-icon ${u.is_active ? 'active' : 'inactive'}`} 
                            title={u.is_active ? 'Bloquear Acesso' : 'Desbloquear Acesso'} 
                            onClick={() => handleToggleStatus(u.id, u.is_active)}
                          >
                            {u.is_active ? <UserX size={16} color="#DC2626" /> : <UserCheck size={16} color="#10B981" />}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Acessos;
