'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  ShieldAlert,
  MapPin,
  Layers,
  Camera,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Building,
  RefreshCw,
  Loader2,
  ChevronRight,
  ExternalLink,
  History,
  Scale,
  FileText,
  Eye,
  Check,
  ArrowRight,
} from 'lucide-react';
import { ModerationQueueItem, ModerationSummary, ModerationItemType } from '@/lib/building-moderation-service';

// Importação dinâmica dos modais com mapa para evitar problemas de SSR com Leaflet
const LocationModerationModal = dynamic(() => import('./LocationModerationModal'), { ssr: false });
const BoundaryModerationModal = dynamic(() => import('./BoundaryModerationModal'), { ssr: false });
const FacadeModerationModal = dynamic(() => import('./FacadeModerationModal'), { ssr: false });

export default function ModerationManager() {
  const [summary, setSummary] = useState<ModerationSummary | null>(null);
  const [items, setItems] = useState<ModerationQueueItem[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros
  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
  const [typeFilter, setTypeFilter] = useState<'ALL' | ModerationItemType>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Modais de Análise
  const [selectedItem, setSelectedItem] = useState<ModerationQueueItem | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    loadQueue();
  }, [activeTab, typeFilter, statusFilter, cityFilter, page]);

  // Carrega métricas e indicadores reais da API
  async function loadSummary() {
    setLoadingSummary(true);
    try {
      const res = await fetch('/api/admin/moderation/summary');
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Falha ao carregar resumo da moderação:', err);
    } finally {
      setLoadingSummary(false);
    }
  }

  // Carrega a fila ou histórico com paginação e filtros
  async function loadQueue(forcedSearch?: string) {
    setLoadingQueue(true);
    try {
      const search = forcedSearch !== undefined ? forcedSearch : searchQuery;
      const endpoint = activeTab === 'queue' ? '/api/admin/moderation/queue' : '/api/admin/moderation/history';
      const effectiveStatus = activeTab === 'history' && statusFilter === 'PENDING' ? 'ALL' : statusFilter;

      const params = new URLSearchParams({
        type: typeFilter,
        status: effectiveStatus,
        limit: '25',
        page: page.toString(),
      });

      if (cityFilter && cityFilter !== 'all') {
        params.append('city', cityFilter);
      }
      if (search && search.trim()) {
        params.append('search', search.trim());
      }

      const res = await fetch(`${endpoint}?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error('Falha ao consultar fila de moderação:', err);
      setItems([]);
    } finally {
      setLoadingQueue(false);
      setRefreshing(false);
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadQueue();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadSummary(), loadQueue()]);
  };

  // Processa decisão administrativa disparando a API especializada
  const handleDecide = async (
    decision: 'APPROVE' | 'REJECT' | 'MANUAL_OVERRIDE',
    notes: string,
    manualCoords?: { latitude: number; longitude: number }
  ) => {
    if (!selectedItem) return;

    let url = '';
    let body: any = { decision, notes };

    if (selectedItem.type === 'LOCATION') {
      url = `/api/admin/buildings/contributions/${selectedItem.id}`;
      if (decision === 'MANUAL_OVERRIDE' && manualCoords) {
        body.manualCoordinates = manualCoords;
      }
    } else if (selectedItem.type === 'BOUNDARY') {
      url = `/api/admin/buildings/boundary-contributions/${selectedItem.id}`;
    } else if (selectedItem.type === 'FACADE') {
      url = `/api/admin/buildings/facade-contributions/${selectedItem.id}`;
    }

    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao aplicar decisão administrativa.');
    }

    setFeedback({
      type: 'success',
      text: data.message || 'Decisão administrativa registrada e aplicada com sucesso.',
    });
    setTimeout(() => setFeedback(null), 5000);

    // Atualiza contadores e fila em tempo real
    await Promise.all([loadSummary(), loadQueue()]);
  };

  return (
    <div style={{ padding: '24px 20px', maxWidth: '1240px', margin: '0 auto' }}>
      {/* Cabeçalho da Central */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: '#1E4620',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(30, 70, 32, 0.25)',
            }}
          >
            <ShieldAlert size={26} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
              Central de Moderação Administrativa
            </h1>
            <p style={{ fontSize: '0.84rem', color: '#6B7280', margin: '3px 0 0 0' }}>
              Validação, governança e resolução de divergências no Cadastro Mestre de Edifícios
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 16px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #D1D5DB',
            borderRadius: '10px',
            fontSize: '0.84rem',
            fontWeight: 700,
            color: '#374151',
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Atualizar Dados
        </button>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '20px',
            backgroundColor: feedback.type === 'success' ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${feedback.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
            color: feedback.type === 'success' ? '#166534' : '#991B1B',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          {feedback.text}
        </div>
      )}

      {/* Cards de Métricas em Tempo Real */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        {/* Total Pendências */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '16px 18px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            borderLeft: '4px solid #D97706',
          }}
        >
          <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#6B7280', textTransform: 'uppercase' }}>
            Fila de Pendências
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#111827', marginTop: '4px' }}>
            {loadingSummary ? '—' : summary?.totalPending ?? 0}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#B45309', marginTop: '4px', fontWeight: 600 }}>
            Aguardando análise da equipe
          </div>
        </div>

        {/* Localizações */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '16px 18px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            borderLeft: '4px solid #2563EB',
          }}
        >
          <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#6B7280', textTransform: 'uppercase' }}>
            Localizações
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#111827', marginTop: '4px' }}>
            {loadingSummary ? '—' : summary?.locationPending ?? 0}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#1D4ED8', marginTop: '4px', fontWeight: 600 }}>
            Propostas de pin no mapa
          </div>
        </div>

        {/* Terrenos */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '16px 18px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            borderLeft: '4px solid #1E4620',
          }}
        >
          <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#6B7280', textTransform: 'uppercase' }}>
            Terrenos Coletivos
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#111827', marginTop: '4px' }}>
            {loadingSummary ? '—' : summary?.boundaryPending ?? 0}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#166534', marginTop: '4px', fontWeight: 600 }}>
            Delimitações e revisões
          </div>
        </div>

        {/* Fachadas */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '16px 18px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            borderLeft: '4px solid #7C3AED',
          }}
        >
          <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#6B7280', textTransform: 'uppercase' }}>
            Fotografias Fachada
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#111827', marginTop: '4px' }}>
            {loadingSummary ? '—' : summary?.facadePending ?? 0}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#6D28D9', marginTop: '4px', fontWeight: 600 }}>
            Substituições de imagem
          </div>
        </div>

        {/* Divergências Ativas */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '16px 18px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            borderLeft: '4px solid #DC2626',
          }}
        >
          <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#6B7280', textTransform: 'uppercase' }}>
            Divergências Ativas
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#DC2626', marginTop: '4px' }}>
            {loadingSummary ? '—' : summary?.divergentBuildingsCount ?? 0}
          </div>
          <div style={{ fontSize: '0.74rem', color: '#991B1B', marginTop: '4px', fontWeight: 600 }}>
            Condomínios em conflito
          </div>
        </div>
      </div>

      {/* Navegação entre Fila Ativa e Histórico */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid #E5E7EB',
          marginBottom: '20px',
        }}
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab('queue');
            setStatusFilter('PENDING');
            setPage(1);
          }}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'queue' ? '3px solid #1E4620' : '3px solid transparent',
            color: activeTab === 'queue' ? '#1E4620' : '#6B7280',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            marginBottom: '-2px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Clock size={16} /> Fila de Moderação ({summary?.totalPending ?? 0})
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('history');
            setStatusFilter('ALL');
            setPage(1);
          }}
          style={{
            padding: '10px 18px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'history' ? '3px solid #1E4620' : '3px solid transparent',
            color: activeTab === 'history' ? '#1E4620' : '#6B7280',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            marginBottom: '-2px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <History size={16} /> Histórico de Decisões Auditadas
        </button>
      </div>

      {/* Barra de Filtros e Busca */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid #E5E7EB',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          {/* Filtro por Tipo */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as any);
              setPage(1);
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '0.84rem',
              fontWeight: 600,
              color: '#374151',
              backgroundColor: '#FFFFFF',
            }}
          >
            <option value="ALL">Todos os Tipos</option>
            <option value="LOCATION">📍 Localização</option>
            <option value="BOUNDARY">📐 Terreno Coletivo</option>
            <option value="FACADE">🏢 Fotografia de Fachada</option>
          </select>

          {/* Filtro por Situação */}
          {activeTab === 'queue' ? (
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '0.84rem',
                fontWeight: 600,
                color: '#374151',
                backgroundColor: '#FFFFFF',
              }}
            >
              <option value="PENDING">Pendentes e Divergentes</option>
              <option value="FLAGGED_DIVERGENT">Apenas Divergentes</option>
              <option value="ALL">Todas as Situações</option>
            </select>
          ) : (
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '0.84rem',
                fontWeight: 600,
                color: '#374151',
                backgroundColor: '#FFFFFF',
              }}
            >
              <option value="ALL">Todos os Resultados</option>
              <option value="ACCEPTED">Aprovados (ACCEPTED)</option>
              <option value="REJECTED">Rejeitados (REJECTED)</option>
              <option value="SUPERSEDED">Sobrescritos (SUPERSEDED)</option>
            </select>
          )}

          {/* Filtro por Cidade */}
          <select
            value={cityFilter}
            onChange={(e) => {
              setCityFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '0.84rem',
              fontWeight: 600,
              color: '#374151',
              backgroundColor: '#FFFFFF',
            }}
          >
            <option value="all">Todas as Cidades</option>
            <option value="Criciúma">Criciúma</option>
            <option value="Içara">Içara</option>
            <option value="Nova Veneza">Nova Veneza</option>
          </select>
        </div>

        {/* Busca Textual */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }}
            />
            <input
              type="text"
              placeholder="Buscar edifício, bairro ou rua..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '0.84rem',
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '8px 14px',
              backgroundColor: '#1E4620',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Buscar
          </button>
        </form>
      </div>

      {/* Listagem da Fila de Moderação */}
      {loadingQueue ? (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '60px 20px',
            textAlign: 'center',
            border: '1px solid #E5E7EB',
          }}
        >
          <Loader2 size={32} className="animate-spin" style={{ color: '#1E4620', margin: '0 auto 12px auto' }} />
          <div style={{ fontSize: '0.90rem', color: '#6B7280', fontWeight: 600 }}>Carregando dados da moderação...</div>
        </div>
      ) : items.length === 0 ? (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '60px 20px',
            textAlign: 'center',
            border: '1px solid #E5E7EB',
          }}
        >
          <CheckCircle2 size={44} style={{ color: '#1E4620', margin: '0 auto 12px auto' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', margin: '0 0 6px 0' }}>
            {activeTab === 'queue' ? 'Fila limpa! Nenhuma pendência encontrada.' : 'Nenhum registro histórico encontrado.'}
          </h3>
          <p style={{ fontSize: '0.84rem', color: '#6B7280', margin: 0 }}>
            {activeTab === 'queue'
              ? 'Todas as propostas colaborativas enviadas pelos corretores foram analisadas e decididas.'
              : 'Nenhuma decisão anterior corresponde aos filtros aplicados.'}
          </p>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E5E7EB',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', color: '#6B7280', fontWeight: 700 }}>
                  <th style={{ padding: '12px 16px' }}>TIPO</th>
                  <th style={{ padding: '12px 16px' }}>EDIFÍCIO</th>
                  <th style={{ padding: '12px 16px' }}>CORRETOR AUTOR</th>
                  <th style={{ padding: '12px 16px' }}>DATA</th>
                  <th style={{ padding: '12px 16px' }}>SITUAÇÃO</th>
                  {activeTab === 'history' && <th style={{ padding: '12px 16px' }}>DECIDIDO POR</th>}
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>AÇÃO</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const isPending = it.status === 'PENDING';
                  const isDivergent = it.status === 'FLAGGED_DIVERGENT';
                  const isAccepted = it.status === 'ACCEPTED';
                  const isRejected = it.status === 'REJECTED';

                  return (
                    <tr
                      key={it.id}
                      style={{
                        borderBottom: '1px solid #F3F4F6',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {/* Tipo com Badge */}
                      <td style={{ padding: '14px 16px' }}>
                        {it.type === 'LOCATION' && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#EFF6FF',
                              color: '#1D4ED8',
                              fontWeight: 700,
                              fontSize: '0.74rem',
                            }}
                          >
                            <MapPin size={12} /> Localização
                          </span>
                        )}
                        {it.type === 'BOUNDARY' && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#F0FDF4',
                              color: '#166534',
                              fontWeight: 700,
                              fontSize: '0.74rem',
                            }}
                          >
                            <Layers size={12} /> Terreno
                          </span>
                        )}
                        {it.type === 'FACADE' && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#F5F3FF',
                              color: '#6D28D9',
                              fontWeight: 700,
                              fontSize: '0.74rem',
                            }}
                          >
                            <Camera size={12} /> Fachada
                          </span>
                        )}
                      </td>

                      {/* Nome do Edifício e Localização */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 800, color: '#111827' }}>{it.building.name}</div>
                        <div style={{ fontSize: '0.76rem', color: '#6B7280', marginTop: '2px' }}>
                          {it.building.neighborhood}, {it.building.city}
                        </div>
                      </td>

                      {/* Corretor Responsável */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#1F2937' }}>{it.broker.name}</div>
                        <div style={{ fontSize: '0.74rem', color: '#6B7280' }}>
                          {it.broker.commercialName || it.broker.email}
                        </div>
                      </td>

                      {/* Data de Envio */}
                      <td style={{ padding: '14px 16px', color: '#4B5563', whiteSpace: 'nowrap' }}>
                        {new Date(it.createdAt).toLocaleDateString('pt-BR')}
                      </td>

                      {/* Situação */}
                      <td style={{ padding: '14px 16px' }}>
                        {isPending && (
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#FEF3C7',
                              color: '#92400E',
                              fontWeight: 700,
                              fontSize: '0.74rem',
                            }}
                          >
                            Pendente
                          </span>
                        )}
                        {isDivergent && (
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#FEE2E2',
                              color: '#991B1B',
                              fontWeight: 800,
                              fontSize: '0.74rem',
                            }}
                          >
                            Divergente
                          </span>
                        )}
                        {isAccepted && (
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#DCFCE7',
                              color: '#166534',
                              fontWeight: 700,
                              fontSize: '0.74rem',
                            }}
                          >
                            Aprovado
                          </span>
                        )}
                        {isRejected && (
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#F3F4F6',
                              color: '#6B7280',
                              fontWeight: 700,
                              fontSize: '0.74rem',
                            }}
                          >
                            Rejeitado
                          </span>
                        )}
                        {it.status === 'SUPERSEDED' && (
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#F3F4F6',
                              color: '#9CA3AF',
                              fontWeight: 600,
                              fontSize: '0.74rem',
                            }}
                          >
                            Sobrescrito
                          </span>
                        )}
                      </td>

                      {/* Decidido Por (quando na aba Histórico) */}
                      {activeTab === 'history' && (
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#1F2937' }}>
                            {it.decidedBy?.name || 'Administrador'}
                          </div>
                          {it.decidedAt && (
                            <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                              {new Date(it.decidedAt).toLocaleString('pt-BR')}
                            </div>
                          )}
                        </td>
                      )}

                      {/* Ação */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedItem(it)}
                          style={{
                            padding: '6px 14px',
                            backgroundColor: isPending || isDivergent ? '#1E4620' : '#FFFFFF',
                            color: isPending || isDivergent ? '#FFFFFF' : '#1E4620',
                            border: '1px solid #1E4620',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.80rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {isPending || isDivergent ? (
                            <>
                              Analisar <ArrowRight size={14} />
                            </>
                          ) : (
                            <>
                              <Eye size={14} /> Ver Detalhes
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div
              style={{
                padding: '14px 18px',
                borderTop: '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#F9FAFB',
                fontSize: '0.82rem',
              }}
            >
              <div style={{ color: '#6B7280' }}>
                Exibindo página <strong>{page}</strong> de <strong>{totalPages}</strong> ({totalCount} itens)
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: page <= 1 ? '#9CA3AF' : '#374151',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: page >= totalPages ? '#9CA3AF' : '#374151',
                    cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Renderização do Modal Especializado por Tipo */}
      {selectedItem && selectedItem.type === 'LOCATION' && (
        <LocationModerationModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onDecide={handleDecide}
        />
      )}

      {selectedItem && selectedItem.type === 'BOUNDARY' && (
        <BoundaryModerationModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onDecide={handleDecide}
        />
      )}

      {selectedItem && selectedItem.type === 'FACADE' && (
        <FacadeModerationModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onDecide={handleDecide}
        />
      )}
    </div>
  );
}
