'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart3, Building2, Camera, CheckCircle2, Clock, ExternalLink, HardHat, RefreshCw } from 'lucide-react';

interface AtividadeEstatistica {
  id: string;
  nome: string;
  totalUnidades: number;
  concluidas: number;
  emAndamento: number;
  porcentagem: number;
}

interface UltimaFoto {
  unidadeNome: string;
  pavimentoNome: string;
  fotoUrl: string;
  updatedAt: string;
}

export default function NexusPainelEscritorio() {
  const [estatisticas, setEstatisticas] = useState<AtividadeEstatistica[]>([]);
  const [ultimasFotos, setUltimasFotos] = useState<UltimaFoto[]>([]);
  const [totalApartamentos, setTotalApartamentos] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [obraAtiva, setObraAtiva] = useState<any>(null);

  async function carregarDadosPainel(obraId: string) {
    setLoading(true);
    try {
      // 1. Total de unidades da OBRA específica
      const { count } = await supabase
        .from('unidades')
        .select('*, pavimentos!inner(bloco_id, blocos!inner(obra_id))', { count: 'exact', head: true })
        .eq('pavimentos.blocos.obra_id', obraId);

      const totalUnids = count || 0;
      setTotalApartamentos(totalUnids);

      // 2. Atividades e Apontamentos filtrados pela obra
      const { data: atividades } = await supabase.from('atividades').select('*');
      
      const { data: apontamentos } = await supabase
        .from('apontamentos')
        .select(`
          status, atividade_id, foto_url, updated_at, 
          unidades!inner(nome, pavimentos!inner(nome, blocos!inner(obra_id)))
        `)
        .eq('unidades.pavimentos.blocos.obra_id', obraId);

      if (atividades && apontamentos) {
        setEstatisticas(activitiesDataFormat(atividades, apontamentos, totalUnids));
        setUltimasFotos(photosFeedDataFormat(apontamentos));
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  function activitiesDataFormat(atividades: any[], apontamentos: any[], totalUnids: number) {
    return atividades.map((atv) => {
      const aps = apontamentos.filter((ap) => ap.atividade_id === atv.id);
      const concluidas = aps.filter((ap) => ap.status === 'concluido').length;
      const emAndamento = aps.filter((ap) => ap.status === 'em_andamento').length;
      return {
        id: atv.id,
        nome: atv.nome,
        totalUnidades: totalUnids,
        concluidas,
        emAndamento,
        porcentagem: totalUnids > 0 ? Math.round((concluidas / totalUnids) * 100) : 0,
      };
    });
  }

  function photosFeedDataFormat(apontamentos: any[]) {
    return apontamentos
      .filter((ap) => ap.foto_url)
      .map((ap) => ({
        unidadeNome: ap.unidades?.nome || 'N/A',
        pavimentoNome: ap.unidades?.pavimentos?.nome || 'N/A',
        fotoUrl: ap.foto_url,
        updatedAt: new Date(ap.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 6);
  }

  useEffect(() => {
    async function inicializar() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { window.location.href = '/login'; return; }

      // Busca a permissão do usuário para saber qual obra ele gerencia
      const { data: permissao } = await supabase
        .from('permissoes_obra')
        .select('obra_id, obras(nome)')
        .eq('usuario_id', session.user.id)
        .single();

      if (permissao) {
        setObraAtiva(permissao.obras);
        carregarDadosPainel(permissao.obra_id);
      } else {
        setLoading(false);
      }
    }
    inicializar();
  }, []);

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white"><RefreshCw className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <header className="max-w-7xl mx-auto border-b border-slate-800 pb-6 mb-8">
        <h1 className="text-2xl font-bold">Painel Executivo: {obraAtiva?.nome || 'Sem obra atribuída'}</h1>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
               <span className="text-[11px] uppercase font-bold text-slate-400">Estrutura Física</span>
               <p className="text-xl font-bold">{totalApartamentos} Unidades</p>
            </div>
            {/* Adicione os outros cards aqui... */}
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-sm font-bold uppercase mb-4">Progresso por Atividade</h2>
            {estatisticas.map((atv) => (
              <div key={atv.id} className="mb-4">
                <div className="flex justify-between text-xs mb-1"><span>{atv.nome}</span><span>{atv.porcentagem}%</span></div>
                <div className="w-full bg-slate-800 h-2 rounded-full"><div className="bg-amber-500 h-2 rounded-full" style={{width: `${atv.porcentagem}%`}}/></div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-bold uppercase mb-4 flex items-center gap-2"><Camera className="text-emerald-500"/> Auditoria Visual</h2>
          <div className="grid gap-4">
            {ultimasFotos.map((foto, i) => (
              <div key={i} className="bg-slate-950 p-2 rounded-lg flex items-center gap-3">
                <img src={foto.fotoUrl} className="w-12 h-12 object-cover rounded"/>
                <div>
                  <p className="text-xs font-bold">{foto.unidadeNome}</p>
                  <p className="text-[10px] text-slate-500">{foto.updatedAt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}