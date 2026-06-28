'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { HardHat, Lock, Mail, RefreshCw, ArrowRight } from 'lucide-react';

export default function NexusLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Deu certo! Redireciona para a matriz móvel de obras
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setErro('Acesso negado: E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-amber-500 selection:text-black font-sans antialiased">
      <div className="w-full max-w-sm">
        
        {/* LOGO NEXUS */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-amber-500 p-3 rounded-2xl text-slate-950 font-black tracking-tighter text-2xl shadow-xl shadow-amber-500/10 mb-3">
            NX
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">NEXUS OBRA</h1>
          <p className="text-xs text-slate-400 mt-1">Portal de Operações e Engenharia</p>
        </div>

        {/* CAIXA DE LOGIN */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-sm font-bold text-slate-200 mb-6 flex items-center gap-2 border-b border-slate-800 pb-3">
            <Lock className="w-4 h-4 text-amber-500" /> Identificação Restrita
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                E-mail Corporativo
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="engenheiro@construtora.com"
                  className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            {erro && (
              <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-xl text-red-200 text-xs text-center font-medium animate-shake">
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/10 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Entrar no Canteiro</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-[10px] text-slate-600 text-center mt-8">
          🔒 Acesso monitorado por IP e carimbo de tempo Nexus.
        </p>

      </div>
    </div>
  );
}