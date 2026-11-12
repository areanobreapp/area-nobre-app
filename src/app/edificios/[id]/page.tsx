import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import {
  getPublicBuildingById,
  getPublicBuildingMetadata,
} from '@/lib/building-public-service';
import BuildingHeader from '@/components/building/BuildingHeader';
import BuildingApartmentList from '@/components/building/BuildingApartmentList';
import BuildingAmenitiesDisplay from '@/components/building/BuildingAmenitiesDisplay';
import BuildingBrokerActions from '@/components/building/BuildingBrokerActions';
import BuildingMapSection from '@/components/building/BuildingMapSection';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const meta = await getPublicBuildingMetadata(id);
  return {
    title: meta.title,
    description: meta.description,
    openGraph: meta.openGraph as any,
    twitter: meta.twitter as any,
  };
}

export default async function BuildingSharedPage({ params }: PageProps) {
  const { id } = await params;
  if (!id) {
    notFound();
  }

  // Identifica opcionalmente se o visitante é um corretor logado
  const user = await getCurrentUser();
  const isBroker = Boolean(user && (user.role === 'BROKER' || user.role === 'ADMIN'));

  const building = await getPublicBuildingById(id, {
    currentUserId: user?.id || null,
  });

  if (!building) {
    notFound();
  }

  // Gera dados estruturados Schema.org para indexação semântica
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ApartmentComplex',
    name: building.name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: [building.address, building.number].filter(Boolean).join(', '),
      addressLocality: building.city,
      addressRegion: building.state,
      postalCode: building.zipcode || undefined,
      addressCountry: 'BR',
    },
    geo: building.hasCoordinates
      ? {
          '@type': 'GeoCoordinates',
          latitude: building.latitude,
          longitude: building.longitude,
        }
      : undefined,
    image: building.coverImageUrl || undefined,
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8FAFC',
        padding: '24px 16px 64px 16px',
        overflowX: 'hidden',
      }}
    >
      {/* Dados Estruturados JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div
        style={{
          maxWidth: '920px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {/* 1. Topo: Identidade, Fachada, Endereço e Ações Rápidas */}
        <BuildingHeader building={building} />

        {/* 2. Infraestrutura e Comodidades Coletivas (se houver) */}
        <BuildingAmenitiesDisplay
          amenities={building.amenities}
          totalFloors={building.totalFloors}
          unitsPerFloor={building.unitsPerFloor}
          towers={building.towers}
        />

        {/* 3. Mapa Interativo com Perímetro e Marcador de Precisão */}
        <BuildingMapSection
          latitude={building.latitude}
          longitude={building.longitude}
          boundary={building.boundary}
          boundaryArea={building.boundaryArea}
          buildingName={building.name}
          address={building.address}
        />

        {/* 4. Lista Canônica de Apartamentos Agrupados por Andar */}
        <BuildingApartmentList
          floors={building.floors}
          hasAvailableUnits={building.hasAvailableUnits}
          buildingName={building.name}
        />

        {/* 5. Área Exclusiva do Corretor Parceiro (visível apenas para corretores autenticados) */}
        <BuildingBrokerActions building={building} isBroker={isBroker} />
      </div>
    </main>
  );
}
