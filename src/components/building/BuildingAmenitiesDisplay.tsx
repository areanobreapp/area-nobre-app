import React from 'react';
import {
  Waves,
  Dumbbell,
  PartyPopper,
  ArrowUpDown,
  Dog,
  Flame,
  Layers,
  Home,
} from 'lucide-react';
import { PublicBuildingAmenitiesDTO } from '@/lib/public-building-dto';

interface BuildingAmenitiesDisplayProps {
  amenities: PublicBuildingAmenitiesDTO;
  totalFloors?: number | null;
  unitsPerFloor?: number | null;
  towers?: string[] | null;
}

export default function BuildingAmenitiesDisplay({
  amenities,
  totalFloors,
  unitsPerFloor,
  towers,
}: BuildingAmenitiesDisplayProps) {
  const items: Array<{ label: string; icon: React.ReactNode }> = [];

  if (amenities.hasElevator) {
    items.push({ label: 'Elevador', icon: <ArrowUpDown size={16} /> });
  }
  if (amenities.hasPool) {
    items.push({ label: 'Piscina', icon: <Waves size={16} /> });
  }
  if (amenities.hasGym) {
    items.push({ label: 'Academia / Fitness', icon: <Dumbbell size={16} /> });
  }
  if (amenities.hasPartyHall) {
    items.push({ label: 'Salão de Festas', icon: <PartyPopper size={16} /> });
  }
  if (amenities.hasBarbecue) {
    items.push({ label: 'Espaço Churrasco', icon: <Flame size={16} /> });
  }
  if (amenities.hasPetSpace) {
    items.push({ label: 'Espaço Pet', icon: <Dog size={16} /> });
  }

  // Se não houver comodidades ou características estruturais, não renderiza a seção
  const hasStructuralInfo = Boolean(totalFloors || unitsPerFloor || (towers && towers.length > 0));
  if (items.length === 0 && !hasStructuralInfo) {
    return null;
  }

  return (
    <section
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', margin: 0 }}>
        Infraestrutura e Comodidades Coletivas
      </h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {totalFloors && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '0.82rem',
              color: '#334155',
              fontWeight: 600,
            }}
          >
            <Layers size={14} style={{ color: '#1E4620' }} />
            <span>{totalFloors} pavimentos</span>
          </div>
        )}

        {unitsPerFloor && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '0.82rem',
              color: '#334155',
              fontWeight: 600,
            }}
          >
            <Home size={14} style={{ color: '#1E4620' }} />
            <span>{unitsPerFloor} unidades por andar</span>
          </div>
        )}

        {towers && towers.length > 0 && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '0.82rem',
              color: '#334155',
              fontWeight: 600,
            }}
          >
            <Layers size={14} style={{ color: '#1E4620' }} />
            <span>{towers.length} {towers.length === 1 ? 'torre' : 'torres'} ({towers.join(', ')})</span>
          </div>
        )}

        {items.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '8px',
              fontSize: '0.82rem',
              color: '#166534',
              fontWeight: 600,
            }}
          >
            <span style={{ color: '#15803D' }}>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

