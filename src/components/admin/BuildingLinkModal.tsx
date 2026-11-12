'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Building,
  Search,
  Check,
  Loader2,
  AlertTriangle,
  MapPin,
} from 'lucide-react';

interface BuildingLinkModalProps {
  open: boolean;
  onClose: () => void;
  onLinked: (building: any) => void;
  developmentId: string;
  currentBuildingId?: string | null;
}

export default function BuildingLinkModal({
  open,
  onClose,
  onLinked,
  developmentId,
  currentBuildingId,
}: BuildingLinkModalProps) {
  const [search, setSearch] = useState('');
  const [buildings, setBuildings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(currentBuildingId || null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelectedId(currentBuildingId || null);
      loadBuildings('');
    }
  }, [open, currentBuildingId]);

  if (!open) return null;

  async function loadBuildings(q: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/buildings?search=${encodeURIComponent(q)}&limit=10`);
      if (!res.ok) throw new Error('Falha ao buscar edifícios.');
      const data = await res.json();
      setBuildings(data.buildings || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar edifícios.');
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadBuildings(search);
  }

  async function handleConfirmLink() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/developments/${developmentId}/building`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildingId: selectedId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao associar edifício.');

      onLinked(data.development?.building || null);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Falha ao vincular edifício.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        zIndex: 9999,
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
        }}
      >
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#DCFCE7',
                color: '#166534',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                Associar Edifício Predial
              </h3>
              <span style={{ fontSize: '0.76rem', color: '#6B7280' }}>
                Conecte este empreendimento à inteligência cartográfica do Área Nobre
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
          {error && (
            <div
              style={{
                padding: '10px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                color: '#991B1B',
                fontSize: '0.82rem',
                marginBottom: '14px',
                border: '1px solid #FECACA',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Busca */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }}
              />
              <input
                type="text"
                id="input-busca-edificio-modal"
                placeholder="Buscar por nome do edifício ou endereço..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.86rem',
                  outline: 'none',
                }}
              />
            </div>
            <button
              type="submit"
              id="btn-buscar-edificio-modal"
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: '#374151',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.82rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Buscar
            </button>
          </form>

          {/* Opção para desvincular */}
          <div
            onClick={() => setSelectedId(null)}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: selectedId === null ? '2px solid #1E4620' : '1px solid #E5E7EB',
              backgroundColor: selectedId === null ? '#F0FDF4' : '#FFFFFF',
              marginBottom: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#111827' }}>
                Nenhum edifício vinculado
              </div>
              <div style={{ fontSize: '0.74rem', color: '#6B7280' }}>
                Deixar o empreendimento desvinculado de condomínios cadastrados
              </div>
            </div>
            {selectedId === null && <Check size={18} color="#1E4620" />}
          </div>

          {/* Lista de Resultados */}
          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center' }}>
              <Loader2 size={24} className="animate-spin" style={{ color: '#1E4620', margin: '0 auto 8px auto' }} />
              <span style={{ fontSize: '0.80rem', color: '#6B7280' }}>Buscando edifícios...</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {buildings.map((b) => {
                const isSelected = selectedId === b.id;
                return (
                  <div
                    key={b.id}
                    id={`building-card-${b.id}`}
                    data-building-id={b.id}
                    onClick={() => setSelectedId(b.id)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #1E4620' : '1px solid #E5E7EB',
                      backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#111827' }}>
                        {b.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.76rem', color: '#6B7280', marginTop: '2px' }}>
                        <MapPin size={12} />
                        <span>{b.address}{b.neighborhood ? `, ${b.neighborhood}` : ''} - {b.city}</span>
                      </div>
                    </div>
                    {isSelected && <Check size={18} color="#1E4620" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            backgroundColor: '#F9FAFB',
            borderRadius: '0 0 16px 16px',
          }}
        >
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            id="btn-confirmar-vincular-edificio"
            disabled={submitting}
            onClick={handleConfirmLink}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              backgroundColor: '#1E4620',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.84rem',
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            <span>Salvar Associação</span>
          </button>
        </div>
      </div>
    </div>
  );
}

