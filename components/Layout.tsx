
import React from 'react';
import { UserProfile } from '../types';
import { supabase } from '../services/supabase';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userProfile: UserProfile | null;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, userProfile }) => {
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'superadm';

  const tabs = [
    { id: 'rules', label: '1. Regras Gerais', icon: '⚙️' },
    { id: 'monthly', label: '2. Dashboard Mensal', icon: '📅' },
    { id: 'daily', label: '3. Escala Diária', icon: '📋' },
    { id: 'logs', label: '4. Registro de Auditoria', icon: '📜' },
  ];

  // Adiciona a 5ª aba apenas para Admins
  if (isAdmin) {
    tabs.push({ id: 'users', label: '5. Gestão de Acessos', icon: '👤' });
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-20">
        <div className="p-6">
          <h1 className="text-2xl font-black tracking-tight text-blue-400">EscalaPro</h1>
          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-black">Core Engine v2.1</p>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-300 group ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 translate-x-1'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className={`mr-3 text-lg transition-transform group-hover:scale-110`}>{tab.icon}</span>
              <span className="font-bold text-xs uppercase tracking-wider">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* User Info Section */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30">
           <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-black text-white text-sm shadow-inner">
                {userProfile?.full_name?.substring(0,2).toUpperCase() || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-[11px] font-black text-white truncate">{userProfile?.full_name || 'Usuário'}</p>
                <p className={`text-[9px] font-bold uppercase tracking-widest ${userProfile?.role === 'superadm' ? 'text-amber-400' : 'text-blue-400'}`}>
                  {userProfile?.role || 'operador'}
                </p>
              </div>
           </div>
           <button 
            onClick={handleLogout}
            className="w-full py-2 bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-400 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
           >
             Encerrar Sessão
           </button>
        </div>

        <div className="p-6 border-t border-slate-800">
           <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
              <p className="text-[9px] text-slate-500 font-black uppercase">Segurança</p>
              <p className="text-[10px] text-emerald-400 font-bold uppercase mt-1">● Conexão Criptografada</p>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm">
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              {tabs.find(t => t.id === activeTab)?.label.split('. ')[1]}
            </h2>
          </div>
          <div className="flex items-center space-x-4">
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável</span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  userProfile?.role === 'superadm' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-slate-700 bg-slate-100 border-slate-200'
                }`}>
                  {userProfile?.role === 'superadm' ? 'Super Administrador' : userProfile?.role === 'admin' ? 'Administrador' : userProfile?.role === 'supervisor' ? 'Supervisor' : 'Operador'}
                </span>
             </div>
          </div>
        </header>
        <div className="p-8 pb-20">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
