'use client';

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Building2, CheckCircle2, Clock, PlayCircle, RefreshCw, Layers, HardHat, Camera, X, UploadCloud, Check } from 'lucide-react';

interface Unidade {
  id: string;
  nome: string;
}

interface Pavimento {
  id: string;
  numero: number;
  nome: string;
  unidades: Unidade[];
}

interface Atividade {
  id: string;
  nome: string;
}

interface ApontamentoData {
  status: string;
  foto_url?: string;
}

export default function NexusObraMobileMVP() {
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [selectedAtividade, setSelectedAtividade] = useState<string>('');
  const [pavimentos, setPavimentos] = useState<Pavimento[]>([]);
  const [apontamentos, setApontamentos] = useState<Record<string, ApontamentoData>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [seeding, setSeeding] = useState<boolean>(false);
  const [bancoVazio, setBancoVazio] = useState<boolean>(false);

  // Estados para gerenciar a câmera e upload probatório
  const [unidadeParaFoto, setUnidadeParaFoto] = useState<{ id: string; nome: string } | null>(null);
  const [uploadingFoto, setUploadingFoto] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function carregarDadosBanco() {
    setLoading(true);
    try {
      const { data: listaAtividades } = await supabase.from('atividades').select('*').order('nome');
      
      if (!listaAtividades || listaAtividades.length === 0) {
        setBancoVazio(true);
        setLoading(false);
        return;
      }

      setBancoVazio(false);
      setAtividades(listaAtividades);

      if (!selectedAtividade && listaAtividades.length > 0) {
        setSelectedAtividade(listaAtividades[0].id);
      }

      const { data: listaPavimentos } = await supabase
        .from('pavimentos')
        .select(`id, numero, nome, unidades (id, nome)`)
        .order('numero', { ascending: false });

      if (listaPavimentos) {
        const pavimentosFormatados = listaPavimentos.map((p: any) => ({
          ...p,
          unidades: p.unidades.sort((a: Unidade, b: Unidade) => a.nome.localeCompare(b.nome))
        }));
        setPavimentos(pavimentosFormatados);
      }
    } catch (error) {
      console.error('Erro ao buscar estrutura:', error);
    } finally {
      setLoading(false);
    }
  }

  async function carregarStatusDaAtividade(idAtividade: string) {
    if (!idAtividade) return;
    const { data } = await supabase
      .from('apontamentos')
      .select('unidade_id, status, foto_url')
      .eq('atividade_id', idAtividade);

    const mapaStatus: Record<string, ApontamentoData> = {};
    data?.forEach((item) => {
      mapaStatus[item.unidade_id] = {
        status: item.status,
        foto_url: item.foto_url
      };
    });
    setApontamentos(mapaStatus);
  }

  useEffect(() => {
    carregarDadosBanco();
  }, []);

  useEffect(() => {
    if (selectedAtividade) {
      carregarStatusDaAtividade(selectedAtividade);
    }
  }, [selectedAtividade]);

  async function salvarStatusBanco(idUnidade: string, status: string, fotoUrl?: string) {
    const payload: any = {
      unidade_id: idUnidade,
      atividade_id: selectedAtividade,
      status: status,
      updated_at: new Date().toISOString()
    };

    if (fotoUrl) payload.foto_url = fotoUrl;

    const { error } = await supabase.from('apontamentos').upsert(
      payload,
      { onConflict: 'unidade_id,atividade_id' }
    );

    if (error) {
      alert('Erro ao salvar no servidor: ' + error.message);
      carregarStatusDaAtividade(selectedAtividade);
    }
  }

  function acionarCliqueUnidade(unid: Unidade) {
    if (!selectedAtividade) return;

    const dadosAtuais = apontamentos[unid.id] || { status: 'nao_iniciado' };
    const statusAtual = dadosAtuais.status;

    if (statusAtual === 'nao_iniciado') {
      const proximo = 'em_andamento';
      setApontamentos((prev) => ({ ...prev, [unid.id]: { ...dadosAtuais, status: proximo } }));
      salvarStatusBanco(unid.id, proximo);
    } else if (statusAtual === 'em_andamento') {
      // REGRA DE AUDITORIA: Para concluir, exige foto! Abrir modal da câmera.
      setUnidadeParaFoto({ id: unid.id, nome: unid.nome });
    } else if (statusAtual === 'concluido') {
      // Se já estava concluído e clicou, volta para não iniciado e limpa a foto
      const proximo = 'nao_iniciado';
      setApontamentos((prev) => ({ ...prev, [unid.id]: { status: proximo } }));
      salvarStatusBanco(unid.id, proximo, '');
    }
  }

  async function uploadFotoComprovante(event: React.ChangeEvent<HTMLInputElement>) {
    if (!event.target.files || event.target.files.length === 0 || !unidadeParaFoto) {
      return;
    }

    const arquivo = event.target.files[0];
    setUploadingFoto(true);

    try {
      // Gera um nome único: idAtividade_idUnidade_timestamp.jpg
      const extensao = arquivo.name.split('.').pop() || 'jpg';
      const nomeArquivo = `${selectedAtividade}_${unidadeParaFoto.id}_${Date.now()}.${extensao}`;
      const caminho = `torre_a/${nomeArquivo}`;

      const { error: uploadError } = await supabase.storage
        .from('comprovantes')
        .upload(caminho, arquivo, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('comprovantes')
        .getPublicUrl(caminho);

      const linkPublico = urlData.publicUrl;

      // Atualiza tela e banco com status concluido + URL da foto
      setApontamentos((prev) => ({
        ...prev,
        [unidadeParaFoto.id]: { status: 'concluido', foto_url: linkPublico }
      }));

      await salvarStatusBanco(unidadeParaFoto.id, 'concluido', linkPublico);
      setUnidadeParaFoto(null); // Fecha o modal
    } catch (erro: any) {
      alert('Falha ao enviar foto para a nuvem: ' + erro.message);
    } finally {
      setUploadingFoto(false);
    }
  }

  async function injetarPredioDeTesteNoBanco() {
    setSeeding(true);
    try {
      const { data: bloco, error: errB } = await supabase
        .from('blocos')
        .insert({ nome: 'Torre A - Residencial Nexus' })
        .select()
        .single();

      if (errB) throw errB;

      await supabase.from('atividades').insert([
        { nome: '1. Alvenaria de Vedação' },
        { nome: '2. Instalações Elétricas / Hidráulicas' },
        { nome: '3. Reboco Interno' },
        { nome: '4. Contrapiso e Regularização' }
      ]);

      for (let andar = 6; andar >= 1; andar--) {
        const { data: pav } = await supabase
          .from('pavimentos')
          .insert({
            bloco_id: bloco.id,
            numero: andar,
            nome: `${andar}º Pavimento`
          })
          .select()
          .single();

        if (pav) {
          const unidadesDoAndar = [1, 2, 3, 4].map((num) => ({
            pavimento_id: pav.id,
            nome: `Apto ${andar}0${num}`
          }));
          await supabase.from('unidades').insert(unidadesDoAndar);
        }
      }

      alert('Torre de teste gerada no seu Supabase com sucesso!');
      window.location.reload();
    } catch (e: any) {
      alert('Erro ao popular banco: ' + e.message);
      setSeeding(false);
    }
  }

  function renderizarCorBotao(status: string) {
    switch (status) {
      case 'em_andamento':
        return 'bg-amber-500 text-white border-amber-600 shadow-amber-200 animate-pulse';
      case 'concluido':
        return 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200';
    }
  }

  function renderizarIconeStatus(status: string) {
    switch (status) {
      case 'em_andamento':
        return <PlayCircle className="w-4 h-4 inline mr-1" />;
      case 'concluido':
        return <CheckCircle2 className="w-4 h-4 inline mr-1" />;
      default:
        return <Clock className="w-4 h-4 inline mr-1 opacity-40" />;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <RefreshCw className="w-10 h-10 animate-spin text-amber-500 mb-4" />
        <p className="text-lg font-medium">Conectando ao canteiro digital...</p>
      </div>
    );
  }

  if (bancoVazio) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl max-w-md shadow-2xl">
          <HardHat className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Supabase Conectado!</h1>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Sua conexão com o banco deu certo, mas as tabelas ainda estão vazias. Clique abaixo para simular a construção de um edifício de 6 andares.
          </p>
          <button
            onClick={injetarPredioDeTesteNoBanco}
            disabled={seeding}
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-slate-950"
          >
            {seeding ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Building2 className="w-5 h-5" />}
            {seeding ? 'Construindo prédio no banco...' : 'Gerar Prédio de Teste (Torre A)'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12 font-sans antialiased selection:bg-amber-500 selection:text-black relative">
      <header className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-amber-500 p-2 rounded-lg text-slate-950 font-black tracking-tighter shadow-md">
              NX
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight leading-none text-white">NEXUS OBRA</h1>
              <span className="text-[10px] uppercase tracking-widest text-amber-400 font-semibold">Canteiro Mobile v1.1</span>
            </div>
          </div>
          <button 
            onClick={() => carregarDadosBanco()} 
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
            title="Sincronizar dados"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 mt-4">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl shadow-sm mb-5">
          <label className="block text-xs uppercase tracking-wider font-bold text-slate-400 mb-2 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-500" /> Atividade em Inspeção:
          </label>
          <select
            value={selectedAtividade}
            onChange={(e) => setSelectedAtividade(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-white font-medium text-sm rounded-lg p-3 focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
          >
            {atividades.map((atv) => (
              <option key={atv.id} value={atv.id}>
                {atv.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3 px-1">
          <span>Matriz Espacial (Torre A)</span>
          <span>Foto obrigatória no aceite</span>
        </div>

        <div className="space-y-3.5">
          {pavimentos.map((pav) => (
            <div key={pav.id} className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 shadow-sm">
              <div className="border-b border-slate-800 pb-2 mb-2.5 flex justify-between items-center">
                <span className="font-bold text-xs text-slate-300 tracking-wide flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-600 inline-block"></span>
                  {pav.nome}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">LBS-{pav.numero}</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {pav.unidades.map((unid) => {
                  const dados = apontamentos[unid.id] || { status: 'nao_iniciado' };
                  const statusAtual = dados.status;
                  const temFoto = !!dados.foto_url;

                  return (
                    <button
                      key={unid.id}
                      onClick={() => acionarCliqueUnidade(unid)}
                      className={`py-3 px-3 rounded-lg border font-semibold text-xs transition-all shadow-sm flex flex-col items-start justify-center select-none active:scale-95 relative overflow-hidden ${renderizarCorBotao(statusAtual)}`}
                    >
                      <div className="flex justify-between items-center w-full mb-0.5">
                        <span className="text-sm font-bold tracking-tight">{unid.nome}</span>
                        {temFoto && statusAtual === 'concluido' && (
                          <span title="Comprovante salvo" className="bg-emerald-950/40 p-1 rounded-full text-emerald-200">
                            <Camera className="w-3 h-3 inline" />
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] uppercase tracking-wider opacity-90 block">
                        {renderizarIconeStatus(statusAtual)}
                        {statusAtual.replace('_', ' ')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* MODAL OBRIGATÓRIO DE CAPTURA DE PROVA */}
      {unidadeParaFoto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2 text-amber-500 font-bold">
                <Camera className="w-5 h-5" />
                <span>Prova Material Obrigatória</span>
              </div>
              <button 
                onClick={() => !uploadingFoto && setUnidadeParaFoto(null)}
                className="text-slate-500 hover:text-white p-1"
                disabled={uploadingFoto}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              Para validar a conclusão de <strong className="text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">{unidadeParaFoto.nome}</strong>, anexe uma foto nítida do serviço executado.
            </p>

            {/* Input invisivel que força a abertura nativa da câmera em celulares */}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={uploadFotoComprovante}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFoto}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              {uploadingFoto ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Enviando para a nuvem...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-5 h-5" />
                  <span>Abrir Cãmera do Celular</span>
                </>
              )}
            </button>
            
            <p className="text-[10px] text-slate-500 text-center mt-4">
              * A imagem será carimbada com data/hora no servidor Nexus.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}