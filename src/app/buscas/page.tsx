'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  User,
  Phone,
  Building2,
  MapPin,
  Zap,
  ArrowRight,
  Bell,
  MessageCircle
} from 'lucide-react';

export default function BuscasPage() {
  const [searches, setSearches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('Todos');

  useEffect(() => {
    async function fetchSearches() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (searchQuery) queryParams.set('search', searchQuery);

        const res = await fetch(`/api/searches?${queryParams.toString()}`);
        const data = await res.json();
        if (res.ok) {
          setSearches(data.searches || []);
        }
      } catch (err) {
        console.error('Falha ao buscar demandas:', err);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(fetchSearches, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function handleToggleActive(id: string, currentActive: boolean, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(`/api/searches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      });
      const data = await res.json();
      if (res.ok) {
        setSearches((prev) =>
          prev.map((s) => (s.id === id ? { ...s, active: data.search.active } : s))
        );
      }
    } catch (err) {
      console.error('Erro ao alternar status da busca:', err);
    }
  }

  // Filtragem local por tipo de imóvel
  const filteredSearches = searches.filter((s) => {
    if (typeFilter === 'Todos') return true;
    try {
      const types: string[] = typeof s.propertyTypes === 'string' ? JSON.parse(s.propertyTypes) : s.propertyTypes;
      return types.includes(typeFilter);
    } catch {
      return true;
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Buscas salvas
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Gerencie as buscas dos seus clientes e monitore oportunidades compatíveis.
          </p>
        </div>

        <Link href="/buscas/nova" className="btn-primary">
          <Plus size={16} strokeWidth={2.6} />
          <span>Adicionar busca</span>
        </Link>
      </div>

      {/* Busca e Filtros Rápidos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por nome do cliente, bairro, cidade..."
            style={{
              width: '100%',
              padding: '12px 16px 12px 42px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              backgroundColor: 'var(--bg-surface)',
              fontSize: '0.94rem',
              boxShadow: 'var(--shadow-xs)',
              outline: 'none',
            }}
          />
          <Search
            size={18}
            color="#9CA3AF"
            style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
          />
        </div>

        {/* Type Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {['Todos', 'Apartamento', 'Casa', 'Terreno', 'Comercial'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={typeFilter === t ? 'btn-primary' : 'btn-secondary'}
              style={{
                padding: '6px 14px',
                fontSize: '0.82rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-full)',
                flexShrink: 0,
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Listagem de Buscas */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          Carregando buscas de clientes...
        </div>
      ) : filteredSearches.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '50px 20px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              backgroundColor: '#EEF2FF',
              color: '#4338CA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
            }}
          >
            <Search size={24} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
            {searchQuery || typeFilter !== 'Todos'
              ? 'Nenhuma busca encontrada com os filtros aplicados'
              : 'Registre o que seus clientes estão procurando para encontrar oportunidades na sua carteira.'}
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 20px auto' }}>
            {searchQuery || typeFilter !== 'Todos'
              ? 'Tente alterar os termos da pesquisa ou o tipo de imóvel selecionado.'
              : 'Ao registrar os critérios desejados por cada cliente, o sistema cruza imediatamente com seus imóveis e tipologias.'}
          </p>
          <Link href="/buscas/nova" className="btn-primary">
            <Plus size={16} strokeWidth={2.6} />
            <span>Cadastrar primeira busca</span>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredSearches.map((s) => {
            const types: string[] = typeof s.propertyTypes === 'string' ? JSON.parse(s.propertyTypes) : s.propertyTypes || [];
            const neighborhoods: string[] = typeof s.neighborhoods === 'string' ? JSON.parse(s.neighborhoods) : s.neighborhoods || [];
            const cities: string[] = typeof s.cities === 'string' ? JSON.parse(s.cities) : s.cities || [];
            const matchCount = s._count?.matches || 0;

            return (
              <Link
                key={s.id}
                href={`/buscas/${s.id}`}
                className="card"
                style={{
                  padding: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                  flexWrap: 'wrap',
                  cursor: 'pointer',
                  borderLeft: s.active ? '4px solid var(--color-primary)' : '4px solid var(--border-light)',
                }}
              >
                {/* Dados da Busca e Cliente */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1, minWidth: '260px' }}>
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-primary-light)',
                      color: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.96rem',
                      flexShrink: 0,
                    }}
                  >
                    {s.client.name.slice(0, 2).toUpperCase()}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        {s.client.name}
                      </span>
                      {s.client.phone && (
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {s.client.phone}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                      {types.join(', ')} • {s.purpose}
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={13} color="var(--color-primary)" />
                      {neighborhoods.length > 0 ? neighborhoods.join(', ') : cities.join(', ') || 'Localização aberta'}
                    </div>

                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {s.minPrice ? `R$ ${s.minPrice.toLocaleString('pt-BR')} até ` : 'Até '}
                      R$ {s.maxPrice.toLocaleString('pt-BR')}
                      {s.minBedrooms > 0 && ` • mín. ${s.minBedrooms} qtos`}
                      {s.minArea && ` • mín. ${s.minArea} m²`}
                    </div>
                  </div>
                </div>

                {/* Status e Ação */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <button
                    type="button"
                    onClick={(e) => handleToggleActive(s.id, s.active, e)}
                    className={s.active ? 'badge badge-success' : 'badge badge-neutral'}
                    style={{
                      border: 'none',
                      cursor: 'pointer',
                      padding: '6px 12px',
                      fontSize: '0.78rem',
                    }}
                  >
                    {s.active ? 'Alerta Ativo' : 'Pausado'}
                  </button>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-primary)' }}>
                      <Zap size={15} />
                      <span>{matchCount} matches</span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      Imóveis compatíveis
                    </div>
                  </div>

                  <ArrowRight size={18} color="#9CA3AF" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
