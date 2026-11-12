'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Layers,
  Save,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

interface BlockModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (block: any) => void;
  developmentId: string;
  initialBlock?: any;
}

export default function BlockModal({
  open,
  onClose,
  onSaved,
  developmentId,
  initialBlock,
}: BlockModalProps) {
  const isEditing = Boolean(initialBlock?.id);

  const [name, setName] = useState(initialBlock?.name || '');
  const [blockType, setBlockType] = useState<'TOWER' | 'QUADRA' | 'BLOCO'>(
    initialBlock?.blockType || 'TOWER'
  );
  const [totalFloors, setTotalFloors] = useState<number | ''>(initialBlock?.totalFloors ?? '');
  const [unitsPerFloor, setUnitsPerFloor] = useState<number | ''>(initialBlock?.unitsPerFloor ?? '');
  const [displayOrder, setDisplayOrder] = useState<number>(initialBlock?.displayOrder ?? 0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initialBlock?.name || '');
      setBlockType(initialBlock?.blockType || 'TOWER');
      setTotalFloors(initialBlock?.totalFloors ?? '');
      setUnitsPerFloor(initialBlock?.unitsPerFloor ?? '');
      setDisplayOrder(initialBlock?.displayOrder ?? 0);
      setError(null);
    }
  }, [open, initialBlock]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Identificação da torre / quadra é obrigatória.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        blockType,
        totalFloors: totalFloors !== '' ? Number(totalFloors) : null,
        unitsPerFloor: unitsPerFloor !== '' ? Number(unitsPerFloor) : null,
        displayOrder: Number(displayOrder) || 0,
      };

      const endpoint = isEditing
        ? `/api/admin/blocks/${initialBlock.id}`
        : `/api/admin/developments/${developmentId}/blocks`;
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar torre/quadra.');
      }

      onSaved(data.block);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Falha ao salvar.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
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
          maxWidth: '480px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
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
              <Layers size={20} />
            </div>
            <h3 style={{ fontSize: '1.12rem', fontWeight: 800, color: '#111827', margin: 0 }}>
              {isEditing ? 'Editar Torre / Quadra' : 'Nova Torre ou Quadra'}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: '#FEF2F2',
                color: '#991B1B',
                fontSize: '0.84rem',
                fontWeight: 600,
                border: '1px solid #FECACA',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
              Tipo de Bloco <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {(['TOWER', 'QUADRA', 'BLOCO'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setBlockType(type)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: blockType === type ? '2px solid #1E4620' : '1px solid #D1D5DB',
                    backgroundColor: blockType === type ? '#F0FDF4' : '#FFFFFF',
                    color: blockType === type ? '#1E4620' : '#374151',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {type === 'TOWER' ? 'Torre' : type === 'QUADRA' ? 'Quadra' : 'Bloco'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
              Nome / Identificação <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="text"
              id="input-block-name"
              required
              placeholder={blockType === 'QUADRA' ? 'Ex: Quadra 04 ou Quadra dos Lírios' : 'Ex: Torre A ou Torre Magnólia'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
          </div>

          {blockType === 'TOWER' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Total de Andares
                </label>
                <input
                  type="number"
                  min={1}
                  placeholder="Ex: 18"
                  value={totalFloors}
                  onChange={(e) => setTotalFloors(e.target.value ? parseInt(e.target.value, 10) : '')}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                  Unidades por Andar
                </label>
                <input
                  type="number"
                  min={1}
                  placeholder="Ex: 4"
                  value={unitsPerFloor}
                  onChange={(e) => setUnitsPerFloor(e.target.value ? parseInt(e.target.value, 10) : '')}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
              Ordem de Exibição
            </label>
            <input
              type="number"
              min={0}
              value={displayOrder}
              onChange={(e) => setDisplayOrder(parseInt(e.target.value || '0', 10))}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                color: '#374151',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="btn-salvar-bloco-modal"
              disabled={submitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 20px',
                backgroundColor: '#1E4620',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.86rem',
                border: 'none',
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              <span>{isEditing ? 'Atualizar Bloco' : 'Salvar Bloco'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

