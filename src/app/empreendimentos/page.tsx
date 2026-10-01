'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Building,
  Plus,
  Search,
  MapPin,
  Calendar,
  Layers,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  ArrowRight,
  HardHat
} from 'lucide-react';

const LocationPickerModal = dynamic(() => import('@/components/LocationPickerModal'), { ssr: false });

const STAGES = ['Todos', 'Lançamento', 'Na planta', 'Em construção', 'Próximo da entrega'];

export default function EmpreendimentosPage() {
  const [developments, setDevelopments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [locationModalItem, setLocationModalItem] = useState<any | null>(null);

  useEffect(() => {
    async function fetchDevelopments() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (search) queryParams.set('search', search);
        if (stageFilter !== 'Todos') queryParams.set('stage', stageFilter);
        if (statusFilter !== 'Todos') queryParams.set('status', statusFilter);

        const res = await fetch(`/api/developments?${queryParams.toString()}`);
        const data = await res.json();
        if (res.ok) {
          setDevelopments(data.developments || []);
        }
      } catch (err) {
        console.error('Falha ao buscar empreendimentos:', err);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(fetchDevelopments, 250);
    return () => clearTimeout(timer);
  }, [search, stageFilter, statusFilter]);

  async function handleConfirmLocation(loc: { lat: number; lng: number; address: string; neighborhood?: string; city?: string }) {
    if (!locationModalItem) return;
    try {
      const res = await fetch(`/api/developments/${locationModalItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: loc.lat,
          longitude: loc.lng,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDevelopments((prev) =>
          prev.map((d) =>
            d.id === locationModalItem.id
              ? { ...d, latitude: loc.lat, longitude: loc.lng }
              : d
          )
        );
        setLocationModalItem(null);
      } else {
        alert(data.error || 'Falha ao salvar localização do empreendimento.');
      }
    } catch (err) {
      console.error('Erro ao atualizar coordenadas:', err);
      alert('Erro ao atualizar coordenadas do empreendimento.');
    }
  }

  async function handleToggleStatus(id: string, currentStatus: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const newStatus = currentStatus === 'Ativo' ? 'Inativo' : 'Ativo';
    try {
      const res = await fetch(`/api/developments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        setDevelopments((prev) =>
          prev.map((d) => (d.id === id ? { ...d, status: data.development.status } : d))
        );
      }
    } catch (err) {
      console.error('Erro ao alternar status do empreendimento:', err);
    }
  }

  function getStageBadgeClass(stage: string) {
    switch (stage) {
      case 'Lançamento':
        return 'badge-stage-lancamento';
      case 'Na planta':
        return 'badge-stage-planta';
      case 'Em construção':
        return 'badge-stage-construcao';
      case 'Próximo da entrega':
        return 'badge-stage-entrega';
      default:
        return 'badge-neutral';
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Topo / Título */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Carteira de Lançamentos
            </span>
            <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
              Construtoras
            </span>
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Imóveis em construção
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Gerencie e organize os empreendimentos das construtoras com as quais você trabalha.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/empreendimentos/novo" className="btn-primary">
            <Plus size={16} strokeWidth={2.6} />
            <span>Novo empreendimento</span>
          </Link>
        </div>
      </div>

      {/* Barra de Pesquisa e Filtros */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por nome, construtora, bairro, cidade..."
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

        {/* Filtros por Estágio da Obra */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {STAGES.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStageFilter(st)}
                className={stageFilter === st ? 'btn-primary' : 'btn-secondary'}
                style={{
                  padding: '6px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-full)',
                  flexShrink: 0,
                }}
              >
                {st}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status:</span>
            {['Todos', 'Ativo', 'Inativo'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-full)',
                  border: statusFilter === st ? '1px solid var(--color-primary)' : '1px solid var(--border-light)',
                  backgroundColor: statusFilter === st ? 'var(--color-primary-light)' : 'transparent',
                  color: statusFilter === st ? 'var(--color-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Listagem de Cards de Empreendimentos */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          Carregando empreendimentos cadastrados...
        </div>
      ) : developments.length === 0 ? (
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
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
            }}
          >
            <Building size={24} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
            {search || stageFilter !== 'Todos' || statusFilter !== 'Todos'
              ? 'Nenhum empreendimento encontrado com os filtros aplicados'
              : 'Cadastre seus empreendimentos para cruzar tipologias com as demandas de clientes.'}
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto 20px auto' }}>
            {search || stageFilter !== 'Todos' || statusFilter !== 'Todos'
              ? 'Tente ajustar os termos de pesquisa ou selecionar outro estágio da obra.'
              : 'Organize os lançamentos das construtoras e permita que suas unidades participem automaticamente do matching no território.'}
          </p>
          <Link href="/empreendimentos/novo" className="btn-primary">
            <Plus size={16} strokeWidth={2.6} />
            <span>Cadastrar primeiro empreendimento</span>
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px',
          }}
        >
          {developments.map((d) => {
            const coverImage = d.images?.[0]?.url || null;
            const typologies = d.typologies || [];
            const minPrice = typologies.length > 0 ? Math.min(...typologies.map((t: any) => t.price).filter((p: number) => p > 0)) : null;

            // Metragens e dormitórios min/max
            const bedroomsList = typologies.map((t: any) => t.bedrooms).filter((b: number) => b > 0);
            const areasList = typologies.map((t: any) => t.privateArea).filter((a: number) => a > 0);

            const minBed = bedroomsList.length > 0 ? Math.min(...bedroomsList) : null;
            const maxBed = bedroomsList.length > 0 ? Math.max(...bedroomsList) : null;
            const bedLabel = minBed && maxBed ? (minBed === maxBed ? `${minBed} dorms` : `${minBed} a ${maxBed} dorms`) : null;

            const minArea = areasList.length > 0 ? Math.min(...areasList) : null;
            const maxArea = areasList.length > 0 ? Math.max(...areasList) : null;
            const areaLabel = minArea && maxArea ? (minArea === maxArea ? `${minArea} m²` : `${minArea} a ${maxArea} m²`) : null;

            return (
              <div
                key={d.id}
                className="card"
                style={{
                  padding: '0',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  opacity: d.status === 'Inativo' ? 0.75 : 1,
                  transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
                }}
              >
                {/* Imagem do Empreendimento */}
                <Link
                  href={`/empreendimentos/${d.id}`}
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '190px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#F3F4F6',
                    overflow: 'hidden',
                  }}
                >
                  {coverImage ? (
                    <img
                      src={coverImage}
                      alt={d.name}
                      style={{ maxWidth: '100%', maxHeight: '100%', width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)' }}>
                      <ImageIcon size={32} />
                    </div>
                  )}

                  {/* Badge de Estágio da Obra */}
                  <span
                    className={`badge ${getStageBadgeClass(d.stage)}`}
                    style={{ position: 'absolute', top: '10px', left: '10px', backdropFilter: 'blur(4px)' }}
                  >
                    {d.stage}
                  </span>

                  {/* Badge de Status */}
                  <span
                    className={`badge ${d.status === 'Ativo' ? 'badge-success' : 'badge-neutral'}`}
                    style={{ position: 'absolute', top: '10px', right: '10px', backdropFilter: 'blur(4px)' }}
                  >
                    {d.status}
                  </span>

                  {/* Badge de Localização / Território */}
                  <span
                    className={`badge ${d.latitude && d.longitude ? 'badge-success' : 'badge-warning'}`}
                    style={{
                      position: 'absolute',
                      bottom: '10px',
                      left: '10px',
                      backdropFilter: 'blur(6px)',
                      fontSize: '0.68rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      backgroundColor: d.latitude && d.longitude ? undefined : 'rgba(254, 243, 199, 0.95)',
                      color: d.latitude && d.longitude ? undefined : '#B45309',
                      border: d.latitude && d.longitude ? undefined : '1px solid #FDE68A',
                    }}
                  >
                    <MapPin size={10} />
                    {d.latitude && d.longitude ? 'No mapa' : 'Sem coordenadas'}
                  </span>
                </Link>

                {/* Conteúdo do Card */}
                <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                  <div>
                    <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Construtora: {d.developer}
                    </div>

                    <Link href={`/empreendimentos/${d.id}`}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3, marginTop: '2px' }}>
                        {d.name}
                      </h3>
                    </Link>

                    <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                      <MapPin size={14} color="var(--color-primary)" />
                      {d.neighborhood ? `${d.neighborhood}, ` : ''}{d.city || ''} {d.state ? `- ${d.state}` : ''}
                    </p>
                  </div>

                  {/* Previsão de Entrega & Resumo de Tipologias */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.82rem',
                      color: 'var(--text-secondary)',
                      padding: '8px 0',
                      borderTop: '1px solid var(--border-subtle)',
                      borderBottom: '1px solid var(--border-subtle)',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Calendar size={14} color="var(--color-primary)" />
                      {d.deliveryDate ? `Entrega: ${d.deliveryDate}` : 'Previsão a confirmar'}
                    </span>

                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                      <Layers size={14} color="var(--color-primary)" />
                      {typologies.length} tipologia(s)
                    </span>
                  </div>

                  {/* Resumo de Configurações das Plantas */}
                  {(bedLabel || areaLabel) && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {[bedLabel, areaLabel].filter(Boolean).join(' • ')}
                    </div>
                  )}

                  {/* Preço a partir de & Botões */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '6px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                        A partir de
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                        {minPrice && minPrice > 0 ? `R$ ${minPrice.toLocaleString('pt-BR')}` : 'Consulte'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setLocationModalItem(d)}
                        className="btn-secondary"
                        style={{ padding: '6px 8px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title={d.latitude && d.longitude ? 'Ajustar posição no mapa' : 'Localizar empreendimento no mapa com GeoBase'}
                      >
                        <MapPin size={12} color="var(--color-primary)" />
                        <span>{d.latitude && d.longitude ? 'Ajustar pino' : 'Localizar'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleToggleStatus(d.id, d.status, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.76rem',
                          color: d.status === 'Ativo' ? 'var(--text-muted)' : 'var(--color-success)',
                          textDecoration: 'underline',
                          padding: '4px',
                        }}
                      >
                        {d.status === 'Ativo' ? 'Desativar' : 'Reativar'}
                      </button>

                      <Link
                        href={`/empreendimentos/${d.id}`}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                      >
                        <span>Ver</span>
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Interativo de Geocodificação e Ajuste no Mapa */}
      {locationModalItem && (
        <LocationPickerModal
          isOpen={Boolean(locationModalItem)}
          onClose={() => setLocationModalItem(null)}
          initialAddress={[
            locationModalItem.address,
            locationModalItem.number,
            locationModalItem.neighborhood,
            locationModalItem.city,
            locationModalItem.state || 'SC',
          ].filter(Boolean).join(', ')}
          initialLat={locationModalItem.latitude || undefined}
          initialLng={locationModalItem.longitude || undefined}
          onConfirmLocation={handleConfirmLocation}
        />
      )}
    </div>
  );
}
