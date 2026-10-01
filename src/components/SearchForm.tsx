'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Search,
  User,
  Phone,
  Building2,
  DollarSign,
  MapPin,
  Check,
  ArrowLeft,
  AlertCircle,
  Compass,
  Car,
  Sliders,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

const LocationPickerModal = dynamic(() => import('./LocationPickerModal'), { ssr: false });
const RadiusLocationPickerModal = dynamic(() => import('./RadiusLocationPickerModal'), { ssr: false });

interface SearchFormProps {
  initialData?: any;
  isEditing?: boolean;
}

const PROPERTY_TYPES = [
  'Apartamento',
  'Casa',
  'Terreno',
  'Comercial',
  'Galpão',
  'Rural',
  'Outro',
];

type TriState = 'INDIFERENTE' | 'DESEJAVEL' | 'NECESSARIO';

interface TriStateSelectorProps {
  label: string;
  value: TriState;
  onChange: (val: TriState) => void;
  description?: string;
}

function TriStateSelector({ label, value, onChange, description }: TriStateSelectorProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          border: '1px solid var(--border-light)',
          backgroundColor: '#F3F4F6',
          padding: '2px',
          gap: '2px',
        }}
      >
        {(['INDIFERENTE', 'DESEJAVEL', 'NECESSARIO'] as const).map((opt) => {
          const isSelected = value === opt;
          const bg = isSelected
            ? opt === 'NECESSARIO'
              ? '#DC2626'
              : opt === 'DESEJAVEL'
              ? 'var(--color-primary)'
              : '#FFFFFF'
            : 'transparent';
          const color = isSelected
            ? opt === 'INDIFERENTE'
              ? 'var(--text-primary)'
              : '#FFFFFF'
            : 'var(--text-secondary)';
          const text = opt === 'INDIFERENTE' ? 'Indiferente' : opt === 'DESEJAVEL' ? 'Desejável' : 'Necessário';

          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              style={{
                padding: '7px 8px',
                fontSize: '0.78rem',
                fontWeight: isSelected ? 700 : 500,
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: bg,
                color: color,
                cursor: 'pointer',
                boxShadow: isSelected && opt === 'INDIFERENTE' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {text}
            </button>
          );
        })}
      </div>
      {description && (
        <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{description}</span>
      )}
    </div>
  );
}

export default function SearchForm({ initialData, isEditing = false }: SearchFormProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cliente
  const [clientName, setClientName] = useState(initialData?.client?.name || '');
  const [clientPhone, setClientPhone] = useState(initialData?.client?.phone || '');

  // Busca
  const [searchName, setSearchName] = useState(initialData?.name || '');
  const [purpose, setPurpose] = useState(initialData?.purpose || 'Venda');

  // Tipos selecionados (array)
  const initialTypes = initialData?.propertyTypes
    ? (typeof initialData.propertyTypes === 'string' ? JSON.parse(initialData.propertyTypes) : initialData.propertyTypes)
    : ['Apartamento'];
  const [selectedTypes, setSelectedTypes] = useState<string[]>(initialTypes);

  // Localização
  const initialCities = initialData?.cities
    ? (typeof initialData.cities === 'string' ? JSON.parse(initialData.cities) : initialData.cities)
    : ['Criciúma'];
  const [cities, setCities] = useState<string>(initialCities.join(', '));

  const initialNeighborhoods = initialData?.neighborhoods
    ? (typeof initialData.neighborhoods === 'string' ? JSON.parse(initialData.neighborhoods) : initialData.neighborhoods)
    : [];
  const [neighborhoods, setNeighborhoods] = useState<string>(initialNeighborhoods.join(', '));

  // Valores
  const [minPrice, setMinPrice] = useState(initialData?.minPrice ? String(initialData.minPrice) : '');
  const [maxPrice, setMaxPrice] = useState(initialData?.maxPrice ? String(initialData.maxPrice) : '');

  // Características Básicas
  const [minBedrooms, setMinBedrooms] = useState(initialData?.minBedrooms !== undefined ? String(initialData.minBedrooms) : '2');
  const [minSuites, setMinSuites] = useState(initialData?.minSuites !== undefined ? String(initialData.minSuites) : '1');
  const [minParkingSpaces, setMinParkingSpaces] = useState(initialData?.minParkingSpaces !== undefined ? String(initialData.minParkingSpaces) : '1');
  const [minArea, setMinArea] = useState(initialData?.minArea ? String(initialData.minArea) : '');
  const [minLandArea, setMinLandArea] = useState(initialData?.minLandArea ? String(initialData.minLandArea) : '');

  // Permuta & Averbada
  const [acceptsExchange, setAcceptsExchange] = useState<boolean | null>(
    initialData?.acceptsExchange !== undefined ? initialData.acceptsExchange : null
  );
  const [requiresRegistered, setRequiresRegistered] = useState<boolean | null>(
    initialData?.requiresRegistered !== undefined ? initialData.requiresRegistered : null
  );

  // Preferências Tri-State (Fase 5.0.1)
  const [wantsPool, setWantsPool] = useState<TriState>(initialData?.wantsPool || 'INDIFERENTE');
  const [wantsGym, setWantsGym] = useState<TriState>(initialData?.wantsGym || 'INDIFERENTE');
  const [wantsBarbecue, setWantsBarbecue] = useState<TriState>(initialData?.wantsBarbecue || 'INDIFERENTE');
  const [wantsPartyHall, setWantsPartyHall] = useState<TriState>(initialData?.wantsPartyHall || 'INDIFERENTE');
  const [wantsElevator, setWantsElevator] = useState<TriState>(initialData?.wantsElevator || 'INDIFERENTE');
  const [wantsPetSpace, setWantsPetSpace] = useState<TriState>(initialData?.wantsPetSpace || 'INDIFERENTE');
  const [wantsPenthouse, setWantsPenthouse] = useState<TriState>(initialData?.wantsPenthouse || 'INDIFERENTE');
  const [preferredFurniture, setPreferredFurniture] = useState<string>(initialData?.preferredFurniture || '');

  // Terreno
  const [wantsCorner, setWantsCorner] = useState<TriState>(initialData?.wantsCorner || 'INDIFERENTE');
  const [wantsGatedCommunity, setWantsGatedCommunity] = useState<TriState>(initialData?.wantsGatedCommunity || 'INDIFERENTE');
  const [wantsAllotment, setWantsAllotment] = useState<TriState>(initialData?.wantsAllotment || 'INDIFERENTE');
  const [preferredStreetPaving, setPreferredStreetPaving] = useState<string>(initialData?.preferredStreetPaving || '');

  // Comercial
  const [preferredCommercialType, setPreferredCommercialType] = useState<string>(initialData?.preferredCommercialType || '');

  // Estratégia territorial, raio e tempo de deslocamento Fase 5.2 / 5.2.1
  const initialStrategy: 'NEIGHBORHOODS' | 'RADIUS' | 'TRAVEL_TIME' =
    initialData?.locationStrategy === 'TRAVEL_TIME' ||
    (initialData?.maxTravelTimeMinutes && initialData.maxTravelTimeMinutes > 0)
      ? 'TRAVEL_TIME'
      : initialData?.locationStrategy === 'RADIUS' ||
        (initialData?.searchRadiusMeters && initialData.searchRadiusMeters > 0)
      ? 'RADIUS'
      : 'NEIGHBORHOODS';

  const [locationStrategy, setLocationStrategy] = useState<'NEIGHBORHOODS' | 'RADIUS' | 'TRAVEL_TIME'>(initialStrategy);
  const [searchLatitude, setSearchLatitude] = useState<number | null>(
    initialData?.searchLatitude ?? initialData?.referenceLatitude ?? null
  );
  const [searchLongitude, setSearchLongitude] = useState<number | null>(
    initialData?.searchLongitude ?? initialData?.referenceLongitude ?? null
  );
  const [searchRadiusMeters, setSearchRadiusMeters] = useState<number>(
    initialData?.searchRadiusMeters ?? (initialData?.maxRadiusKm ? initialData.maxRadiusKm * 1000 : 2000)
  );
  const [maxTravelTimeMinutes, setMaxTravelTimeMinutes] = useState<number>(
    initialData?.maxTravelTimeMinutes ?? 15
  );
  const [customTravelTimeMinutes, setCustomTravelTimeMinutes] = useState<string>('');
  const [radiusPickerOpen, setRadiusPickerOpen] = useState(false);
  const [radiusAddressLabel, setRadiusAddressLabel] = useState(initialData?.referenceAddress || '');

  // Raio geográfico opcional (compatibilidade)
  const [referenceAddress, setReferenceAddress] = useState(initialData?.referenceAddress || '');
  const [referenceLatitude, setReferenceLatitude] = useState<number | null>(
    initialData?.referenceLatitude ?? null
  );
  const [referenceLongitude, setReferenceLongitude] = useState<number | null>(
    initialData?.referenceLongitude ?? null
  );
  const [maxRadiusKm, setMaxRadiusKm] = useState(initialData?.maxRadiusKm ? String(initialData.maxRadiusKm) : '');
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const [notes, setNotes] = useState(initialData?.notes || '');

  // Determina se deve iniciar com critérios avançados expandidos
  const hasActiveAdvancedCriteria = Boolean(
    wantsPool !== 'INDIFERENTE' ||
    wantsGym !== 'INDIFERENTE' ||
    wantsBarbecue !== 'INDIFERENTE' ||
    wantsPartyHall !== 'INDIFERENTE' ||
    wantsElevator !== 'INDIFERENTE' ||
    wantsPetSpace !== 'INDIFERENTE' ||
    wantsPenthouse !== 'INDIFERENTE' ||
    preferredFurniture ||
    wantsCorner !== 'INDIFERENTE' ||
    wantsGatedCommunity !== 'INDIFERENTE' ||
    wantsAllotment !== 'INDIFERENTE' ||
    preferredStreetPaving ||
    preferredCommercialType ||
    acceptsExchange !== null ||
    requiresRegistered !== null
  );

  const [showAdvanced, setShowAdvanced] = useState<boolean>(hasActiveAdvancedCriteria);

  // Tipos selecionados
  const isTerrainOnly = selectedTypes.length === 1 && selectedTypes[0] === 'Terreno';
  const isCommercialOnly = selectedTypes.length === 1 && selectedTypes[0] === 'Comercial';
  const includesResidential = selectedTypes.some((t) => ['Apartamento', 'Casa', 'Em construção'].includes(t));
  const includesApartment = selectedTypes.includes('Apartamento') || selectedTypes.includes('Em construção');
  const includesHouse = selectedTypes.includes('Casa');
  const includesTerrain = selectedTypes.includes('Terreno');
  const includesCommercial = selectedTypes.includes('Comercial');

  function toggleType(type: string) {
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length > 1) {
        setSelectedTypes(selectedTypes.filter((t) => t !== type));
      }
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  }

  function formatCurrency(val: string) {
    const clean = val.replace(/\D/g, '');
    if (!clean) return '';
    return Number(clean).toLocaleString('pt-BR');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!clientName.trim()) {
      setError('Por favor, informe o nome do cliente.');
      return;
    }

    const cleanMax = maxPrice.replace(/\D/g, '');
    if (!cleanMax || Number(cleanMax) <= 0) {
      setError('Por favor, informe o valor máximo do orçamento.');
      return;
    }

    setLoading(true);

    const cleanMin = minPrice.replace(/\D/g, '');

    const payload = {
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim() || null,
      name: searchName.trim() || null,
      purpose,
      propertyTypes: selectedTypes,
      cities: cities.split(',').map((c) => c.trim()).filter(Boolean),
      neighborhoods: neighborhoods.split(',').map((n) => n.trim()).filter(Boolean),
      minPrice: cleanMin ? Number(cleanMin) : null,
      maxPrice: Number(cleanMax),
      minBedrooms: isTerrainOnly ? 0 : parseInt(minBedrooms, 10) || 0,
      minSuites: isTerrainOnly ? 0 : parseInt(minSuites, 10) || 0,
      minParkingSpaces: parseInt(minParkingSpaces, 10) || 0,
      minArea: minArea ? parseFloat(minArea) : null,
      minLandArea: minLandArea ? parseFloat(minLandArea) : null,
      acceptsExchange,
      requiresRegistered,
      wantsPool,
      wantsGym,
      wantsBarbecue,
      wantsPartyHall,
      wantsElevator,
      wantsPetSpace,
      wantsPenthouse,
      preferredFurniture: preferredFurniture || null,
      wantsCorner,
      wantsGatedCommunity,
      wantsAllotment,
      preferredStreetPaving: preferredStreetPaving || null,
      preferredCommercialType: preferredCommercialType || null,
      referenceAddress: (locationStrategy === 'RADIUS' || locationStrategy === 'TRAVEL_TIME') ? (radiusAddressLabel || referenceAddress.trim() || null) : (referenceAddress.trim() || null),
      referenceLatitude: (locationStrategy === 'RADIUS' || locationStrategy === 'TRAVEL_TIME') ? searchLatitude : referenceLatitude,
      referenceLongitude: (locationStrategy === 'RADIUS' || locationStrategy === 'TRAVEL_TIME') ? searchLongitude : referenceLongitude,
      maxRadiusKm: locationStrategy === 'RADIUS' ? (searchRadiusMeters ? searchRadiusMeters / 1000 : null) : (maxRadiusKm ? parseFloat(maxRadiusKm) : null),
      locationStrategy,
      searchLatitude: (locationStrategy === 'RADIUS' || locationStrategy === 'TRAVEL_TIME') ? searchLatitude : null,
      searchLongitude: (locationStrategy === 'RADIUS' || locationStrategy === 'TRAVEL_TIME') ? searchLongitude : null,
      searchRadiusMeters: locationStrategy === 'RADIUS' ? searchRadiusMeters : null,
      maxTravelTimeMinutes: locationStrategy === 'TRAVEL_TIME' ? maxTravelTimeMinutes : null,
      travelMode: 'DRIVING',
      notes: notes.trim() || null,
    };

    try {
      const url = isEditing ? `/api/searches/${initialData.id}` : '/api/searches';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar busca.');
      }

      const matchQuery = data.matchCount ? `?newMatches=${data.matchCount}` : '';
      router.push(`/buscas/${data.search.id}${matchQuery}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar busca.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <button
        type="button"
        onClick={() => router.back()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: '0.88rem',
          width: 'fit-content',
        }}
      >
        <ArrowLeft size={16} />
        <span>Voltar</span>
      </button>

      <div>
        <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          {isEditing ? 'Editar Busca de Cliente' : 'Cadastrar Nova Busca'}
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Cadastre os critérios essenciais da necessidade do seu cliente. Critérios avançados são opcionais e adaptados ao tipo de imóvel.
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--color-danger-bg)',
            color: 'var(--color-danger)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: '1px solid #FECACA',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* BLOCO 1: Cliente / Pessoa */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
          <User size={20} color="var(--color-primary)" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Dados do Cliente</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
              Nome do Cliente *
            </label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ex: Ana Souza"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
              WhatsApp / Telefone (Opcional)
            </label>
            <input
              type="text"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="Ex: (48) 99999-8888"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            />
          </div>
        </div>
      </div>

      {/* BLOCO 2: Tipo de Imóvel e Finalidade */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
          <Building2 size={20} color="var(--color-primary)" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Tipo e Finalidade</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
              Finalidade *
            </label>
            <select
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            >
              <option value="Venda">Venda (Comprar)</option>
              <option value="Locação">Locação (Alugar)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
              Nome de Referência da Busca
            </label>
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="Ex: Apartamento 3 quartos para Ana"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '10px' }}>
            Tipos de Imóvel Aceitos (Pode selecionar mais de um)
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {PROPERTY_TYPES.map((type) => {
              const selected = selectedTypes.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  className={selected ? 'btn-primary' : 'btn-secondary'}
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.86rem',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* BLOCO 3: Localização Desejada (Fase 5.2 — Bairros vs Ponto no Mapa + Raio) */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={20} color="var(--color-primary)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Localização Desejada</h2>
          </div>

          {/* Seletor de Estratégia Territorial */}
          <div
            style={{
              display: 'flex',
              backgroundColor: '#F1F5F9',
              padding: '3px',
              borderRadius: '10px',
              gap: '4px',
              border: '1px solid #E2E8F0',
            }}
          >
            <button
              type="button"
              onClick={() => setLocationStrategy('NEIGHBORHOODS')}
              style={{
                padding: '6px 14px',
                fontSize: '0.82rem',
                fontWeight: locationStrategy === 'NEIGHBORHOODS' ? 700 : 500,
                borderRadius: '8px',
                border: 'none',
                backgroundColor: locationStrategy === 'NEIGHBORHOODS' ? '#1D4ED8' : 'transparent',
                color: locationStrategy === 'NEIGHBORHOODS' ? '#FFFFFF' : '#64748B',
                boxShadow: locationStrategy === 'NEIGHBORHOODS' ? '0 2px 6px rgba(29,78,216,0.3)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Building2 size={14} />
              <span>Bairros</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLocationStrategy('RADIUS');
                if (!searchLatitude || !searchLongitude) {
                  setRadiusPickerOpen(true);
                }
              }}
              style={{
                padding: '6px 14px',
                fontSize: '0.82rem',
                fontWeight: locationStrategy === 'RADIUS' ? 700 : 500,
                borderRadius: '8px',
                border: 'none',
                backgroundColor: locationStrategy === 'RADIUS' ? '#1D4ED8' : 'transparent',
                color: locationStrategy === 'RADIUS' ? '#FFFFFF' : '#64748B',
                boxShadow: locationStrategy === 'RADIUS' ? '0 2px 6px rgba(29,78,216,0.3)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Compass size={14} />
              <span>Raio</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLocationStrategy('TRAVEL_TIME');
                if (!searchLatitude || !searchLongitude) {
                  setRadiusPickerOpen(true);
                }
              }}
              style={{
                padding: '6px 14px',
                fontSize: '0.82rem',
                fontWeight: locationStrategy === 'TRAVEL_TIME' ? 700 : 500,
                borderRadius: '8px',
                border: 'none',
                backgroundColor: locationStrategy === 'TRAVEL_TIME' ? '#1D4ED8' : 'transparent',
                color: locationStrategy === 'TRAVEL_TIME' ? '#FFFFFF' : '#64748B',
                boxShadow: locationStrategy === 'TRAVEL_TIME' ? '0 2px 6px rgba(29,78,216,0.3)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Car size={14} />
              <span>Tempo de Carro</span>
            </button>
          </div>
        </div>

        {/* ESTRATÉGIA A: Bairros da Cidade */}
        {locationStrategy === 'NEIGHBORHOODS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                  Cidades
                </label>
                <input
                  type="text"
                  value={cities}
                  onChange={(e) => setCities(e.target.value)}
                  placeholder="Ex: Criciúma, Içara"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: 'var(--bg-subtle)',
                  }}
                />
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Separadas por vírgula</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                  Bairros Desejados
                </label>
                <input
                  type="text"
                  value={neighborhoods}
                  onChange={(e) => setNeighborhoods(e.target.value)}
                  placeholder="Ex: Centro, Comerciário, Pio Corrêa"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: 'var(--bg-subtle)',
                  }}
                />
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Separados por vírgula</span>
              </div>
            </div>

            {/* Ponto de Referência Opcional */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', paddingTop: '8px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>
                    Ponto de Referência (Opcional)
                  </label>
                  {referenceAddress && (
                    <button
                      type="button"
                      onClick={() => setShowLocationPicker(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-primary)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        textDecoration: 'underline',
                      }}
                    >
                      <MapPin size={13} />
                      <span>{referenceLatitude ? 'Ajustar no mapa' : 'Buscar no mapa'}</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={referenceAddress}
                  onChange={(e) => {
                    setReferenceAddress(e.target.value);
                    setReferenceLatitude(null);
                    setReferenceLongitude(null);
                  }}
                  placeholder="Ex: Hospital São José, Unesc, Parque das Nações"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: 'var(--bg-subtle)',
                  }}
                />
                {referenceLatitude && referenceLongitude && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#15803D', marginTop: '4px' }}>
                    <Check size={13} strokeWidth={3} />
                    <span>Ponto localizado: {referenceLatitude.toFixed(4)}, {referenceLongitude.toFixed(4)}</span>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                  Raio Máx (km)
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={maxRadiusKm}
                  onChange={(e) => setMaxRadiusKm(e.target.value)}
                  placeholder="Ex: 3"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: 'var(--bg-subtle)',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ESTRATÉGIA B: Ponto no Mapa + Raio */}
        {locationStrategy === 'RADIUS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '12px',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      backgroundColor: '#1D4ED8',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Compass size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                      Região Geográfica por Raio
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#475569', margin: '3px 0 0 0' }}>
                      {searchLatitude && searchLongitude
                        ? `Centro delimitado no mapa com raio de ${searchRadiusMeters >= 1000 ? `${(searchRadiusMeters / 1000).toFixed(1).replace('.', ',')} km` : `${searchRadiusMeters} m`}`
                        : 'Nenhuma região selecionada no mapa ainda.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setRadiusPickerOpen(true)}
                  style={{
                    backgroundColor: '#1D4ED8',
                    color: 'white',
                    border: 'none',
                    padding: '9px 18px',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 8px rgba(29, 78, 216, 0.3)',
                  }}
                >
                  <MapPin size={16} />
                  <span>{searchLatitude && searchLongitude ? 'Alterar região no mapa' : 'Escolher região no mapa'}</span>
                </button>
              </div>

              {searchLatitude && searchLongitude ? (
                <div
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    border: '1px solid #DBEAFE',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '0.82rem',
                    color: '#334155',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span><strong>Ponto de referência:</strong> {radiusAddressLabel || `Lat: ${searchLatitude.toFixed(5)}, Lng: ${searchLongitude.toFixed(5)}`}</span>
                    <span style={{ backgroundColor: '#DBEAFE', color: '#1D4ED8', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>
                      Raio: {searchRadiusMeters >= 1000 ? `${(searchRadiusMeters / 1000).toFixed(1).replace('.', ',')} km` : `${searchRadiusMeters} m`}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0369A1', fontSize: '0.78rem', marginTop: '2px' }}>
                    <ShieldCheck size={14} />
                    <span>Critério Geográfico Forte: apenas imóveis dentro deste raio de {searchRadiusMeters >= 1000 ? `${(searchRadiusMeters / 1000).toFixed(1).replace('.', ',')} km` : `${searchRadiusMeters} m`} serão elegíveis.</span>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.82rem', color: '#64748B', fontStyle: 'italic' }}>
                  Clique no botão acima para abrir o mapa interativo (com satélite) e definir o ponto e raio desejados.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ESTRATÉGIA C: Tempo de Carro (Fase 5.2.1) */}
        {locationStrategy === 'TRAVEL_TIME' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '12px',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      backgroundColor: '#1D4ED8',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Car size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                      Tempo de Deslocamento de Carro
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#475569', margin: '3px 0 0 0' }}>
                      {searchLatitude && searchLongitude
                        ? `Origem definida no mapa · Limite de até ${maxTravelTimeMinutes} minutos de carro`
                        : 'Escolha o ponto de referência no mapa interativo.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setRadiusPickerOpen(true)}
                  style={{
                    backgroundColor: '#1D4ED8',
                    color: 'white',
                    border: 'none',
                    padding: '9px 18px',
                    borderRadius: '8px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 8px rgba(29, 78, 216, 0.3)',
                  }}
                >
                  <MapPin size={16} />
                  <span>{searchLatitude && searchLongitude ? 'Alterar ponto no mapa' : 'Escolher ponto no mapa'}</span>
                </button>
              </div>

              {searchLatitude && searchLongitude ? (
                <div
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    padding: '14px 16px',
                    border: '1px solid #DBEAFE',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    fontSize: '0.84rem',
                    color: '#334155',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <span>
                      <strong>Ponto de referência:</strong> {radiusAddressLabel || `Lat: ${searchLatitude.toFixed(5)}, Lng: ${searchLongitude.toFixed(5)}`}
                    </span>
                    <span style={{ backgroundColor: '#DBEAFE', color: '#1D4ED8', fontWeight: 700, padding: '3px 10px', borderRadius: '6px' }}>
                      🚗 Máx: {maxTravelTimeMinutes} min
                    </span>
                  </div>

                  {/* Seletor de tempo rápido */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '4px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
                      Tempo máximo de carro:
                    </span>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {[5, 10, 15, 20, 30].map((mins) => {
                        const isSelected = maxTravelTimeMinutes === mins;
                        return (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => {
                              setMaxTravelTimeMinutes(mins);
                              setCustomTravelTimeMinutes('');
                            }}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '6px',
                              fontSize: '0.82rem',
                              fontWeight: isSelected ? 700 : 500,
                              backgroundColor: isSelected ? '#1D4ED8' : '#F1F5F9',
                              color: isSelected ? 'white' : '#334155',
                              border: isSelected ? '1px solid #1D4ED8' : '1px solid #CBD5E1',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {mins} min
                          </button>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        placeholder="Outro"
                        value={customTravelTimeMinutes}
                        onChange={(e) => {
                          setCustomTravelTimeMinutes(e.target.value);
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val > 0) {
                            setMaxTravelTimeMinutes(val);
                          }
                        }}
                        style={{
                          width: '65px',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          fontSize: '0.82rem',
                          border: '1px solid #CBD5E1',
                          outline: 'none',
                          textAlign: 'center',
                        }}
                      />
                      <span style={{ fontSize: '0.78rem', color: '#64748B' }}>min</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0369A1', fontSize: '0.8rem', fontWeight: 600 }}>
                      <ShieldCheck size={14} />
                      <span>Critério Geográfico Forte: apenas imóveis com tempo estimado de carro até {maxTravelTimeMinutes} min serão elegíveis.</span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748B', fontStyle: 'italic', paddingLeft: '20px' }}>
                      Estimativa baseada na rede viária; não considera trânsito em tempo real.
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.82rem', color: '#64748B', fontStyle: 'italic' }}>
                  Clique no botão acima para abrir o mapa interativo (com satélite) e escolher o ponto de referência desejado.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de Localização do Ponto de Referência Legado */}
        {showLocationPicker && (
          <LocationPickerModal
            initialLat={referenceLatitude}
            initialLng={referenceLongitude}
            addressToGeocode={`${referenceAddress}, ${cities.split(',')[0] || 'Criciúma'}, SC`}
            onConfirm={(lat, lng, formattedAddress) => {
              setReferenceLatitude(lat);
              setReferenceLongitude(lng);
              if (formattedAddress && !referenceAddress) {
                setReferenceAddress(formattedAddress);
              }
              setShowLocationPicker(false);
            }}
            onCancel={() => setShowLocationPicker(false)}
            title="Ponto de Referência da Busca"
          />
        )}

        {/* Modal de Escolha de Região no Mapa (Fase 5.2 / 5.2.1) */}
        {radiusPickerOpen && (
          <RadiusLocationPickerModal
            isOpen={radiusPickerOpen}
            mode={locationStrategy === 'TRAVEL_TIME' ? 'TRAVEL_TIME' : 'RADIUS'}
            initialLat={searchLatitude}
            initialLng={searchLongitude}
            initialRadiusMeters={searchRadiusMeters}
            initialAddress={radiusAddressLabel}
            onConfirm={(data) => {
              setSearchLatitude(data.latitude);
              setSearchLongitude(data.longitude);
              if (locationStrategy === 'RADIUS') {
                setSearchRadiusMeters(data.radiusMeters);
              }
              if (data.address) {
                setRadiusAddressLabel(data.address);
              }
              setRadiusPickerOpen(false);
            }}
            onCancel={() => setRadiusPickerOpen(false)}
          />
        )}
      </div>

      {/* BLOCO 4: Orçamento e Critérios Principais (Adaptativo por Tipo) */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <DollarSign size={20} color="var(--color-primary)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Faixa de Valor e Requisitos Principais</h2>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-primary)', backgroundColor: 'var(--color-primary-light)', padding: '3px 10px', borderRadius: '12px', fontWeight: 600 }}>
            {selectedTypes.join(', ')}
          </span>
        </div>

        {/* Preço Mín / Máx */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
              Valor Mínimo (R$)
            </label>
            <input
              type="text"
              value={formatCurrency(minPrice)}
              onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ''))}
              placeholder="Ex: 400.000"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
              Valor Máximo (R$) *
            </label>
            <input
              type="text"
              required
              value={formatCurrency(maxPrice)}
              onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ''))}
              placeholder="Ex: 750.000"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-subtle)',
                fontWeight: 700,
              }}
            />
          </div>
        </div>

        {/* Requisitos Estruturais Adaptativos */}
        {isTerrainOnly ? (
          /* Apenas Terreno */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Área Mínima do Terreno (m²)
              </label>
              <input
                type="number"
                min="0"
                value={minLandArea}
                onChange={(e) => setMinLandArea(e.target.value)}
                placeholder="Ex: 360"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              />
            </div>
          </div>
        ) : isCommercialOnly ? (
          /* Apenas Comercial */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Área Útil Mínima (m²)
              </label>
              <input
                type="number"
                min="0"
                value={minArea}
                onChange={(e) => setMinArea(e.target.value)}
                placeholder="Ex: 50"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Vagas Mínimas
              </label>
              <input
                type="number"
                min="0"
                value={minParkingSpaces}
                onChange={(e) => setMinParkingSpaces(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              />
            </div>
          </div>
        ) : (
          /* Residencial ou Misto */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Dormitórios Mín.
              </label>
              <input
                type="number"
                min="0"
                value={minBedrooms}
                onChange={(e) => setMinBedrooms(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Suítes Mín.
              </label>
              <input
                type="number"
                min="0"
                value={minSuites}
                onChange={(e) => setMinSuites(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Vagas Mín.
              </label>
              <input
                type="number"
                min="0"
                value={minParkingSpaces}
                onChange={(e) => setMinParkingSpaces(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                Área Mín. (m²)
              </label>
              <input
                type="number"
                min="0"
                value={minArea}
                onChange={(e) => setMinArea(e.target.value)}
                placeholder="Ex: 80"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              />
            </div>

            {includesHouse && (
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                  Área Terreno Mín. (m²)
                </label>
                <input
                  type="number"
                  min="0"
                  value={minLandArea}
                  onChange={(e) => setMinLandArea(e.target.value)}
                  placeholder="Ex: 300"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    backgroundColor: 'var(--bg-subtle)',
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* BLOCO 5: Critérios Avançados & Preferências Tri-State (Progressive Disclosure) */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={20} color="var(--color-primary)" />
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                Preferências Avançadas de Matching
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Defina: <strong>Indiferente</strong> (não altera nota), <strong>Desejável</strong> (soma pontos), ou <strong>Necessário</strong> (requisito eliminatório).
              </p>
            </div>
          </div>
          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.84rem',
              fontWeight: 600,
            }}
          >
            {showAdvanced ? 'Recolher' : 'Definir preferências'}
            {showAdvanced ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {showAdvanced && (
          <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '18px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Seções para Residencial (Casa / Apartamento) */}
            {includesResidential && (
              <div>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '14px' }}>
                  Comodidades e Estrutura
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  {includesApartment && (
                    <TriStateSelector
                      label="Elevador"
                      value={wantsElevator}
                      onChange={setWantsElevator}
                      description="Indiferente = qualquer andar; Necessário = exige prédio com elevador."
                    />
                  )}

                  <TriStateSelector
                    label="Piscina"
                    value={wantsPool}
                    onChange={setWantsPool}
                  />

                  <TriStateSelector
                    label="Academia / Fitness"
                    value={wantsGym}
                    onChange={setWantsGym}
                  />

                  <TriStateSelector
                    label="Churrasqueira"
                    value={wantsBarbecue}
                    onChange={setWantsBarbecue}
                  />

                  {includesApartment && (
                    <>
                      <TriStateSelector
                        label="Salão de Festas"
                        value={wantsPartyHall}
                        onChange={setWantsPartyHall}
                      />

                      <TriStateSelector
                        label="Espaço Pet"
                        value={wantsPetSpace}
                        onChange={setWantsPetSpace}
                      />

                      <TriStateSelector
                        label="Unidade Cobertura"
                        value={wantsPenthouse}
                        onChange={setWantsPenthouse}
                      />
                    </>
                  )}
                </div>

                {/* Mobília & Condições Específicas */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                      Preferência de Mobília
                    </label>
                    <select
                      value={preferredFurniture}
                      onChange={(e) => setPreferredFurniture(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-light)',
                        backgroundColor: 'var(--bg-subtle)',
                      }}
                    >
                      <option value="">Indiferente (mobiliado ou vazio)</option>
                      <option value="Completa">Mobiliado Completo</option>
                      <option value="Semi">Semi-mobiliado</option>
                      <option value="Não">Sem mobília / Vazio</option>
                    </select>
                  </div>

                  {includesHouse && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                        Exigência de Averbação (Casa)
                      </label>
                      <select
                        value={requiresRegistered === null ? '' : requiresRegistered ? 'true' : 'false'}
                        onChange={(e) => setRequiresRegistered(e.target.value === '' ? null : e.target.value === 'true')}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-light)',
                          backgroundColor: 'var(--bg-subtle)',
                        }}
                      >
                        <option value="">Indiferente</option>
                        <option value="true">Necessário (financiável / averbada)</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                      Aceita Permuta na Negociação?
                    </label>
                    <select
                      value={acceptsExchange === null ? '' : acceptsExchange ? 'true' : 'false'}
                      onChange={(e) => setAcceptsExchange(e.target.value === '' ? null : e.target.value === 'true')}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-light)',
                        backgroundColor: 'var(--bg-subtle)',
                      }}
                    >
                      <option value="">Indiferente</option>
                      <option value="true">Cliente precisa dar imóvel em permuta</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Seções para Terreno */}
            {includesTerrain && (
              <div style={{ borderTop: includesResidential ? '1px dashed var(--border-light)' : 'none', paddingTop: includesResidential ? '16px' : '0' }}>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '14px' }}>
                  Preferências de Terreno
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  <TriStateSelector
                    label="Terreno de Esquina"
                    value={wantsCorner}
                    onChange={setWantsCorner}
                  />

                  <TriStateSelector
                    label="Condomínio Fechado"
                    value={wantsGatedCommunity}
                    onChange={setWantsGatedCommunity}
                  />

                  <TriStateSelector
                    label="Loteamento Planejado"
                    value={wantsAllotment}
                    onChange={setWantsAllotment}
                  />

                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                      Pavimentação da Rua
                    </label>
                    <select
                      value={preferredStreetPaving}
                      onChange={(e) => setPreferredStreetPaving(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-light)',
                        backgroundColor: 'var(--bg-subtle)',
                      }}
                    >
                      <option value="">Indiferente (qualquer pavimento)</option>
                      <option value="Asfalto">Asfalto</option>
                      <option value="Lajota">Lajota</option>
                      <option value="Paralelepípedo">Paralelepípedo</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Seções para Comercial */}
            {includesCommercial && (
              <div style={{ borderTop: (includesResidential || includesTerrain) ? '1px dashed var(--border-light)' : 'none', paddingTop: (includesResidential || includesTerrain) ? '16px' : '0' }}>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '14px' }}>
                  Preferências Comerciais
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
                      Tipo de Sala / Posição
                    </label>
                    <select
                      value={preferredCommercialType}
                      onChange={(e) => setPreferredCommercialType(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-light)',
                        backgroundColor: 'var(--bg-subtle)',
                      }}
                    >
                      <option value="">Indiferente (Térrea ou Aérea)</option>
                      <option value="Térrea">Térrea com vitrine de rua</option>
                      <option value="Aérea">Aérea em edifício corporativo</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* BLOCO 6: Observações Gerais */}
      <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
            Observações e Anotações da Conversa com o Cliente
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Cliente tem interesse para fechar até dezembro, prefere sol da manhã, estuda imóvel de menor valor na permuta..."
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              backgroundColor: 'var(--bg-subtle)',
              resize: 'vertical',
            }}
          />
        </div>
      </div>

      {/* Botão de Envio */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '32px' }}>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
          style={{ padding: '12px 28px', fontSize: '0.96rem' }}
        >
          <Check size={18} />
          <span>{loading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Salvar Busca de Cliente'}</span>
        </button>
      </div>
    </form>
  );
}
