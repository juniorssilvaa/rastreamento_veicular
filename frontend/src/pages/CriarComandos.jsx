import React, { useState, useRef, useEffect } from 'react';
import './CriarComandos.css';
import { Save, Plus, Trash2, List, X, Pencil, XCircle } from 'lucide-react';

const CriarComandos = () => {
  const [comandosList, setComandosList] = useState([]);
  const [nome, setNome] = useState('');
  const [comandos, setComandos] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  
  const inputRef = useRef(null);

  const fetchComandosList = async () => {
    try {
      const response = await fetch('/api/command-combos/');
      if (response.ok) {
        const data = await response.json();
        setComandosList(data);
      }
    } catch (error) {
      console.error('Erro ao buscar comandos:', error);
    }
  };

  useEffect(() => {
    fetchComandosList();
  }, []);

  const handleContainerClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    
    if (val.includes('}')) {
      const matches = val.match(/\{([^}]+)\}/g);
      
      if (matches && matches.length > 0) {
        const newTags = matches.map(m => m.trim());
        setComandos([...comandos, ...newTags]);
        
        let remainder = val;
        matches.forEach(m => { remainder = remainder.replace(m, ''); });
        setInputValue(remainder.replace(/[}]/g, '').trim());
      } else {
        const parts = val.split('}');
        let newTag = parts[0].trim();
        if (!newTag.startsWith('{')) {
          newTag = '{' + newTag + '}';
        } else {
          newTag = newTag + '}';
        }
        
        const remainder = parts.slice(1).join('}').trim();
        if (parts[0].trim()) {
           setComandos([...comandos, newTag]);
        }
        setInputValue(remainder);
      }
    } else {
      setInputValue(val);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      let val = inputValue.trim();
      if (val) {
        if (!val.startsWith('{')) val = '{' + val;
        if (!val.endsWith('}')) val = val + '}';
        setComandos([...comandos, val]);
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && !inputValue && comandos.length > 0) {
      setComandos(comandos.slice(0, comandos.length - 1));
    }
  };

  const removeComando = (indexToRemove) => {
    setComandos(comandos.filter((_, index) => index !== indexToRemove));
  };

  const handleEdit = (combo) => {
    setEditandoId(combo.id);
    setNome(combo.nome);
    setComandos([...combo.comandos]);
    setInputValue('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const cancelEdit = () => {
    setEditandoId(null);
    setNome('');
    setComandos([]);
    setInputValue('');
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    let val = inputValue.trim();
    let comandosFinais = [...comandos];
    
    if (val) {
        if (!val.startsWith('{')) val = '{' + val;
        if (!val.endsWith('}')) val = val + '}';
        comandosFinais.push(val);
    }
    
    if (!nome.trim() || comandosFinais.length === 0) {
      alert('Preencha o nome e adicione pelo menos um comando!');
      return;
    }
    
    setIsLoading(true);
    try {
      let response;
      if (editandoId) {
        response = await fetch(`/api/command-combos/${editandoId}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, comandos: comandosFinais })
        });
      } else {
        response = await fetch('/api/command-combos/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, comandos: comandosFinais })
        });
      }

      if (response.ok) {
        await fetchComandosList();
        cancelEdit();
      } else {
        alert('Erro ao salvar o combo.');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro de conexão ao salvar.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja realmente excluir este combo?')) return;
    try {
      const response = await fetch(`/api/command-combos/${id}/`, {
        method: 'DELETE'
      });
      if (response.ok) {
        if (editandoId === id) cancelEdit();
        fetchComandosList();
      } else {
        alert('Erro ao excluir.');
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  return (
    <div className="criar-comandos-container">
      <div className="criar-comandos-header">
        <h2>Criar Comandos</h2>
        <p>Crie combos de comandos separados por chaves {'{ }'} ou pressionando Enter.</p>
      </div>

      <div className="criar-comandos-content">
        <div className="criar-comandos-form-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>
              {editandoId ? <Pencil size={18} /> : <Plus size={18} />} 
              {editandoId ? ' Editando Combo' : ' Novo Combo de Comandos'}
            </h3>
            {editandoId && (
              <button onClick={cancelEdit} className="btn-cancelar" style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <XCircle size={16} /> Cancelar
              </button>
            )}
          </div>
          <form onSubmit={handleSalvar} className="criar-comandos-form">
            <div className="form-group">
              <label>Nome do Combo (Ex: Bloqueio Total)</label>
              <input 
                type="text" 
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Digite um nome para identificar o combo..."
              />
            </div>
            
            <div className="form-group">
              <label>Comandos (Separados por chaves)</label>
              <div className="tags-input-container" onClick={handleContainerClick}>
                {comandos.map((cmd, index) => (
                  <div key={index} className="tag-chip">
                    {cmd}
                    <button type="button" onClick={() => removeComando(index)}><X size={14} /></button>
                  </div>
                ))}
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  className="tag-input"
                  placeholder={comandos.length === 0 ? "Ex: {comando1#} {comando2=1}" : ""}
                />
              </div>
              <span className="help-text">Feche a chave {'}'} ou pressione Enter para adicionar o comando.</span>
            </div>
            
            <button
              type="submit"
              className={editandoId ? 'btn-atualizar-comando' : 'btn-salvar-comando'}
              disabled={isLoading}
            >
              <Save size={18} /> {isLoading ? 'Salvando...' : (editandoId ? 'Atualizar Combo' : 'Salvar Combo')}
            </button>
          </form>
        </div>

        <div className="criar-comandos-list-card">
          <h3><List size={18} /> Combos Salvos</h3>
          
          {comandosList.length === 0 ? (
            <div className="empty-list">Nenhum combo cadastrado ainda.</div>
          ) : (
            <div className="comandos-list">
              {comandosList.map((combo) => (
                <div key={combo.id} className="comando-item">
                  <div className="comando-item-info">
                    <strong>{combo.nome}</strong>
                    <div className="comando-item-tags">
                      {combo.comandos.map((cmd, i) => (
                        <span key={i} className="display-tag">{cmd}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => handleEdit(combo)} 
                      className="btn-edit-comando" 
                      title="Editar"
                    >
                      <Pencil size={18} />
                    </button>
                    <button 
                      className="btn-delete-comando" 
                      onClick={() => handleDelete(combo.id)}
                      title="Excluir combo"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CriarComandos;
