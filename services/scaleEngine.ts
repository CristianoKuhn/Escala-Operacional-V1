
import { ScaleType, Team, ScheduleEntry, WeeklyPattern, TeamComposition } from '../types';

/**
 * Valida se um dia específico é dia de trabalho para o regime escolhido
 */
export const isWorkDay = (date: Date, scaleType: ScaleType, sundayWork?: boolean): boolean => {
  const day = date.getDay(); // 0 (Dom) a 6 (Sab)
  
  if (day === 0) return !!sundayWork;

  const type = String(scaleType).trim();
  
  if (type === ScaleType.MON_FRI || type === 'Seg a Sex') {
    return day >= 1 && day <= 5;
  }
  
  if (type === ScaleType.TUE_SAT || type === 'Ter a Sab') {
    return day >= 2 && day <= 6;
  }
  
  return false;
};

/**
 * Calcula o índice da semana no mês baseado no primeiro dia do mês
 */
export const getWeekIndex = (date: Date): number => {
  const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const dayOfMonth = date.getDate();
  
  // Ajuste para garantir que a semana 0 comece no início do mês
  return Math.floor((dayOfMonth + firstDayWeekday - 1) / 7);
};

/**
 * ORQUESTRAÇÃO HIERÁRQUICA (CORE)
 * Esta função decide o estado de cada equipe para um dia específico.
 */
export const getEffectiveScheduleForDate = (
  date: Date,
  teams: Team[],
  patterns: WeeklyPattern[],
  compositions: TeamComposition[],
  savedDrafts: ScheduleEntry[]
): ScheduleEntry[] => {
  const dateStr = date.toISOString().split('T')[0];
  const year = date.getFullYear();
  const month = date.getMonth();
  const weekIndex = getWeekIndex(date);
  
  return teams.map(team => {
    const normalizedId = String(team.id).toLowerCase();

    // 1. D2 - REGIME MENSAL (Hierarquia Superior de Disponibilidade)
    const pattern = patterns.find(p => 
      String(p.teamId).toLowerCase() === normalizedId && 
      Number(p.year) === year && 
      Number(p.month) === month && 
      Number(p.weekIndex) === weekIndex
    );
    
    const activeRegime = pattern?.scaleType || ScaleType.MON_FRI;
    const isSundayEnabled = !!pattern?.sundayWork;
    const isWorkingToday = isWorkDay(date, activeRegime, isSundayEnabled);

    // Se o regime diz que NÃO trabalha, retornamos null (será filtrado ou marcado como fechado)
    if (!isWorkingToday) return null;

    // 2. D1 - COMPOSIÇÃO (Hierarquia de Atribuição de Técnicos)
    let comp = compositions.find(c => 
      String(c.teamId).toLowerCase() === normalizedId && 
      Number(c.year) === year && 
      Number(c.month) === month
    );

    // Fallback para Regra Geral (Mês 0) se não houver no mês atual
    if (!comp || comp.technicianIds.every(id => !id)) {
      comp = compositions.find(c => 
        String(c.teamId).toLowerCase() === normalizedId && 
        Number(c.month) === 0
      );
    }

    // 3. D3 - OVERRIDES (Persistência de ajustes manuais)
    const draft = savedDrafts.find(d => 
      d.date === dateStr && 
      String(d.teamId).toLowerCase() === normalizedId
    );

    return {
      id: `${dateStr}-${normalizedId}`,
      date: dateStr,
      teamId: team.id,
      // Se não houver rascunho, usa a composição D1
      technicianIds: comp?.technicianIds || ['', ''],
      // Mantém dados salvos se existirem
      manualOverrides: draft?.manualOverrides || {},
      agendamento: draft?.agendamento || '',
      supervisao: draft?.supervisao || ''
    } as ScheduleEntry;
  }).filter((entry): entry is ScheduleEntry => entry !== null);
};
