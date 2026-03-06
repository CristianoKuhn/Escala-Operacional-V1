
import React, { useState } from 'react';
import { supabase } from '../services/supabase';

interface AuthProps {
  onLogin: () => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      setError('Credenciais inválidas. Verifique seu email e senha.');
    } else {
      onLogin();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
        <div className="p-8 bg-blue-600 text-white text-center">
          <h1 className="text-3xl font-black tracking-tighter">EscalaPro</h1>
          <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mt-2">Acesso Restrito - ISP Core</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 animate-bounce">
              ⚠️ {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Corporativo</label>
            <input 
              type="email" 
              required
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
              placeholder="exemplo@isp.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
            <input 
              type="password" 
              required
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-200 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'AUTENTICANDO...' : 'ENTRAR NO SISTEMA'}
          </button>
          
          <div className="text-center">
             <button type="button" className="text-[10px] font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase">Esqueci minha senha</button>
          </div>
        </form>
        
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
           <p className="text-[9px] text-slate-400 font-medium italic">Sistema de Gestão de Escalas v2.0 - 2026</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
