'use client';

import React from 'react';
import { Map, Satellite } from 'lucide-react';
import { BaseMapType } from '@/lib/geo/basemaps';

interface BaseMapToggleProps {
  activeBaseMap: BaseMapType;
  onChange: (type: BaseMapType) => void;
  compact?: boolean;
  style?: React.CSSProperties;
}

export default function BaseMapToggle({
  activeBaseMap,
  onChange,
  compact = false,
  style,
}: BaseMapToggleProps) {
  return (
    <div
      role="group"
      aria-label="Alternar basemap"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        padding: compact ? '2px' : '3px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-md)',
        userSelect: 'none',
        ...style,
      }}
    >
      <button
        type="button"
        onClick={() => onChange('street')}
        title="Visualizar mapa de ruas e logradouros"
        aria-pressed={activeBaseMap === 'street'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: compact ? '4px' : '6px',
          padding: compact ? '5px 10px' : '7px 13px',
          fontSize: compact ? '0.74rem' : '0.80rem',
          fontWeight: activeBaseMap === 'street' ? 700 : 600,
          color: activeBaseMap === 'street' ? '#FFFFFF' : 'var(--text-secondary)',
          backgroundColor: activeBaseMap === 'street' ? 'var(--color-primary)' : 'transparent',
          border: 'none',
          borderRadius: '7px',
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
          boxShadow: activeBaseMap === 'street' ? '0 1px 4px rgba(0,0,0,0.18)' : 'none',
        }}
      >
        <Map size={compact ? 13 : 14} />
        <span>Mapa</span>
      </button>

      <button
        type="button"
        onClick={() => onChange('satellite')}
        title="Visualizar imagem aérea e de satélite"
        aria-pressed={activeBaseMap === 'satellite'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: compact ? '4px' : '6px',
          padding: compact ? '5px 10px' : '7px 13px',
          fontSize: compact ? '0.74rem' : '0.80rem',
          fontWeight: activeBaseMap === 'satellite' ? 700 : 600,
          color: activeBaseMap === 'satellite' ? '#FFFFFF' : 'var(--text-secondary)',
          backgroundColor: activeBaseMap === 'satellite' ? 'var(--color-primary)' : 'transparent',
          border: 'none',
          borderRadius: '7px',
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
          boxShadow: activeBaseMap === 'satellite' ? '0 1px 4px rgba(0,0,0,0.18)' : 'none',
        }}
      >
        <Satellite size={compact ? 13 : 14} />
        <span>Satélite</span>
      </button>
    </div>
  );
}
