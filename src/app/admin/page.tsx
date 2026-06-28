'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Building2, Plus, Save, User } from 'lucide-react';

export default function AdminConstrutora() {
  const [nomeObra, setNomeObra] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function getUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUser(session.user);
    }
    getUser();
  }, []);

  async function cadastrarObra(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      // 1. Busca a construtora do usuário logado
      const { data: perfil } = await supabase
        .from('perfis_usuario')
        .select('construtora_id')
        .eq('id', user.id)
        .single();

      // 2. Insere a nova obra
      const { data: novaObra, error: errObra } = await supabase
        .from('obras')
        .insert({ nome: nomeObra, construtora_id: perfil.construtora_id })
        .select()
        .single();

      if (errObra) throw errObra;

      // 3. Vincula o usuário atual como responsável desta obra
      await supabase
        .from('permissoes_obra')
        .insert({ usuario_id: user.id, obra_id: novaObra.id });

      alert('Obra cadastrada e vinculada com sucesso!');
      setNomeObra('');
    } catch (err: any) {
      alert('Erro: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="max-w-md mx-auto bg-slate-900 p-6 rounded-xl border border-slate-800">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Building2 className="text-amber-500" /> Cadastrar Nova Obra
        </h2>
        <form onSubmit={cadastrarObra} className="space-y-4">
          <input
            className="w-full bg-slate-950 border border-slate-700 p-3 rounded-lg"
            placeholder="Nome do Edifício (Ex: Residencial Sol)"
            value={nomeObra}
            onChange={(e) => setNomeObra(e.target.value)}
          />
          <button 
            disabled={loading}
            className="w-full bg-amber-500 py-3 rounded-lg font-bold text-slate-950"
          >
            {loading ? 'Salvando...' : 'Criar Obra'}
          </button>
        </form>
      </div>
    </div>
  );
}