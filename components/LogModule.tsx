
import React, { useState, useMemo } from 'react';
import { AuditEntry, Team, Technician } from '../types';

interface LogModuleProps {
  logs: AuditEntry[];
  teams: Team[];
  technicians: Technician[];
}

const LogModule: React.FC<LogModuleProps> = ({ logs, teams, technicians }) => {
  const [filterDate, setFilterDate] = useState('');
  const [filterAction, setFilterAction] = useState<string>('ALL');

  const filteredLogs = useMemo(() => {
    return logs
      .filter(log => (filterDate === '' || log.date === filterDate))
      .filter(log => (filterAction === 'ALL' || log.action === filterAction))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs, filterDate, filterAction]);

  const stats = useMemo(() => {
    return {
      total: logs.length,
      swaps: logs.filter(l => l.action === 'TROCA_TECNICO').length,
      resets: logs.filter(l => l.action === 'RESET_ESCALA').length,
      status: logs.filter(l => l.action === 'ABERTURA_EQUIPE' || l.action === 'FECHAMENTO_EQUIPE').length
    };
  }, [logs]);

  const getTeamName = (id: string) => teams.find(t => t.id === id)?.name || 'N/A';
  
  const downloadExcel = () => {
    const headers = ['Timestamp', 'Data Operacional', 'Equipe', 'Ação', 'Detalhes', 'Usuário'];
    const rows = filteredLogs.map(log => [
      new Date(log.timestamp).toLocaleString('pt-BR'),
      log.date,
      getTeamName(log.teamId),
      log.action,
      log.details,
      log.user
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(r => r.join(';'))
    ].join('\n');

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Auditoria_Escala_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadge = (action: string) => {
    switch(action) {
      case 'TROCA_TECNICO': return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[9px] font-black rounded-lg border border-amber-200">TROCA</span>;
      case 'ABERTURA_EQUIPE': return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[9px] font-black rounded-lg border border-emerald-200">ABERTURA</span>;
      case 'FECHAMENTO_EQUIPE': return <span className="px-2 py-1 bg-red-100 text-red-700 text-[9px] font-black rounded-lg border border-red-200">FECHAMENTO</span>;
      case 'RESET_ESCALA': return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[9px] font-black rounded-lg border border-blue-200">RESET</span>;
      default: return <span className="px-2 py-1 bg-slate-100 text-slate-700 text-[9px] font-black rounded-lg border border-slate-200">INFO</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-5 rounded-2xl border-b-4 border-blue-500 shadow-lg">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Logs</p>
          <p className="text-3xl font-black text-white">{stats.total}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-amber-600">Substituições</p>
          <p className="text-3xl font-black text-slate-800">{stats.swaps}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-emerald-600">Fluxo Equipes</p>
          <p className="text-3xl font-black text-slate-800">{stats.status}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-blue-600">Resets de Regra</p>
          <p className="text-3xl font-black text-slate-800">{stats.resets}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6">
             <div className="flex flex-col">
                <label className="text-[9px] font-black text-slate-400 uppercase mb-1">Filtrar Data</label>
                <input 
                  type="date" 
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10"
                />
             </div>
             <div className="flex flex-col">
                <label className="text-[9px] font-black text-slate-400 uppercase mb-1">Tipo de Ação</label>
                <select 
                   value={filterAction}
                   onChange={(e) => setFilterAction(e.target.value)}
                   className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10"
                >
                   <option value="ALL">Todas as Ações</option>
                   <option value="TROCA_TECNICO">Trocas Técnicas</option>
                   <option value="ABERTURA_EQUIPE">Aberturas</option>
                   <option value="FECHAMENTO_EQUIPE">Fechamentos</option>
                   <option value="RESET_ESCALA">Resets Gerais</option>
                </select>
             </div>
          </div>
          
          <button 
            onClick={downloadExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-100 flex items-center gap-2 transition-all active:scale-95"
          >
            📊 Exportar Excel (CSV)
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] text-slate-400 uppercase font-black tracking-widest border-b border-slate-100">
                <th className="px-8 py-4">Data/Hora Log</th>
                <th className="px-8 py-4">Dia Operacional</th>
                <th className="px-8 py-4">Equipe</th>
                <th className="px-8 py-4">Ação</th>
                <th className="px-8 py-4">Detalhes da Modificação</th>
                <th className="px-8 py-4">Usuário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-slate-400 text-xs italic font-medium">Nenhum registro encontrado para os filtros selecionados.</td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-4 text-[11px] font-bold text-slate-500 whitespace-nowrap">
                       {new Date(log.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-8 py-4 text-[11px] font-black text-slate-800">{log.date}</td>
                    <td className="px-8 py-4">
                       <span className="text-[11px] font-bold text-blue-700">{getTeamName(log.teamId)}</span>
                    </td>
                    <td className="px-8 py-4">
                       {getActionBadge(log.action)}
                    </td>
                    <td className="px-8 py-4 text-[11px] text-slate-600 font-medium">
                       {log.details}
                    </td>
                    <td className="px-8 py-4">
                       <span className="text-[10px] font-black text-slate-400 uppercase">{log.user}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LogModule;
