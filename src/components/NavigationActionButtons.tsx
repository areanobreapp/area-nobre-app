'use client';

import React from 'react';
import { Navigation, ExternalLink } from 'lucide-react';
import { getNavigationLinks } from '@/lib/geo/navigation-links';

export interface NavigationActionButtonsProps {
  latitude?: number | null;
  longitude?: number | null;
  className?: string;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
}

export default function NavigationActionButtons({
  latitude,
  longitude,
  className,
  size = 'sm',
  fullWidth = false,
}: NavigationActionButtonsProps) {
  const links = getNavigationLinks(latitude, longitude);

  // Se não houver coordenadas válidas, não renderiza absolutamente nada
  if (!links) {
    return null;
  }

  const isSmall = size === 'sm';
  const padding = isSmall ? '5px 11px' : '8px 14px';
  const fontSize = isSmall ? '0.78rem' : '0.84rem';

  return (
    <div
      className={className}
      style={{
        display: fullWidth ? 'flex' : 'inline-flex',
        width: fullWidth ? '100%' : 'auto',
        alignItems: 'center',
        gap: '8px',
        flexWrap: fullWidth ? 'nowrap' : 'wrap',
      }}
    >
      {/* Botão Rota no Google Maps */}
      <a
        href={links.googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Abrir rota até este imóvel no Google Maps"
        style={{
          flex: fullWidth ? 1 : undefined,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: fullWidth ? 'center' : 'flex-start',
          gap: '6px',
          padding,
          fontSize,
          fontWeight: 700,
          color: '#1E293B',
          backgroundColor: '#FFFFFF',
          border: '1px solid #CBD5E1',
          borderRadius: 'var(--radius-sm, 6px)',
          textDecoration: 'none',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          transition: 'all 0.15s ease',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#F8FAFC';
          e.currentTarget.style.borderColor = '#94A3B8';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#FFFFFF';
          e.currentTarget.style.borderColor = '#CBD5E1';
        }}
      >
        <Navigation size={13} color="#2563EB" />
        <span>Rota no Google Maps</span>
        <ExternalLink size={11} color="#94A3B8" />
      </a>

      {/* Botão Rota no Waze */}
      <a
        href={links.wazeUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Abrir rota até este imóvel no Waze"
        style={{
          flex: fullWidth ? 1 : undefined,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: fullWidth ? 'center' : 'flex-start',
          gap: '6px',
          padding,
          fontSize,
          fontWeight: 700,
          color: '#1E293B',
          backgroundColor: '#FFFFFF',
          border: '1px solid #CBD5E1',
          borderRadius: 'var(--radius-sm, 6px)',
          textDecoration: 'none',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          transition: 'all 0.15s ease',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#F8FAFC';
          e.currentTarget.style.borderColor = '#94A3B8';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#FFFFFF';
          e.currentTarget.style.borderColor = '#CBD5E1';
        }}
      >
        <Navigation size={13} color="#0D9488" />
        <span>Rota no Waze</span>
        <ExternalLink size={11} color="#94A3B8" />
      </a>
    </div>
  );
}
