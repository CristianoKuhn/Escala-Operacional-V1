
import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole, UserInvitation } from '../types';
import { supabase } from '../services/supabase';

interface UserManagementModuleProps {
  currentUser: UserProfile | null;
}

const UserManagementModule: React.FC<UserManagementModuleProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [invites, setInvites] = useState<UserInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('operador');
  const [isSending, setIsSending] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchUsersAndInvites();
  }, []);

  const fetchUsersAndInvites = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from('profiles').select('*').order('full_name');
    const { data: invitationData } = await supabase.from('user_invitations').select('*');
    
    if (profiles) setUsers(profiles);
    if (invitationData) setInvites(invitationData || []);
    setLoading(false);
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    if (userId === currentUser?.id) {
      alert("Você não pode alterar sua própria permissão.");
      return;
    }

    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) {
      alert("Erro ao atualizar papel: " + error.message);
    } else {
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    }
  };

  const handleResendInvite = async (email: string, id: string) => {
    if (resendingId) return;
    setResendingId(id);
    setStatusMsg(null);

    try {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase(),
        options: {
          emailRedirectTo: window.location.origin,
        }
      });

      if (authError) throw authError;

      setStatusMsg({ 
        type: 'success', 
        text: `E-mail de acesso reenviado com sucesso para ${email}.` 
      });
    } catch (error: any) {
      console.error("Erro no reenvio:", error);
      setStatusMsg({ 
        type: 'error', 
        text: `Erro ao reenviar: ${error.message}` 
      });
    } finally {
      setResendingId(null);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || isSending) return;

    setIsSending(true);
    setStatusMsg(null);

    if (users.find(u => u.email.toLowerCase() === inviteEmail.toLowerCase())) {
      setStatusMsg({ type: 'error', text: 'Este colaborador já possui conta ativa no sistema.' });
      setIsSending(false);
      return;
    }

    try {
      const { error: dbError } = await supabase.from('user_invitations').upsert({
        email: inviteEmail.toLowerCase(),
        role: inviteRole,
        invited_by: currentUser?.id
      });

      if (dbError) throw new Error("Falha ao registrar permissões no banco.");

      const { error: authError } = await supabase.auth.signInWithOtp({
        email: inviteEmail.toLowerCase(),
        options: {
          emailRedirectTo: window.location.origin,
        }
      });

      if (authError) throw authError;

      setStatusMsg({ 
        type: 'success', 
        text: `Convite enviado! Um link de acesso foi encaminhado para ${inviteEmail}.` 
      });
      setInviteEmail('');
      fetchUsersAndInvites();
    } catch (error: any) {
      console.error("Erro no convite:", error);
      setStatusMsg({ 
        type: 'error', 
        text: `Erro ao processar convite: ${error.message || 'Verifique as configurações de SMTP do Supabase.'}` 
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteInvite = async (id: string) => {
    if (!confirm("Deseja cancelar este convite pendente?")) return;
    const { error } = await supabase.from('user_invitations').delete().eq('id', id);
    if (!error) fetchUsersAndInvites();
  };

  const roles: UserRole[] = ['superadm', 'admin', 'supervisor', 'operador'];

  if (loading) return <div className="p-8 text-center text-slate-400 font-bold animate-pulse">SINCRONIZANDO BASE DE USUÁRIOS...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Status Alert Floating */}
      {statusMsg && (
        <div className={`fixed top-6 right-6 z-[60] p-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-right-10 duration-500 ${statusMsg.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-red-600 border-red-500 text-white'}`}>
          <span className="text-lg">{statusMsg.type === 'success' ? '✅' : '❌'}</span>
          <p className="text-xs font-black uppercase tracking-widest">{statusMsg.text}</p>
          <button onClick={() => setStatusMsg(null)} className="ml-4 opacity-50 hover:opacity-100 text-xs">✕</button>
        </div>
      )}

      {/* Invite Section */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        {isSending && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
             <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Disparando E-mail...</p>
             </div>
          </div>
        )}

        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-6 flex items-center gap-2">
           <span className="p-2 bg-blue-100 text-blue-600 rounded-xl text-sm">✉️</span>
           Convidar Novo Colaborador
        </h3>
        
        <form onSubmit={handleInvite} className="flex flex-col md:flex-row gap-4 items-end">
           <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email do Colaborador</label>
              <input 
                type="email" 
                required
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                placeholder="email@rbt.psi.br"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
           </div>
           <div className="w-full md:w-48 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Papel Inicial</label>
              <select 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 text-sm outline-none"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as UserRole)}
              >
                {roles.filter(r => r !== 'superadm' || currentUser?.role === 'superadm').map(r => (
                  <option key={r} value={r}>{r.toUpperCase()}</option>
                ))}
              </select>
           </div>
           <button 
             type="submit"
             disabled={isSending}
             className="bg-blue-600 hover:bg-blue-700 text-white font-black px-8 py-3.5 rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:opacity-50"
           >
             {isSending ? 'Processando...' : 'Enviar Acesso'}
           </button>
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
           <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Controle de Permissões Ativas</h3>
           <span className="text-[10px] font-bold text-slate-400 bg-white px-3 py-1 rounded-full border">{users.length} usuários</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[10px] text-slate-400 uppercase font-black tracking-widest border-b border-slate-100">
                <th className="px-8 py-4">Colaborador</th>
                <th className="px-8 py-4">Nível de Acesso</th>
                <th className="px-8 py-4">Status da Conta</th>
                <th className="px-8 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-4">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-black text-slate-400 text-[10px]">
                           {user.full_name?.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                           <p className="text-xs font-black text-slate-800">{user.full_name}</p>
                           <p className="text-[10px] font-medium text-slate-400">{user.email}</p>
                        </div>
                     </div>
                  </td>
                  <td className="px-8 py-4">
                     <select 
                        disabled={user.role === 'superadm' && currentUser?.role !== 'superadm'}
                        className="bg-white border-2 border-slate-100 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase outline-none focus:border-blue-500 transition-colors"
                        value={user.role}
                        onChange={(e) => handleUpdateRole(user.id, e.target.value as UserRole)}
                     >
                        {roles.map(r => (
                          <option key={r} value={r} disabled={r === 'superadm' && currentUser?.role !== 'superadm'}>
                            {r}
                          </option>
                        ))}
                     </select>
                  </td>
                  <td className="px-8 py-4">
                     <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                        <span className="w-1 h-1 bg-emerald-600 rounded-full animate-pulse"></span>
                        Ativo
                     </span>
                  </td>
                  <td className="px-8 py-4 text-right">
                     {user.id !== currentUser?.id && user.role !== 'superadm' && (
                       <button className="text-slate-300 hover:text-red-500 transition-colors">🗑️</button>
                     )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invites Table */}
      {invites.length > 0 && (
        <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl border-t-4 border-blue-500">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 flex items-center gap-3">
               <span className="animate-pulse">✉️</span> Convites Pendentes
            </h3>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{invites.length} aguardando</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invites.map(inv => (
              <div key={inv.id} className="bg-slate-800 p-5 rounded-2xl border border-slate-700 flex flex-col gap-4 group hover:border-blue-500/50 transition-all duration-300 shadow-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors truncate max-w-[150px]">{inv.email}</p>
                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mt-1">{inv.role}</p>
                  </div>
                  <span className="text-[8px] bg-slate-700 px-2 py-1 rounded-lg text-slate-400 font-bold uppercase whitespace-nowrap">Pendente</span>
                </div>
                
                <div className="flex gap-2">
                   <button 
                     onClick={() => handleResendInvite(inv.email, inv.id)}
                     disabled={resendingId === inv.id}
                     className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                       resendingId === inv.id 
                       ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                       : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white'
                     }`}
                   >
                     {resendingId === inv.id ? (
                       <>
                         <div className="w-2 h-2 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                         Enviando...
                       </>
                     ) : (
                       <>
                         <span className="text-xs">🔄</span> Reenviar E-mail
                       </>
                     )}
                   </button>
                   <button 
                     onClick={() => handleDeleteInvite(inv.id)}
                     className="w-10 flex items-center justify-center bg-red-900/20 text-red-500 hover:bg-red-600 hover:text-white rounded-xl transition-all"
                     title="Cancelar Convite"
                   >
                     🗑️
                   </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementModule;
