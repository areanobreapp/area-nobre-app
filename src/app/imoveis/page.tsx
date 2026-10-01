'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Bed,
  Bath,
  Maximize2,
  Zap,
  MoreVertical,
  Filter,
  Car,
  Image as ImageIcon
} from 'lucide-react';

const LocationPickerModal = dynamic(() => import('@/components/LocationPickerModal'), { ssr: false });

export default function ImoveisPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [locationModalItem, setLocationModalItem] = useState<any | null>(null);

  useEffect(() => {
    async function fetchProperties() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (search) queryParams.set('search', search);
        if (statusFilter !== 'Todos') queryParams.set('status', statusFilter);

        const res = await fetch(`/api/properties?${queryParams.toString()}`);
        const data = await res.json();
        if (res.ok) {
          setProperties(data.properties || []);
        }
      } catch (err) {
        console.error('Falha ao buscar imóveis:', err);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(fetchProperties, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  async function handleConfirmLocation(loc: { lat: number; lng: number; address: string; neighborhood?: string; city?: string }) {
    if (!locationModalItem) return;
    try {
      const res = await fetch(`/api/properties/${locationModalItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: loc.lat,
          longitude: loc.lng,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setProperties((prev) =>
          prev.map((p) =>
            p.id === locationModalItem.id
              ? { ...p, latitude: loc.lat, longitude: loc.lng }
              : p
          )
        );
        setLocationModalItem(null);
      } else {
        alert(data.error || 'Falha ao salvar localização.');
      }
    } catch (err) {
      console.error('Erro ao atualizar coordenadas:', err);
      alert('Erro ao atualizar coordenadas do imóvel.');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Topo / Título */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Imóveis cadastrados
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Gerencie e acompanhe todos os imóveis da sua carteira.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/mapa" className="btn-secondary">
            <MapPin size={16} />
            <span>Ver no mapa</span>
          </Link>
          <Link href="/imoveis/novo" className="btn-primary">
            <Plus size={16} strokeWidth={2.6} />
            <span>Adicionar imóvel</span>
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
            placeholder="Pesquisar por título, código, endereço, bairro..."
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

        {/* Status Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {['Todos', 'Disponível', 'Reservado', 'Vendido/Alugado', 'Inativo'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={statusFilter === st ? 'btn-primary' : 'btn-secondary'}
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
      </div>

      {/* Listagem de Cards de Imóveis */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          Carregando carteira de imóveis...
        </div>
      ) : properties.length === 0 ? (
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
            <Building2 size={24} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
            {search || statusFilter !== 'Todos'
              ? 'Nenhum imóvel encontrado com os filtros aplicados'
              : 'Cadastre seu primeiro imóvel para começar a organizar sua carteira.'}
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 20px auto' }}>
            {search || statusFilter !== 'Todos'
              ? 'Tente ajustar os termos de pesquisa ou selecionar outro filtro.'
              : 'Ao cadastrar imóveis, eles ficam visíveis no mapa e prontos para matching com as buscas de seus clientes.'}
          </p>
          <Link href="/imoveis/novo" className="btn-primary">
            <Plus size={16} strokeWidth={2.6} />
            <span>Cadastrar primeiro imóvel</span>
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
          {properties.map((p) => {
            const coverImage = p.images?.[0]?.url || null;
            const matchCount = p._count?.matches || 0;

            return (
              <div
                key={p.id}
                className="card"
                style={{
                  padding: '0',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
                }}
              >
                {/* Imagem do Imóvel */}
                <Link href={`/imoveis/${p.id}`} style={{ position: 'relative', width: '100%', height: '190px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6', overflow: 'hidden' }}>
                  {coverImage ? (
                    <img
                      src={coverImage}
                      alt={p.title}
                      style={{ maxWidth: '100%', maxHeight: '100%', width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)' }}>
                      <ImageIcon size={32} />
                    </div>
                  )}

                  {/* Badge de Status Sobreposto */}
                  <span
                    className={`badge ${p.status === 'Disponível' ? 'badge-success' : 'badge-neutral'}`}
                    style={{ position: 'absolute', bottom: '10px', left: '10px', backdropFilter: 'blur(4px)' }}
                  >
                    {p.status}
                  </span>

                  <span
                    className="badge badge-primary"
                    style={{ position: 'absolute', top: '10px', left: '10px' }}
                  >
                    {p.propertyType}
                  </span>

                  {/* Badge de Localização / Território */}
                  <span
                    className={`badge ${p.latitude && p.longitude ? 'badge-success' : 'badge-warning'}`}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      backdropFilter: 'blur(6px)',
                      fontSize: '0.68rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      backgroundColor: p.latitude && p.longitude ? undefined : 'rgba(254, 243, 199, 0.95)',
                      color: p.latitude && p.longitude ? undefined : '#B45309',
                      border: p.latitude && p.longitude ? undefined : '1px solid #FDE68A',
                    }}
                  >
                    <MapPin size={10} />
                    {p.latitude && p.longitude ? 'No mapa' : 'Sem coordenadas'}
                  </span>
                </Link>

                {/* Conteúdo do Card */}
                <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Link href={`/imoveis/${p.id}`}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                          {p.title}
                        </h3>
                      </Link>
                      {p.internalCode && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          #{p.internalCode}
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                      <MapPin size={14} color="var(--color-primary)" />
                      {p.neighborhood ? `${p.neighborhood}, ` : ''}{p.city || ''}
                    </p>
                  </div>

                  {/* Características */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '0.82rem',
                      color: 'var(--text-secondary)',
                      padding: '8px 0',
                      borderTop: '1px solid var(--border-subtle)',
                      borderBottom: '1px solid var(--border-subtle)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Bed size={14} /> {p.bedrooms} qtos
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Bath size={14} /> {p.bathrooms} banh
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Car size={14} /> {p.parkingSpaces} vg
                    </span>
                    {p.privateArea && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Maximize2 size={14} /> {p.privateArea} m²
                      </span>
                    )}
                  </div>

                  {/* Preço e Ações */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '6px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                        R$ {p.price.toLocaleString('pt-BR')}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {p.purpose}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setLocationModalItem(p)}
                        className="btn-secondary"
                        style={{ padding: '6px 8px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title={p.latitude && p.longitude ? 'Ajustar posição no mapa' : 'Localizar imóvel no mapa com GeoBase'}
                      >
                        <MapPin size={12} color="var(--color-primary)" />
                        <span>{p.latitude && p.longitude ? 'Ajustar pino' : 'Localizar no mapa'}</span>
                      </button>

                      <Link
                        href={`/imoveis/${p.id}`}
                        className="btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                      >
                        Ver
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
