
import React, { useState, useMemo } from 'react';
import { Team, Technician, TeamComposition } from '../types';

interface RulesModuleProps {
  teams: Team[];
  technicians: Technician[];
  compositions: TeamComposition[];
  onUpdateComposition: (comp: TeamComposition) => void;
  onAddTech: (tech: Technician) => void;
  onUpdateTech: (tech: Technician) => void;
  onDeleteTech: (id: string) => void;
  onAddTeam: (team: Team) => void;
}

const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const RulesModule: React.FC<RulesModuleProps> = ({ 
  teams, technicians, compositions, onUpdateComposition, onAddTech, onUpdateTech, onDeleteTech, onAddTeam 
}) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [isAddingTech, setIsAddingTech] = useState(false);
  const [techToDelete, setTechToDelete] = useState<Technician | null>(null);
  
  const [newTeam, setNewTeam] = useState<Partial<Team>>({ type: 'Equipe', city: 'Operacional' });
  const [newTech, setNewTech] = useState<Partial<Technician>>({ name: '', role: 'Instalador', active: true });
  const year = new Date().getFullYear();

  const occupancyMap = useMemo(() => {
    const map = new Map<string, string>(); 
    compositions
      .filter(c => c.month === selectedMonth && c.year === year)
      .forEach(c => {
        const team = teams.find(t => t.id === c.teamId);
        c.technicianIds.forEach(tid => {
          if (tid) map.set(tid, team?.name || 'Outra Equipe');
        });
      });
    return map;
  }, [compositions, selectedMonth, year, teams]);

  const handleTechChange = (teamId: string, idx: number, techId: string) => {
    const currentComp = compositions.find(c => c.teamId === teamId && c.month === selectedMonth && c.year === year);
    let newTechs = currentComp ? [...currentComp.technicianIds] : ['', ''];
    if (newTechs.length < 2) newTechs = ['', ''];

    if (techId === "") {
        newTechs[idx] = "";
        onUpdateComposition({ teamId, year, month: selectedMonth, technicianIds: newTechs });
        return;
    }

    const occupiedBy = occupancyMap.get(techId);
    const currentTeamName = teams.find(t => t.id === teamId)?.name;
    const isOtherSlotInSameTeam = newTechs.some((id, i) => i !== idx && id === techId);

    if ((occupiedBy && occupiedBy !== currentTeamName) || isOtherSlotInSameTeam) {
      alert(`🚨 CONFLITO DETECTADO!\n\nEste técnico já está alocado em: ${occupiedBy || 'outro slot desta equipe'}.\n\nCada profissional deve ser exclusivo de um veículo por período.`);
      return;
    }

    newTechs[idx] = techId;
    onUpdateComposition({ teamId, year, month: selectedMonth, technicianIds: newTechs });
  };

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeam.name) return;
    onAddTeam({
      id: `team-${Date.now()}`,
      name: newTeam.name,
      city: newTeam.city || 'Geral',
      type: newTeam.type as 'Equipe' | 'Suporte',
      requiredTechnicians: 2
    });
    setIsAddingTeam(false);
    setNewTeam({ type: 'Equipe', city: 'Operacional' });
  };

  const handleCreateTech = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTech.name?.trim()) return;
    onAddTech({
      id: `tech-${Date.now()}`,
      name: newTech.name.trim(),
      role: newTech.role || 'Instalador',
      active: true
    });
    setIsAddingTech(false);
    setNewTech({ name: '', role: 'Instalador', active: true });
  };

  const confirmDeletion = () => {
    if (techToDelete) {
      onDeleteTech(techToDelete.id);
      setTechToDelete(null);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-700">
      
      {/* Modal: Adicionar Técnico */}
      {isAddingTech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 p-6 text-white">
              <h3 className="text-xl font-black uppercase tracking-tight">Novo Colaborador</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Cadastro de Talento</p>
            </div>
            <form onSubmit={handleCreateTech} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <input 
                  autoFocus
                  required
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  placeholder="Ex: João da Silva"
                  value={newTech.name}
                  onChange={e => setNewTech({...newTech, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Função Operacional</label>
                <select 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm outline-none transition-all"
                  value={newTech.role}
                  onChange={e => setNewTech({...newTech, role: e.target.value as any})}
                >
                  <option value="Instalador">Técnico Instalador</option>
                  <option value="Suporte">Técnico Suporte/Apoio</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-100 transition-all active:scale-95 uppercase text-xs tracking-widest">
                  Salvar Colaborador
                </button>
                <button type="button" onClick={() => setIsAddingTech(false)} className="px-6 font-bold text-slate-400 hover:text-slate-600 text-xs uppercase tracking-widest">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Customizado: Confirmar Exclusão */}
      {techToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in zoom-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-red-100 overflow-hidden">
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto text-2xl">
                ⚠️
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Excluir Colaborador?</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed mt-2">
                  Você está prestes a remover <span className="font-bold text-slate-800">{techToDelete.name}</span>. Esta ação removerá o técnico de todas as escalas futuras.
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-4">
                <button 
                  onClick={confirmDeletion}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl transition-all active:scale-95 uppercase text-[10px] tracking-[0.2em]"
                >
                  Sim, Deletar Agora
                </button>
                <button 
                  onClick={() => setTechToDelete(null)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-black py-4 rounded-2xl transition-all uppercase text-[10px] tracking-[0.2em]"
                >
                  Não, Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Composição das Equipes */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="p-1.5 bg-blue-100 text-blue-600 rounded-lg text-sm">⚙️</span>
              Composição das Equipes
            </h3>
            <p className="text-xs text-slate-500 font-medium italic">
              Configure as frotas ativas. {selectedMonth === 0 && <span className="text-amber-600 font-bold">⚠️ Janeiro replica para o ano todo.</span>}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             <button 
                onClick={() => setIsAddingTeam(true)}
                className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-100"
             >
                + Nova Frota/Equipe
             </button>
             <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 outline-none"
              >
                {months.map((m, i) => <option key={i} value={i}>{m} {year}</option>)}
              </select>
          </div>
        </div>

        {isAddingTeam && (
          <div className="p-8 bg-slate-50 border-b border-slate-200 animate-in fade-in zoom-in duration-300">
             <form onSubmit={handleCreateTeam} className="max-w-xl mx-auto space-y-4 bg-white p-6 rounded-2xl border shadow-xl">
                <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-4">Nova Unidade Operacional</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Nome da Equipe</label>
                        <input 
                            autoFocus
                            className="w-full border-2 rounded-xl p-3 text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none" 
                            placeholder="Ex: Equipe 21 ou Suporte 10"
                            value={newTeam.name || ''}
                            onChange={e => setNewTeam({...newTeam, name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Categoria</label>
                        <select 
                            className="w-full border-2 rounded-xl p-3 text-sm outline-none"
                            value={newTeam.type}
                            onChange={e => setNewTeam({...newTeam, type: e.target.value as any})}
                        >
                            <option value="Equipe">Equipe (Técnica)</option>
                            <option value="Suporte">Suporte (Apoio)</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Cidade/Região</label>
                        <input 
                            className="w-full border-2 rounded-xl p-3 text-sm outline-none" 
                            value={newTeam.city || ''}
                            onChange={e => setNewTeam({...newTeam, city: e.target.value})}
                        />
                    </div>
                </div>
                <div className="flex gap-2 pt-4">
                    <button type="submit" className="flex-1 bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition">Salvar Equipe</button>
                    <button type="button" onClick={() => setIsAddingTeam(false)} className="px-6 font-bold text-slate-400 hover:text-slate-600">Cancelar</button>
                </div>
             </form>
          </div>
        )}
        
        <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {teams.sort((a,b) => a.name.localeCompare(b.name, undefined, { numeric: true })).map(team => {
            const comp = compositions.find(c => c.teamId === team.id && c.month === selectedMonth && c.year === year);
            const technicianIds = comp?.technicianIds || ['', ''];

            return (
              <div key={team.id} className="group p-4 rounded-2xl border-2 border-slate-100 bg-white hover:border-blue-500/30 hover:shadow-md transition-all duration-300">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-600 transition-colors">{team.name}</span>
                  <div className="flex gap-1 items-center">
                    <span className={`w-1.5 h-1.5 rounded-full ${team.type === 'Suporte' ? 'bg-cyan-500' : 'bg-orange-500'}`}></span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">{team.type}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {[0, 1].map((idx) => {
                    const currentTechId = technicianIds[idx] || '';
                    return (
                      <div key={idx} className="relative">
                        <select
                          value={currentTechId}
                          onChange={(e) => handleTechChange(team.id, idx, e.target.value)}
                          className={`w-full text-xs p-2.5 border-2 rounded-xl bg-slate-50 focus:ring-4 focus:ring-blue-500/10 outline-none appearance-none transition-all cursor-pointer ${
                            currentTechId === '' ? 'border-dashed border-slate-200 text-slate-400' : 'border-slate-100 text-slate-700 font-semibold bg-white'
                          }`}
                        >
                          <option value="">-- Selecionar --</option>
                          {technicians.sort((a,b) => a.name.localeCompare(b.name)).map(t => {
                            const occupiedBy = occupancyMap.get(t.id);
                            const isMe = currentTechId === t.id;
                            const isDisabled = !!occupiedBy && !isMe;
                            return (
                              <option key={t.id} value={t.id} disabled={isDisabled}>
                                {t.name} {isDisabled ? `(${occupiedBy})` : ''}
                              </option>
                            );
                          })}
                        </select>
                        <div className="absolute right-3 top-3 pointer-events-none text-slate-400 text-[10px]">▼</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Banco de Talentos */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Banco de Talentos Ativos</h3>
            <p className="text-xs text-slate-500">Gestão global de colaboradores e suas especialidades.</p>
          </div>
          <button 
            onClick={() => setIsAddingTech(true)}
            className="bg-slate-900 text-white px-6 py-2.5 rounded-xl hover:bg-slate-800 transition-all font-bold text-sm shadow-xl shadow-slate-200"
          >
            + Adicionar Colaborador
          </button>
        </div>
        
        <div className="max-h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white z-10 shadow-sm">
              <tr className="text-[10px] text-slate-400 uppercase font-black tracking-widest border-b border-slate-100">
                <th className="px-8 py-4 w-1/2">Nome do Técnico (Editar)</th>
                <th className="px-8 py-4">Função</th>
                <th className="px-8 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {technicians.sort((a,b) => a.name.localeCompare(b.name)).map(tech => (
                <tr key={tech.id} className="hover:bg-blue-50/20 group transition-colors">
                  <td className="px-8 py-3">
                    <input 
                      value={tech.name}
                      onChange={(e) => onUpdateTech({...tech, name: e.target.value})}
                      onBlur={(e) => onUpdateTech({...tech, name: e.target.value.trim()})}
                      className="bg-transparent w-full border-2 border-transparent focus:border-blue-200 focus:bg-white rounded-lg px-2 py-1.5 transition-all font-bold text-slate-700 placeholder:text-slate-300 outline-none"
                      placeholder="Nome do colaborador"
                    />
                  </td>
                  <td className="px-8 py-3">
                    <select 
                      value={tech.role}
                      onChange={(e) => onUpdateTech({...tech, role: e.target.value as any})}
                      className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 cursor-pointer outline-none focus:ring-0"
                    >
                      <option value="Instalador">Instalador</option>
                      <option value="Suporte">Suporte</option>
                    </select>
                  </td>
                  <td className="px-8 py-3 text-right">
                    <button 
                      onClick={() => setTechToDelete(tech)} 
                      className="p-2 text-slate-300 hover:text-red-500 transition-all active:scale-90"
                      title="Excluir Colaborador"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
              {technicians.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-12 text-center text-slate-400 text-xs italic font-medium">Nenhum talento cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default RulesModule;
