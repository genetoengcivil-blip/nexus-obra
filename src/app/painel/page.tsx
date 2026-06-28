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
  atividadeNome: string;
  fotoUrl: string;
  updatedAt: string;
}

export default function NexusPainelEscritorio() {
  const [estatisticas, setEstatisticas] = useState<AtividadeEstatistica[]>([]);
  const [ultimasFotos, setUltimasFotos] = useState<UltimaFoto[]>([]);
  const [totalApartamentos, setTotalApartamentos] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  async function carregarDadosPainel() {
    setLoading(true);
    try {
      const { count: contagemUnidades } = await supabase.from('unidades').select('*', { count: 'exact', head: true });
      const totalUnids = contagemUnidades || 0;
      setTotalApartamentos(totalUnids);

      const { data: atividades } = await supabase.from('atividades').select('*').order('nome');
      
      const { data: apontamentos } = await supabase
        .from('apontamentos')
        .select('status, atividade_id, foto_url, updated_at, unidades(nome, pavimentos(nome))');

      if (atividades && apontamentos) {
        const listaEst: AtividadeEstatistica[] = activitiesDataFormat(atividades, apontamentos, totalUnids);
        setEstatisticas(listaEst);

        const listaFotos: UltimaFoto[] = photosFeedDataFormat(apontamentos);
        setUltimasFotos(listaFotos);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do painel:', error);
    } finally {
      setLoading(false);
    }
  }

  function activitiesDataFormat(atividades: any[], apontamentos: any[], totalUnids: number) {
    return atividades.map((atv) => {
      const apontamentosDaAtividade = apontamentos.filter((ap) => ap.atividade_id === atv.id);
      const concluidas = apontamentosDaAtividade.filter((ap) => ap.status === 'concluido').length;
      const emAndamento = apontamentosDaAtividade.filter((ap) => ap.status === 'em_andamento').length;
      const porcentagem = totalUnids > 0 ? Math.round((concluidas / totalUnids) * 100) : 0;

      return {
        id: atv.id,
        nome: atv.nome,
        totalUnidades: totalUnids,
        concluidas,
        emAndamento,
        porcentagem,
      };
    });
  }

  function photosFeedDataFormat(apontamentos: any[]) {
    return apontamentos
      .filter((ap) => ap.foto_url)
      .map((ap) => ({
        unidadeNome: ap.unidades?.nome || 'N/A',
        pavimentoNome: ap.unidades?.pavimentos?.nome || 'N/A',
        atividadeNome: ap.atividade_id ? 'Serviço' : 'Geral',
        fotoUrl: ap.foto_url,
        updatedAt: new Date(ap.updated_at).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 6);
  }

  // TRAVA DE SEGURANÇA B2B: Verifica a sessão antes de abrir indicadores
  useEffect(() => {
    async function checarSessaoECarregar() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        window.location.href = '/login';
        return;
      }

      carregarDadosPainel();
    }

    checarSessaoECarregar();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <RefreshCw className="w-10 h-10 animate-spin text-amber-500 mb-4" />
        <p className="text-lg font-medium">Autenticando painel executivo...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans antialiased">
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-2.5 rounded-xl text-slate-950 font-black tracking-tighter text-xl shadow-lg">
            NX
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-2xl tracking-tight text-white">NEXUS OPERAÇÕES</h1>
              <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-full border border-slate-700 font-mono">DESKTOP V1.1</span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">Visão Executiva em Tempo Real: <strong className="text-slate-200">Torre A - Residencial Nexus</strong></p>
          </div>
        </div>
        <button
          onClick={carregarDadosPainel}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl font-medium text-xs text-slate-300 transition-colors shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar Indicadores
        </button>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4 shadow-sm">
              <div className="bg-amber-500/10 p-3 rounded-lg text-amber-500">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-slate-400 text-[11px] uppercase tracking-wider font-bold block">Estrutura Física</span>
                <span className="text-xl font-bold text-white">{totalApartamentos} Unidades</span>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4 shadow-sm">
              <div className="bg-emerald-500/10 p-3 rounded-lg text-emerald-500">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-slate-400 text-[11px] uppercase tracking-wider font-bold block">Frentes Prontas</span>
                <span className="text-xl font-bold text-white">
                  {estatisticas.reduce((acc, curr) => acc + curr.concluidas, 0)} Cômodos
                </span>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4 shadow-sm">
              <div className="bg-blue-500/10 p-3 rounded-lg text-blue-500">
                <HardHat className="w-6 h-6" />
              </div>
              <div>
                <span className="text-slate-400 text-[11px] uppercase tracking-wider font-bold block">Ritmo Ativo</span>
                <span className="text-xl font-bold text-white">
                  {estatisticas.reduce((acc, curr) => acc + curr.emAndamento, 0)} Em Execução
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-5 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-500" /> Saúde Físico-Financeira por Atividade
            </h2>
            <div className="space-y-5">
              {estatisticas.map((atv) => (
                <div key={atv.id} className="bg-slate-950 border border-slate-800/60 p-4 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-200">{atv.nome}</span>
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/5 border border-amber-500/10 px-2 py-0.5 rounded">
                      {atv.porcentagem}% Concluído
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${atv.porcentagem}%` }}
                    />
                  </div>
                  <div className="flex gap-4 mt-2.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-600" /> Total: {atv.totalUnidades} aptos</span>
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Pronto: {atv.concluidas}</span>
                    <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3 text-amber-500 animate-spin" style={{ animationDuration: '3s' }} /> Executando: {atv.emAndamento}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md flex flex-col">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
            <Camera className="w-4 h-4 text-emerald-500" /> Feed de Auditoria Visual (Canteiro)
          </h2>
          <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
            Últimas imagens probatórias anexadas pelas equipes de campo para liberação de medições.
          </p>

          {ultimasFotos.length === 0 ? (
            <div className="flex-1 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <Camera className="w-8 h-8 mb-2 opacity-30" />
              <p className="text-xs font-medium">Nenhum comprovante de foto enviado nas últimas horas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 overflow-y-auto max-h-[520px] pr-1">
              {ultimasFotos.map((foto, index) => (
                <div key={index} className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex gap-3 items-start group">
                  <div className="relative w-16 h-16 rounded-lg bg-slate-900 overflow-hidden border border-slate-800 shrink-0 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={foto.fotoUrl} 
                      alt="Evidência técnica" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-white truncate">{foto.unidadeNome}</span>
                      <span className="text-[9px] font-mono text-slate-500 shrink-0">{foto.updatedAt}</span>
                    </div>
                    <span className="text-[10px] text-amber-400 font-medium block truncate mb-1">{foto.pavimentoNome}</span>
                    <a 
                      href={foto.fotoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 hover:underline font-semibold"
                    >
                      Ampliar laudo <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}