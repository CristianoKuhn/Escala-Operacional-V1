
export enum ScaleType {
  MON_FRI = 'Seg a Sex',
  TUE_SAT = 'Ter a Sab'
}

export type UserRole = 'superadm' | 'admin' | 'supervisor' | 'operador';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  created_at?: string;
}

export interface UserInvitation {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Technician {
  id: string;
  name: string;
  active: boolean;
  role: 'Instalador' | 'Suporte';
}

export interface Team {
  id: string;
  name: string;
  city: string;
  requiredTechnicians: number;
  type: 'Equipe' | 'Suporte';
}

export interface TeamComposition {
  teamId: string;
  year: number;
  month: number;
  technicianIds: string[];
}

export interface WeeklyPattern {
  teamId: string;
  year: number;
  month: number;
  weekIndex: number;
  scaleType: ScaleType;
  sundayWork?: boolean;
}

export interface ScheduleEntry {
  id: string;
  date: string;
  teamId: string;
  technicianIds: string[]; // Vem da Composição (Regra)
  manualOverrides: Record<string, string>; // Alterações Manuais
  agendamento?: string;
  ativacao?: string;
  supervisao?: string;
}

export type AuditAction = 'TROCA_TECNICO' | 'ABERTURA_EQUIPE' | 'FECHAMENTO_EQUIPE' | 'RESET_ESCALA' | 'PUBLICAR_VERSAO' | 'GESTAO_USUARIO' | 'ALTERACAO_REGIME';

export interface AuditEntry {
  id?: string;
  timestamp: string;
  date: string;
  teamId: string;
  action: AuditAction;
  details: string;
  user: string;
  user_id?: string;
  before_value?: string;
  after_value?: string;
}

export interface VersionSnapshot {
  id: string;
  published_at: string;
  published_by: string;
  version_label: string;
  data_snapshot: ScheduleEntry[];
}
