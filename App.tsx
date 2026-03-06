
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import RulesModule from './components/RulesModule';
import MonthlyModule from './components/MonthlyModule';
import DailyModule from './components/DailyModule';
import LogModule from './components/LogModule';
import UserManagementModule from './components/UserManagementModule';
import { INITIAL_TEAMS, INITIAL_TECHNICIANS } from './constants';
import { ScheduleEntry, AuditEntry, Team, Technician, WeeklyPattern, TeamComposition, UserProfile, UserRole } from './types';
import { getEffectiveScheduleForDate } from './services/scaleEngine';
import { supabase } from './services/supabase';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState('rules');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  const [technicians, setTechnicians] = useState<Technician[]>(INITIAL_TECHNICIANS);
  const [patterns, setPatterns] = useState<WeeklyPattern[]>([]);
  const [compositions, setCompositions] = useState<TeamComposition[]>([]);
  
  const [savedDrafts, setSavedDrafts] = useState<ScheduleEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [currentDailyDate, setCurrentDailyDate] = useState(new Date().toISOString().split('T')[0]);

  // DERIVAÇÃO DE ESTADO (ORQUESTRAÇÃO HIERÁRQUICA)
  const effectiveDailySchedule = useMemo(() => {
    const dateObj = new Date(currentDailyDate + 'T12:00:00');
    return getEffectiveScheduleForDate(dateObj, teams, patterns, compositions, savedDrafts);
  }, [currentDailyDate, teams, patterns, compositions, savedDrafts]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
      else setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      let { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
      const { data: userData } = await supabase.auth.getUser();
      const userEmail = userData.user?.email || '';
      
      if (!data) {
        const role = userEmail.toLowerCase() === 'cristiano.kuhn@rbt.psi.br' ? 'superadm' : 'operador';
        const newProfile = { id: userId, full_name: userData.user?.user_metadata?.full_name || userEmail.split('@')[0], email: userEmail, role: role as UserRole };
        await supabase.from('profiles').insert(newProfile);
        data = newProfile;
      }
      setUserProfile(data as any);
      await fetchBaseData();
    } catch (err) {
      console.error("Erro ao carregar perfil:", err);
      setLoading(false);
    }
  };

  const fetchBaseData = async () => {
    setSyncing(true);
    try {
      const [
        { data: dbTeams },
        { data: dbTechs },
        { data: dbPatterns },
        { data: dbComps },
        { data: dbAudits },
        { data: dbDrafts }
      ] = await Promise.all([
        supabase.from('teams').select('*'),
        supabase.from('technicians').select('*'),
        supabase.from('weekly_patterns').select('*'),
        supabase.from('team_compositions').select('*'),
        supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(100),
        supabase.from('escala_rascunhos').select('*')
      ]);

      if (dbTeams) {
        setTeams(dbTeams.map(t => ({ 
          id: t.id, name: t.name, city: t.city, requiredTechnicians: t.required_technicians, type: t.type 
        })));
      }
      
      if (dbTechs) {
        setTechnicians(dbTechs.map(t => ({ 
          id: t.id, name: t.name, active: t.active, role: t.role 
        })));
      }
      
      if (dbPatterns) {
        setPatterns(dbPatterns.map(p => ({ 
          teamId: p.team_id, year: p.year, month: p.month, weekIndex: p.week_index, scaleType: p.scale_type, sunday_work: p.sunday_work 
        })));
      }
      
      if (dbComps) {
        setCompositions(dbComps.map(c => ({ 
          teamId: c.team_id, year: c.year, month: c.month, technicianIds: c.technician_ids || [] 
        })));
      }

      if (dbAudits) setAuditLogs(dbAudits);
      
      if (dbDrafts) {
        setSavedDrafts(dbDrafts.map(d => ({ 
          id: d.id, date: d.date, teamId: d.team_id, 
          technicianIds: d.technician_ids || [], 
          manualOverrides: d.manual_overrides || {},
          agendamento: d.agendamento, supervisao: d.supervisao
        })));
      }
      
    } catch (error) {
      console.error('Erro ao sincronizar dados:', error);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const handleUpdatePattern = async (newPattern: WeeklyPattern) => {
    setSyncing(true);
    try {
      const payload = {
        team_id: String(newPattern.teamId).toLowerCase(),
        year: Number(newPattern.year),
        month: Number(newPattern.month),
        week_index: Number(newPattern.weekIndex),
        scale_type: String(newPattern.scaleType),
        sunday_work: Boolean(newPattern.sundayWork)
      };

      const { error } = await supabase.from('weekly_patterns').upsert(payload, { onConflict: 'team_id,year,month,week_index' });
      if (error) throw error;
      
      setPatterns(prev => {
        const filtered = prev.filter(p => !(p.teamId === newPattern.teamId && p.month === newPattern.month && p.weekIndex === newPattern.weekIndex && p.year === newPattern.year));
        return [...filtered, newPattern];
      });
    } catch (err: any) {
      console.error("Erro Dashboard Mensal:", err);
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdateComposition = async (comp: TeamComposition) => {
    setSyncing(true);
    try {
      const payload = { 
        team_id: String(comp.teamId).toLowerCase(), 
        year: Number(comp.year), 
        month: Number(comp.month), 
        technician_ids: comp.technicianIds.map(id => id ? String(id) : "") 
      };

      const { error } = await supabase.from('team_compositions').upsert(payload, { onConflict: 'team_id,year,month' });
      if (error) throw error;

      setCompositions(prev => {
        const filtered = prev.filter(c => !(c.teamId === comp.teamId && c.month === comp.month && c.year === comp.year));
        return [...filtered, comp];
      });
    } catch (err: any) {
      console.error("Erro Regra Geral:", err);
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdateSchedule = async (updated: ScheduleEntry) => {
    setSyncing(true);
    try {
      const { error } = await supabase.from('escala_rascunhos').upsert({
        id: updated.id, user_id: session?.user?.id, date: updated.date, team_id: String(updated.teamId).toLowerCase(),
        technician_ids: updated.technicianIds || [], 
        manual_overrides: updated.manualOverrides || {},
        agendamento: updated.agendamento || '', supervisao: updated.supervisao || ''
      }, { onConflict: 'id' });
      
      if (error) throw error;
      
      setSavedDrafts(prev => {
        const idx = prev.findIndex(s => s.id === updated.id);
        if (idx >= 0) {
          const newDrafts = [...prev];
          newDrafts[idx] = updated;
          return newDrafts;
        }
        return [...prev, updated];
      });
    } catch (err) {
      console.error("Erro Escala Diária:", err);
    } finally {
      setSyncing(false);
    }
  };

  const handleLogAudit = async (log: AuditEntry) => {
    try {
      await supabase.from('audit_logs').insert({
        timestamp: log.timestamp, date: log.date, team_id: log.teamId,
        action: log.action, details: log.details, user: log.user,
        user_id: session?.user?.id, before_value: log.before_value, after_value: log.after_value
      });
      setAuditLogs(prev => [log, ...prev].slice(0, 100));
    } catch (err) {
      console.error("Erro Auditoria:", err);
    }
  };

  if (!session && !loading) return <Auth onLogin={() => setLoading(true)} />;
  if (loading) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="font-black text-xs uppercase tracking-widest animate-pulse text-blue-400">Recalibrando Interface de Gestão...</p>
    </div>
  );

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} userProfile={userProfile}>
      <div className="fixed bottom-6 right-6 z-50">
        {syncing && (
          <div className="bg-slate-900/90 backdrop-blur text-blue-400 px-4 py-2 rounded-xl border border-blue-500/30 flex items-center gap-3 animate-pulse shadow-2xl">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>
            <span className="text-[10px] font-black uppercase tracking-widest">Sincronização Ativa</span>
          </div>
        )}
      </div>

      {activeTab === 'rules' && (
        <RulesModule 
          teams={teams} technicians={technicians} compositions={compositions} 
          onUpdateComposition={handleUpdateComposition}
          onAddTech={async (t) => { 
            const { error } = await supabase.from('technicians').insert({ id: t.id, name: t.name, active: t.active, role: t.role });
            if (!error) setTechnicians([...technicians, t]);
          }} 
          onUpdateTech={async (t) => { 
            const { error } = await supabase.from('technicians').upsert({ id: t.id, name: t.name, active: t.active, role: t.role });
            if (!error) setTechnicians(prev => prev.map(i => i.id === t.id ? t : i));
          }}
          onDeleteTech={async (id) => { 
            const { error } = await supabase.from('technicians').delete().eq('id', id);
            if (!error) setTechnicians(technicians.filter(i => i.id !== id));
          }} 
          onAddTeam={async (team) => { 
            const { error } = await supabase.from('teams').insert({ id: team.id, name: team.name, city: team.city, type: team.type, required_technicians: team.requiredTechnicians });
            if (!error) setTeams(prev => [...prev, team]);
          }} 
        />
      )}
      
      {activeTab === 'monthly' && <MonthlyModule teams={teams} patterns={patterns} onUpdatePattern={handleUpdatePattern} />}
      
      {activeTab === 'daily' && (
        <DailyModule 
          teams={teams} technicians={technicians} 
          schedule={effectiveDailySchedule} 
          patterns={patterns} compositions={compositions} 
          onUpdateEntry={handleUpdateSchedule} 
          onDeleteEntry={async (id) => { 
            const { error } = await supabase.from('escala_rascunhos').delete().eq('id', id);
            if (!error) setSavedDrafts(prev => prev.filter(s => s.id !== id));
          }} 
          onRefreshDay={async (date) => {
            setSyncing(true);
            try {
              const { error } = await supabase.from('escala_rascunhos').delete().eq('date', date);
              if (error) throw error;
              setSavedDrafts(prev => prev.filter(s => s.date !== date));
              
              handleLogAudit({
                timestamp: new Date().toISOString(),
                date: date,
                teamId: 'GLOBAL',
                action: 'RESET_ESCALA',
                details: `Sincronização forçada: Removidos desvios manuais de ${date}`,
                user: userProfile?.full_name || 'Operador'
              });
            } catch (err) {
              console.error("Erro no reset:", err);
            } finally {
              setSyncing(false);
            }
          }} 
          onLogAudit={handleLogAudit}
          selectedDate={currentDailyDate} setSelectedDate={setCurrentDailyDate} 
          user={userProfile?.full_name || 'Operador'}
        />
      )}
      
      {activeTab === 'logs' && <LogModule logs={auditLogs} teams={teams} technicians={technicians} />}
      {activeTab === 'users' && <UserManagementModule currentUser={userProfile} />}
    </Layout>
  );
};

export default App;
