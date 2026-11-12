'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const BuildingSharedMap = dynamic(
  () => import('./BuildingSharedMap'),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: '100%',
          height: '280px',
          backgroundColor: '#F1F5F9',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748B',
          fontSize: '0.86rem',
        }}
      >
        Carregando mapa e localização territorial...
      </div>
    ),
  }
);

interface BuildingMapSectionProps {
  latitude: number | null;
  longitude: number | null;
  boundary: string | null;
  boundaryArea: number | null;
  buildingName: string;
  address?: string | null;
}

export default function BuildingMapSection(props: BuildingMapSectionProps) {
  return <BuildingSharedMap {...props} />;
}

