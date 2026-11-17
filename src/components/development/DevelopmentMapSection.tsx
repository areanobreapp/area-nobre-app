'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import type { DevelopmentSharedMapProps } from './DevelopmentSharedMap';

const DevelopmentSharedMap = dynamic(
  () => import('./DevelopmentSharedMap'),
  {
    ssr: false,
    loading: () => (
      <div
        className="card"
        style={{
          padding: '24px',
          width: '100%',
          height: '240px',
          backgroundColor: '#F8FAFC',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748B',
          fontSize: '0.86rem',
          marginTop: '24px',
        }}
      >
        Carregando mapa de localização do empreendimento...
      </div>
    ),
  }
);

export default function DevelopmentMapSection(props: DevelopmentSharedMapProps) {
  return <DevelopmentSharedMap {...props} />;
}
