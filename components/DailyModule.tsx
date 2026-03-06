
import React, { useMemo, useRef } from 'react';
import { Team, ScheduleEntry, Technician, AuditEntry, WeeklyPattern, TeamComposition, AuditAction } from '../types';
import html2canvas from 'html2canvas';

interface DailyModuleProps {
  teams: Team[];
  technicians: Technician[];
  schedule: ScheduleEntry[];
  patterns: WeeklyPattern[];
  compositions: TeamComposition[];
  onUpdateEntry: (updated: ScheduleEntry) => void;
  onDeleteEntry: (id: string) => void;
  onRefreshDay: (date: string) => void;
  onLogAudit: (log: AuditEntry) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  user: string;
}

const DailyModule: React.FC<DailyModuleProps> = ({ 
  teams, technicians, schedule, patterns, compositions, onUpdateEntry, onDeleteEntry, onRefreshDay, onLogAudit, selectedDate, setSelectedDate, user 
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const formattedDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const handleTechChange = (entry: ScheduleEntry, idx: number, techId: string) => {
    const currentTechId = entry.manualOverrides[idx] || entry.technicianIds[idx];
    
    // Verifica conflito global (técnico já escalado em outra equipe hoje)
    const isAlreadyOccupied = schedule.some(e => 
      e.teamId !== entry.teamId && 
      (e.manualOverrides[0] === techId || (e.technicianIds[0] === techId && !e.manualOverrides[0]) ||
       e.manualOverrides[1] === techId || (e.technicianIds[1] === techId && !e.manualOverrides[1]))
    );

    if (techId !== "" && isAlreadyOccupied) {
      const techName = technicians.find(t => t.id === techId)?.name;
      alert(`🚨 CONFLITO: O técnico ${techName} já está escalado em outra equipe hoje.`);
      return;
    }

    const oldName = technicians.find(t => t.id === currentTechId)?.name || "Vago";
    const newName = technicians.find(t => t.id === techId)?.name || "Vago";

    onLogAudit({
      timestamp: new Date().toISOString(),
      date: selectedDate,
      teamId: entry.teamId,
      action: 'TROCA_TECNICO' as AuditAction,
      details: `Substituição manual na posição ${idx + 1}: de ${oldName} para ${newName}`,
      user: user,
      before_value: oldName,
      after_value: newName
    });

    const overrides = {...entry.manualOverrides, [idx]: techId};
    onUpdateEntry({...entry, manualOverrides: overrides});
  };

  const generatePrint = async () => {
    if (!printRef.current) return;
    const el = printRef.current;
    el.style.display = 'block';
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    
    try {
        const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const link = document.createElement('a');
        link.download = `Escala_${selectedDate}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (err) {
        console.error("Erro ao gerar print:", err);
    } finally {
        el.style.display = 'none';
    }
  };

  const getTechName = (id: string) => technicians.find(t => t.id === id)?.name || "---";

  const allTeamsDisplay = useMemo(() => {
    return teams.sort((a,b) => a.name.localeCompare(b.name, undefined, {numeric: true})).map(team => {
        const entry = schedule.find(e => String(e.teamId).toLowerCase() === String(team.id).toLowerCase());
        return { team, entry };
    });
  }, [teams, schedule]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header e Controles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl border-b-4 border-amber-500">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/20 rounded-xl">
                <span className="text-2xl">📋</span>
            </div>
            <div>
                <h3 className="text-xl font-black uppercase tracking-widest text-amber-400">Escala Diária Operacional</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-tighter">{formattedDate}</p>
            </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
            <button 
                onClick={() => confirm('Remover todos os ajustes manuais e voltar para a regra padrão do sistema?') && onRefreshDay(selectedDate)}
                className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition shadow-lg shadow-amber-900/40"
            >
                🔄 Resetar Ajustes
            </button>
            <button onClick={generatePrint} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition shadow-lg shadow-blue-900/40">
                📸 Gerar Print
            </button>
            <div className="bg-slate-800 p-2 rounded-xl border border-slate-700">
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-slate-900 border-none rounded-lg px-3 py-1 text-sm font-bold text-amber-400 outline-none cursor-pointer" />
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-200">
                        <tr>
                            <th className="p-4 text-left w-44">Unidade</th>
                            <th className="p-4 text-left">Técnicos (Laranja = Ajuste Manual)</th>
                            <th className="p-4 text-left w-72">Notas Operacionais</th>
                            <th className="p-4 text-center w-24">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {allTeamsDisplay.map(({ team, entry }) => {
                            const isOpen = !!entry;
                            const hasManual = isOpen && Object.keys(entry.manualOverrides).length > 0;
                            
                            return (
                                <tr key={team.id} className={`transition-all duration-300 ${!isOpen ? 'bg-slate-50/50 opacity-40 grayscale' : hasManual ? 'bg-amber-50/50 border-l-4 border-amber-500' : 'hover:bg-slate-50'}`}>
                                    <td className={`p-4 font-black text-xs ${!isOpen ? 'text-slate-300' : team.type === 'Suporte' ? 'text-cyan-700' : 'text-orange-700'}`}>
                                        <div className="flex flex-col">
                                            <span>{team.name}</span>
                                            <span className={`text-[8px] font-bold uppercase mt-1 ${!isOpen ? 'text-slate-300' : hasManual ? 'text-amber-600' : 'text-emerald-500'}`}>
                                                ● {isOpen ? (hasManual ? 'AJUSTE MANUAL' : 'REGRA DE SISTEMA') : 'FOLGA PREVISTA'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {isOpen ? (
                                            <div className="flex flex-wrap gap-2">
                                                {[0, 1].map((idx) => {
                                                    const isManual = !!entry.manualOverrides[idx];
                                                    const currentId = entry.manualOverrides[idx] || entry.technicianIds[idx];
                                                    return (
                                                        <select 
                                                            key={idx}
                                                            className={`text-[10px] rounded-lg border-2 p-2 min-w-[150px] outline-none transition-all font-bold ${isManual ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-sm' : 'bg-white border-slate-100 text-slate-600'}`}
                                                            value={currentId || ''}
                                                            onChange={(e) => handleTechChange(entry, idx, e.target.value)}
                                                        >
                                                            <option value="">-- Vago --</option>
                                                            {technicians.sort((a,b) => a.name.localeCompare(b.name)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                        </select>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-[10px] text-slate-300 font-bold uppercase italic">Linha desativada pelo Dashboard Mensal</div>
                                        )}
                                    </td>
                                    <td className="p-4 space-y-2">
                                        {isOpen && (
                                            <>
                                                <input className="w-full text-[10px] font-bold p-1 bg-transparent border-b border-slate-100 focus:border-amber-500 outline-none" value={entry.agendamento || ''} placeholder="Ex: Roteiro Sul..." onChange={(e) => onUpdateEntry({...entry, agendamento: e.target.value})} />
                                                <input className="w-full text-[10px] font-bold p-1 bg-transparent border-b border-slate-100 focus:border-blue-500 outline-none" value={entry.supervisao || ''} placeholder="Ex: Supervisor Silva..." onChange={(e) => onUpdateEntry({...entry, supervisao: e.target.value})} />
                                            </>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        {isOpen ? (
                                            <button 
                                              onClick={() => confirm('Esta ação forçará o fechamento desta equipe apenas hoje via desvio manual. Confirmar?') && onDeleteEntry(entry.id)} 
                                              className="text-[9px] font-black text-red-500 border border-red-200 px-2 py-1 rounded hover:bg-red-50 transition-colors uppercase"
                                            >
                                              Fechar
                                            </button>
                                        ) : (
                                            <button 
                                              onClick={() => onUpdateEntry({id: `${selectedDate}-${team.id}`, date: selectedDate, teamId: team.id, technicianIds: ['', ''], manualOverrides: {}})} 
                                              className="text-[9px] font-black text-emerald-600 border border-emerald-200 px-2 py-1 rounded hover:bg-emerald-50 transition-colors uppercase"
                                            >
                                              Abrir
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Painel Lateral de Orquestração */}
        <div className="xl:col-span-1 space-y-6">
            <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl border-t-4 border-amber-500">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-4">Orquestração Ativa</h4>
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                        <span className="text-xs text-slate-400 font-bold uppercase">Frotas em Operação</span>
                        <span className="text-xl font-black text-amber-400">{schedule.length}</span>
                    </div>
                    <div className="p-3 bg-blue-900/20 rounded-xl border border-blue-500/20">
                      <p className="text-[10px] font-bold text-blue-300 leading-tight">
                        💡 A escala é recalculada automaticamente ao alterar regras nos níveis 1 e 2.
                      </p>
                    </div>
                </div>
            </div>
        </div>
      </div>
      
      {/* Container de Print (Invisível) */}
      <div ref={printRef} style={{ display: 'none', width: '800px', backgroundColor: '#fff' }}>
        <div className="font-sans text-[12px] border border-black p-6">
            <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-4">
              <h2 className="text-xl font-black uppercase">Escala Operacional</h2>
              <div className="text-right">
                <p className="font-bold">{formattedDate}</p>
                <p className="text-[10px] uppercase">Emitido por: {user}</p>
              </div>
            </div>
            <div className="grid grid-cols-12 bg-black text-white font-black p-3 text-[10px] uppercase tracking-widest">
                <div className="col-span-6">Unidade / Componentes</div>
                <div className="col-span-3 text-center">Agendamento</div>
                <div className="col-span-3 text-center">Supervisão</div>
            </div>
            {schedule.sort((a,b) => a.teamId.localeCompare(b.teamId, undefined, {numeric: true})).map(entry => (
                <div key={entry.id} className="grid grid-cols-12 border-b border-black/20 p-3">
                    <div className="col-span-6 font-bold flex flex-col">
                        <span className="text-[10px] text-slate-500">{teams.find(t => String(t.id).toLowerCase() === String(entry.teamId).toLowerCase())?.name}</span>
                        <span className="text-xs">{getTechName(entry.manualOverrides[0] || entry.technicianIds[0])} / {getTechName(entry.manualOverrides[1] || entry.technicianIds[1])}</span>
                    </div>
                    <div className="col-span-3 text-center text-[10px] italic flex items-center justify-center">{entry.agendamento || "N/A"}</div>
                    <div className="col-span-3 text-center text-[10px] italic flex items-center justify-center">{entry.supervisao || "N/A"}</div>
                </div>
            ))}
            <div className="mt-8 pt-4 border-t border-black/10 text-[8px] text-slate-400 text-center uppercase tracking-widest">
              EscalaPro v2.1 - Core Operational Engine
            </div>
        </div>
      </div>
    </div>
  );
};

export default DailyModule;
