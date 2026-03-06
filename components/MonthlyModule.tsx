
import React, { useState, useMemo } from 'react';
import { Team, ScaleType, WeeklyPattern } from '../types';

interface MonthlyModuleProps {
  teams: Team[];
  patterns: WeeklyPattern[];
  onUpdatePattern: (pattern: WeeklyPattern) => void;
}

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MonthlyModule: React.FC<MonthlyModuleProps> = ({ teams, patterns, onUpdatePattern }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const weeks = useMemo(() => {
    const dates = [];
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const date = new Date(firstDay);
    
    while (date.getDay() !== 0) {
      date.setDate(date.getDate() - 1);
    }

    for (let i = 0; i < 6; i++) {
      dates.push(new Date(date));
      date.setDate(date.getDate() + 7);
      if (date.getMonth() !== selectedMonth && i >= 4) break;
    }
    return dates;
  }, [selectedMonth, selectedYear]);

  const toggleScale = (teamId: string, weekIndex: number) => {
    const existing = patterns.find(p => 
      p.teamId === teamId && p.month === selectedMonth && p.weekIndex === weekIndex && p.year === selectedYear
    );
    const newScale = existing?.scaleType === ScaleType.TUE_SAT ? ScaleType.MON_FRI : ScaleType.TUE_SAT;
    
    onUpdatePattern({
      teamId,
      year: selectedYear,
      month: selectedMonth,
      weekIndex,
      scaleType: newScale,
      sundayWork: existing?.sundayWork || false
    });
  };

  const toggleSunday = (teamId: string, weekIndex: number) => {
    const existing = patterns.find(p => 
      p.teamId === teamId && p.month === selectedMonth && p.weekIndex === weekIndex && p.year === selectedYear
    );
    
    onUpdatePattern({
      teamId,
      year: selectedYear,
      month: selectedMonth,
      weekIndex,
      scaleType: existing?.scaleType || ScaleType.MON_FRI,
      sundayWork: !existing?.sundayWork
    });
  };

  const renderTable = (teamType: 'Equipe' | 'Suporte', colorClass: string) => {
    const filteredTeams = teams
      .filter(t => t.type === teamType)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    return (
      <div className="mb-8 animate-in fade-in duration-500">
        <div className={`${colorClass} text-white p-3 rounded-t-2xl font-bold text-sm uppercase flex justify-between items-center shadow-lg`}>
           <span>{teamType === 'Equipe' ? 'Frota Operacional' : 'Unidades de Suporte'}</span>
           <span className="text-[10px] font-black px-3 py-1 bg-black/20 rounded-lg tracking-widest uppercase">Regime de Trabalho</span>
        </div>
        <div className="overflow-x-auto bg-white border-x border-b border-slate-200 rounded-b-2xl shadow-sm">
          <table className="w-full text-[11px] text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <th className="p-4 sticky left-0 z-30 bg-slate-50 border-r border-slate-300 w-44 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] uppercase tracking-wider text-[10px]">Equipe</th>
                {weeks.map((weekDate, idx) => (
                  <th key={idx} className="p-2 text-center border-r border-slate-100">
                    <div className="flex flex-col items-center">
                        <span className="text-[8px] text-slate-400 uppercase tracking-tighter mb-0.5 font-black">Semana {idx + 1}</span>
                        <span className="text-slate-700 font-bold">{weekDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTeams.map(team => (
                <tr key={team.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 sticky left-0 z-20 bg-white border-r border-slate-300 font-black text-slate-800 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)] uppercase">
                      {team.name}
                  </td>
                  {weeks.map((_, weekIdx) => {
                    const pattern = patterns.find(p => 
                      p.teamId === team.id && 
                      p.month === selectedMonth && 
                      p.weekIndex === weekIdx &&
                      p.year === selectedYear
                    );
                    const scale = pattern?.scaleType || ScaleType.MON_FRI;
                    const isSunday = !!pattern?.sundayWork;

                    return (
                      <td key={weekIdx} className="p-1 border-r border-slate-50">
                        <div className="flex gap-1 h-full p-1">
                            <button 
                                onClick={() => toggleScale(team.id, weekIdx)}
                                className={`flex-1 py-2 rounded-xl text-[9px] font-black transition-all border-b-2 active:scale-95 ${
                                    scale === ScaleType.TUE_SAT 
                                    ? 'bg-slate-700 border-slate-900 text-white' 
                                    : 'bg-blue-600 border-blue-800 text-white'
                                }`}
                            >
                                {scale}
                            </button>
                            <button 
                                onClick={() => toggleSunday(team.id, weekIdx)}
                                className={`w-8 py-2 rounded-xl text-[9px] font-black transition-all border-b-2 active:scale-95 ${
                                    isSunday 
                                    ? 'bg-emerald-600 border-emerald-800 text-white' 
                                    : 'bg-slate-100 border-slate-200 text-slate-400'
                                }`}
                            >
                                Dom
                            </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-700">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Definição de Regimes Semanais</h3>
          <p className="text-sm text-slate-500 font-medium italic">Dashboard 2: Configure os horários que alimentarão a Escala Diária.</p>
        </div>
        <div className="flex gap-2">
            <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10"
            >
                {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10"
            >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
            </select>
        </div>
      </div>

      {renderTable('Equipe', 'bg-orange-600')}
      {renderTable('Suporte', 'bg-cyan-600')}
    </div>
  );
};

export default MonthlyModule;
