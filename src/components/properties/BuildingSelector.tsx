'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Search,
  Plus,
  Check,
  X,
  MapPin,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  Shield,
  Layers,
  Sparkles,
  Info,
  Users,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const LocationPickerModal = dynamic(() => import('@/components/LocationPickerModal'), { ssr: false });

export interface SlotInfoData {
  unitExists: boolean;
  unit?: { id: string; unitNumber: string; tower: string | null; floor: number | null } | null;
  hasPhysicalProperty: boolean;
  physicalPropertyId?: string;
  activeListingsCount: number;
  availableSlots: number;
  isPrimaryEligible: boolean;
  sharedPrice: number | null;
  isFull: boolean;
  userHasActiveListing: boolean;
  userHasWaitlist?: boolean;
  userWaitlistPosition?: number | null;
  otherBrokers: Array<{
    listingId: string;
    isPrimary: boolean;
    slot: number | null;
    brokerId?: string;
    brokerName: string;
    commercialName: string | null;
    creci: string | null;
  }>;
  waitlistCount?: number;
}

export interface BuildingData {
  id: string;
  name: string;
  address: string;
  number: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipcode: string | null;
  latitude: number | null;
  longitude: number | null;
  totalFloors: number | null;
  unitsPerFloor: number | null;
  towers: string | null;
  hasPool?: boolean | null;
  hasGym?: boolean | null;
  hasPartyHall?: boolean | null;
  hasElevator?: boolean | null;
  hasPetSpace?: boolean | null;
  hasBarbecue?: boolean | null;
  verifiedByAdmin?: boolean;
  externalId?: string | null;
  source?: string | null;
  condoType?: string | null;
  geoValidationStatus?: string | null;
  geoConfidence?: number | null;
  geoContributorsCount?: number | null;
}

interface BuildingSelectorProps {
  selectedBuildingId: string | null;
  initialBuilding?: BuildingData | null;
  unitNumber: string;
  tower: string;
  floor: string;
  onSelectBuilding: (building: BuildingData | null) => void;
  onChangeUnitNumber: (val: string) => void;
  onChangeTower: (val: string) => void;
  onChangeFloor: (val: string) => void;
  onSlotInfoChange?: (info: SlotInfoData | null) => void;
  isEditing?: boolean;
}

export default function BuildingSelector({
  selectedBuildingId,
  initialBuilding,
  unitNumber,
  tower,
  floor,
  onSelectBuilding,
  onChangeUnitNumber,
  onChangeTower,
  onChangeFloor,
  onSlotInfoChange,
  isEditing = false,
}: BuildingSelectorProps) {
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingData | null>(initialBuilding || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BuildingData[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Status de Vagas e Preço Compartilhado da Unidade Selecionada
  const [slotInfo, setSlotInfo] = useState<SlotInfoData | null>(null);
  const [loadingSlot, setLoadingSlot] = useState(false);

  useEffect(() => {
    if (!selectedBuildingId || !unitNumber.trim()) {
      setSlotInfo(null);
      onSlotInfoChange?.(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingSlot(true);
      try {
        const query = new URLSearchParams({
          unitNumber: unitNumber.trim(),
          ...(tower.trim() ? { tower: tower.trim() } : {}),
        });
        const res = await fetch(`/api/buildings/${selectedBuildingId}/units?${query.toString()}`);
        if (res.ok) {
          const data: SlotInfoData = await res.json();
          setSlotInfo(data);
          onSlotInfoChange?.(data);
        } else {
          setSlotInfo(null);
          onSlotInfoChange?.(null);
        }
      } catch (err) {
        console.error('Erro ao consultar vagas da unidade:', err);
        setSlotInfo(null);
        onSlotInfoChange?.(null);
      } finally {
        setLoadingSlot(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [selectedBuildingId, unitNumber, tower]);

  // Modal de cadastro colaborativo de novo edifício
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Campos do novo edifício
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newNeighborhood, setNewNeighborhood] = useState('');
  const [newCity, setNewCity] = useState('Criciúma');
  const [newState, setNewState] = useState('SC');
  const [newZipcode, setNewZipcode] = useState('');
  const [newLat, setNewLat] = useState<number | null>(-28.6775);
  const [newLng, setNewLng] = useState<number | null>(-49.3700);
  const [newFloors, setNewFloors] = useState('');
  const [newTowers, setNewTowers] = useState('');
  const [newHasElevator, setNewHasElevator] = useState(false);
  const [newHasPool, setNewHasPool] = useState(false);
  const [newHasGym, setNewHasGym] = useState(false);
  const [newHasPartyHall, setNewHasPartyHall] = useState(false);
  const [newHasPetSpace, setNewHasPetSpace] = useState(false);
  const [newHasBarbecue, setNewHasBarbecue] = useState(false);

  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Estados de Validação Colaborativa de Localização (Etapa H)
  const [showGeoModal, setShowGeoModal] = useState(false);
  const [geoSubmitting, setGeoSubmitting] = useState(false);
  const [geoFeedback, setGeoFeedback] = useState<{ type: 'success' | 'warning' | 'error' | 'info'; text: string } | null>(null);
  const [geoSkipped, setGeoSkipped] = useState(false);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Busca edifícios com debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/buildings?search=${encodeURIComponent(searchQuery.trim())}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.buildings || []);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error('Erro ao buscar edifícios:', err);
      } finally {
        setSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Se o componente receber initialBuilding (em modo edição)
  useEffect(() => {
    if (initialBuilding) {
      setSelectedBuilding(initialBuilding);
    }
  }, [initialBuilding]);

  function handlePickBuilding(b: BuildingData) {
    setSelectedBuilding(b);
    onSelectBuilding(b);
    setShowDropdown(false);
    setSearchQuery('');
    setGeoFeedback(null);
    setGeoSkipped(false);
  }

  function handleClearBuilding() {
    setSelectedBuilding(null);
    onSelectBuilding(null);
    setGeoFeedback(null);
    setGeoSkipped(false);
  }

  async function handleOneClickConfirm() {
    if (!selectedBuilding || selectedBuilding.latitude === null || selectedBuilding.longitude === null) return;
    setGeoSubmitting(true);
    try {
      const res = await fetch(`/api/buildings/${selectedBuilding.id}/location-contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: selectedBuilding.latitude,
          longitude: selectedBuilding.longitude,
          contributionType: 'CONFIRMED_EXISTING',
          source: 'BROKER_MAP_PIN',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setGeoFeedback({
          type: data.building?.geoValidationStatus === 'DIVERGENT' ? 'warning' : 'success',
          text: data.message || 'Localização confirmada com sucesso!',
        });
        if (data.building) {
          const updated = {
            ...selectedBuilding,
            geoValidationStatus: data.building.geoValidationStatus,
            geoConfidence: data.building.geoConfidence,
            geoContributorsCount: data.building.geoContributorsCount,
          };
          setSelectedBuilding(updated);
          onSelectBuilding(updated);
        }
      } else {
        setGeoFeedback({
          type: 'error',
          text: data.error || 'Erro ao confirmar localização.',
        });
      }
    } catch (err: any) {
      setGeoFeedback({
        type: 'error',
        text: err.message || 'Erro de conexão ao confirmar localização.',
      });
    } finally {
      setGeoSubmitting(false);
    }
  }

  async function handleConfirmGeoPin(lat: number, lng: number) {
    if (!selectedBuilding) return;
    setGeoSubmitting(true);
    try {
      const isNew = selectedBuilding.latitude === null || selectedBuilding.longitude === null;
      const isAdjustment = !isNew && (
        Math.abs(selectedBuilding.latitude! - lat) > 0.00001 ||
        Math.abs(selectedBuilding.longitude! - lng) > 0.00001
      );
      const contributionType = isNew
        ? 'PROPOSED_NEW'
        : isAdjustment
        ? 'PROPOSED_ADJUSTMENT'
        : 'CONFIRMED_EXISTING';

      const res = await fetch(`/api/buildings/${selectedBuilding.id}/location-contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          contributionType,
          source: 'BROKER_MAP_PIN',
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setGeoFeedback({
          type: data.building?.geoValidationStatus === 'DIVERGENT' ? 'warning' : 'success',
          text: data.message || 'Contribuição registrada com sucesso!',
        });
        if (data.building) {
          const updated = {
            ...selectedBuilding,
            latitude: data.building.latitude ?? lat,
            longitude: data.building.longitude ?? lng,
            geoValidationStatus: data.building.geoValidationStatus,
            geoConfidence: data.building.geoConfidence,
            geoContributorsCount: data.building.geoContributorsCount,
          };
          setSelectedBuilding(updated);
          onSelectBuilding(updated);
        }
      } else {
        setGeoFeedback({
          type: 'error',
          text: data.error || 'Erro ao registrar contribuição.',
        });
      }
    } catch (err: any) {
      setGeoFeedback({
        type: 'error',
        text: err.message || 'Erro de comunicação ao registrar localização.',
      });
    } finally {
      setGeoSubmitting(false);
      setShowGeoModal(false);
    }
  }

  async function handleSkipGeo() {
    if (!selectedBuilding) return;
    setGeoSkipped(true);
    setGeoFeedback({
      type: 'info',
      text: 'Confirmação pulada. Você pode prosseguir com o cadastro do apartamento normalmente.',
    });
    try {
      await fetch(`/api/buildings/${selectedBuilding.id}/location-contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contributionType: 'SKIPPED',
        }),
      });
    } catch {
      // Ignora erro no skip
    }
  }

  function handleOpenCreateModal() {
    setNewName(searchQuery.trim());
    setNewAddress('');
    setNewNumber('');
    setNewNeighborhood('');
    setNewCity('Criciúma');
    setNewState('SC');
    setNewZipcode('');
    setNewLat(-28.6775);
    setNewLng(-49.3700);
    setNewFloors('');
    setNewTowers('');
    setNewHasElevator(false);
    setNewHasPool(false);
    setNewHasGym(false);
    setNewHasPartyHall(false);
    setNewHasPetSpace(false);
    setNewHasBarbecue(false);
    setCreateError(null);
    setShowDropdown(false);
    setShowCreateModal(true);
  }

  async function handleSaveNewBuilding(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);

    if (!newName.trim()) {
      setCreateError('Informe o nome do edifício.');
      return;
    }
    if (!newAddress.trim()) {
      setCreateError('Informe a rua/endereço do edifício.');
      return;
    }
    if (!newNeighborhood.trim()) {
      setCreateError('Informe o bairro do edifício.');
      return;
    }
    if (newLat === null || newLng === null) {
      setCreateError('Confirme a localização do edifício no mapa.');
      return;
    }

    setCreating(true);
    try {
      const towersArray = newTowers.trim()
        ? newTowers.split(',').map((t) => t.trim()).filter(Boolean)
        : null;

      const payload = {
        name: newName.trim(),
        address: newAddress.trim(),
        number: newNumber.trim() || null,
        neighborhood: newNeighborhood.trim(),
        city: newCity.trim(),
        state: newState.trim(),
        zipcode: newZipcode.trim() || null,
        latitude: newLat,
        longitude: newLng,
        totalFloors: newFloors ? parseInt(newFloors, 10) : null,
        towers: towersArray,
        hasElevator: newHasElevator,
        hasPool: newHasPool,
        hasGym: newHasGym,
        hasPartyHall: newHasPartyHall,
        hasPetSpace: newHasPetSpace,
        hasBarbecue: newHasBarbecue,
      };

      const res = await fetch('/api/buildings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao cadastrar edifício.');
      }

      const createdBuilding: BuildingData = data.building;
      setSelectedBuilding(createdBuilding);
      onSelectBuilding(createdBuilding);
      setShowCreateModal(false);
    } catch (err: any) {
      setCreateError(err.message || 'Falha ao salvar edifício.');
    } finally {
      setCreating(false);
    }
  }

  // Identifica torres disponíveis no edifício selecionado
  let parsedTowers: string[] = [];
  if (selectedBuilding?.towers) {
    try {
      parsedTowers = JSON.parse(selectedBuilding.towers);
    } catch {
      parsedTowers = [];
    }
  }

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-light)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={20} color="var(--color-primary)" />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
            Edifício Residencial e Unidade
          </h3>
        </div>
        <span style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600, backgroundColor: '#DCFCE7', padding: '3px 8px', borderRadius: '999px' }}>
          Fase 2 • Ponto 25
        </span>
      </div>

      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
        Vincule este apartamento ao edifício residencial correspondente. Os dados compartilhados de localização e comodidades do condomínio são preenchidos automaticamente.
      </p>

      {/* Edifício Selecionado */}
      {selectedBuilding ? (
        <div
          style={{
            backgroundColor: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#DCFCE7',
                  color: '#166534',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Building2 size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#111827' }}>
                    {selectedBuilding.name}
                  </h4>
                  {selectedBuilding.verifiedByAdmin ? (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        backgroundColor: '#DCFCE7',
                        color: '#166534',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <CheckCircle2 size={12} />
                      <span>Verificado</span>
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        backgroundColor: '#FEF3C7',
                        color: '#92400E',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Clock size={12} />
                      <span>Colaborativo</span>
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.80rem', color: '#4B5563', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={13} color="#6B7280" />
                  <span>
                    {selectedBuilding.address}{selectedBuilding.number ? `, ${selectedBuilding.number}` : ''} • {selectedBuilding.neighborhood}, {selectedBuilding.city}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClearBuilding}
              style={{
                background: 'none',
                border: 'none',
                color: '#991B1B',
                fontSize: '0.80rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 8px',
                textDecoration: 'underline',
              }}
            >
              Alterar edifício
            </button>
          </div>

          {/* Comodidades compartilhadas herdadas do edifício */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '4px', borderTop: '1px solid #DCFCE7' }}>
            {selectedBuilding.hasElevator && (
              <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#FFFFFF', color: '#166534', fontWeight: 600, border: '1px solid #BBF7D0' }}>
                Elevador
              </span>
            )}
            {selectedBuilding.hasPool && (
              <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#FFFFFF', color: '#166534', fontWeight: 600, border: '1px solid #BBF7D0' }}>
                Piscina
              </span>
            )}
            {selectedBuilding.hasGym && (
              <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#FFFFFF', color: '#166534', fontWeight: 600, border: '1px solid #BBF7D0' }}>
                Academia
              </span>
            )}
            {selectedBuilding.hasPartyHall && (
              <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#FFFFFF', color: '#166534', fontWeight: 600, border: '1px solid #BBF7D0' }}>
                Salão de Festas
              </span>
            )}
            {selectedBuilding.hasPetSpace && (
              <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#FFFFFF', color: '#166534', fontWeight: 600, border: '1px solid #BBF7D0' }}>
                Espaço Pet
              </span>
            )}
            {selectedBuilding.hasBarbecue && (
              <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: '6px', backgroundColor: '#FFFFFF', color: '#166534', fontWeight: 600, border: '1px solid #BBF7D0' }}>
                Churrasqueira coletiva
              </span>
            )}
          </div>

          {/* Validação Colaborativa de Localização (Etapa H) */}
          <div
            style={{
              marginTop: '8px',
              padding: '12px 14px',
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E5E7EB',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={15} color="#1E4620" />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1F2937' }}>
                  Localização Geográfica do Edifício
                </span>
              </div>

              {/* Badges de Status Geográfico */}
              {selectedBuilding.geoValidationStatus === 'ADMIN_VALIDATED' ? (
                <span style={{ fontSize: '0.70rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#DCFCE7', color: '#166534', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Lock size={11} />
                  <span>Validada Oficial (Admin)</span>
                </span>
              ) : selectedBuilding.geoValidationStatus === 'MULTI_BROKER_CONFIRMED' ? (
                <span style={{ fontSize: '0.70rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#ECFDF5', color: '#047857', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #A7F3D0' }}>
                  <Users size={11} />
                  <span>Confirmada por Parceiros</span>
                </span>
              ) : selectedBuilding.geoValidationStatus === 'SINGLE_BROKER_CONFIRMED' ? (
                <span style={{ fontSize: '0.70rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#EFF6FF', color: '#1D4ED8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={11} />
                  <span>Confirmada por 1 Corretor</span>
                </span>
              ) : selectedBuilding.geoValidationStatus === 'DIVERGENT' ? (
                <span style={{ fontSize: '0.70rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#FEF3C7', color: '#B45309', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #FDE68A' }}>
                  <AlertTriangle size={11} />
                  <span>Divergência em Análise</span>
                </span>
              ) : selectedBuilding.geoValidationStatus === 'ESTIMATED' ? (
                <span style={{ fontSize: '0.70rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#FFF7ED', color: '#C2410C', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={11} />
                  <span>Estimativa Aproximada</span>
                </span>
              ) : (
                <span style={{ fontSize: '0.70rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', backgroundColor: '#F3F4F6', color: '#4B5563', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>⚪ Localização Pendente</span>
                </span>
              )}
            </div>

            {/* Descrição e feedback contextual */}
            <div style={{ fontSize: '0.76rem', color: '#4B5563', marginBottom: '10px', lineHeight: 1.4 }}>
              {selectedBuilding.geoValidationStatus === 'ADMIN_VALIDATED' ? (
                <span>As coordenadas deste edifício foram homologadas pela administração. Você pode sugerir um ajuste caso identifique melhorias de precisão.</span>
              ) : selectedBuilding.geoValidationStatus === 'MULTI_BROKER_CONFIRMED' ? (
                <span>Ponto no mapa confirmado por múltiplos corretores parceiros com tolerância consistente.</span>
              ) : selectedBuilding.geoValidationStatus === 'SINGLE_BROKER_CONFIRMED' ? (
                <span>Ponto preliminar indicado por 1 corretor. Ao confirmar, você eleva a confiança deste edifício para toda a rede.</span>
              ) : selectedBuilding.geoValidationStatus === 'DIVERGENT' ? (
                <span style={{ color: '#92400E' }}>Foram registradas indicações divergentes de localização. Ajude a esclarecer marcando o ponto exato no mapa.</span>
              ) : selectedBuilding.latitude !== null && selectedBuilding.longitude !== null ? (
                <span>Coordenadas estimadas ({selectedBuilding.latitude.toFixed(5)}, {selectedBuilding.longitude.toFixed(5)}). Confirme ou ajuste para o endereço exato.</span>
              ) : (
                <span>Edifício cadastrado sem coordenadas geográficas. Ao posicionar o pin no mapa, você torna este edifício visível em pesquisas de mapa com anúncios ativos.</span>
              )}
            </div>

            {/* Mensagem de Feedback da Ação */}
            {geoFeedback && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  marginBottom: '10px',
                  fontSize: '0.76rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor:
                    geoFeedback.type === 'success'
                      ? '#F0FDF4'
                      : geoFeedback.type === 'warning'
                      ? '#FFFBEB'
                      : geoFeedback.type === 'info'
                      ? '#EFF6FF'
                      : '#FEF2F2',
                  color:
                    geoFeedback.type === 'success'
                      ? '#166534'
                      : geoFeedback.type === 'warning'
                      ? '#92400E'
                      : geoFeedback.type === 'info'
                      ? '#1E40AF'
                      : '#991B1B',
                  border: `1px solid ${
                    geoFeedback.type === 'success'
                      ? '#BBF7D0'
                      : geoFeedback.type === 'warning'
                      ? '#FDE68A'
                      : geoFeedback.type === 'info'
                      ? '#BFDBFE'
                      : '#FECACA'
                  }`,
                }}
              >
                {geoFeedback.type === 'success' && <CheckCircle2 size={13} />}
                {geoFeedback.type === 'warning' && <AlertTriangle size={13} />}
                {geoFeedback.type === 'info' && <Info size={13} />}
                {geoFeedback.type === 'error' && <AlertCircle size={13} />}
                <span>{geoFeedback.text}</span>
              </div>
            )}

            {/* Ações interativas de colaboração */}
            {!geoSkipped && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {selectedBuilding.latitude !== null && selectedBuilding.longitude !== null ? (
                  <>
                    <button
                      type="button"
                      onClick={handleOneClickConfirm}
                      disabled={geoSubmitting}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        backgroundColor: '#1E4620',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: geoSubmitting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        opacity: geoSubmitting ? 0.7 : 1,
                      }}
                    >
                      {geoSubmitting ? <Loader2 size={12} className="spin" /> : <Check size={12} />}
                      <span>Confirmar Localização Correta</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowGeoModal(true)}
                      disabled={geoSubmitting}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        backgroundColor: '#F3F4F6',
                        color: '#374151',
                        border: '1px solid #D1D5DB',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: geoSubmitting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <MapPin size={12} />
                      <span>Ajustar Pin no Mapa</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSkipGeo}
                      disabled={geoSubmitting}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: 'none',
                        color: '#6B7280',
                        border: 'none',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      Não sei confirmar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowGeoModal(true)}
                      disabled={geoSubmitting}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        backgroundColor: '#1E4620',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: geoSubmitting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <MapPin size={12} />
                      <span>Indicar Posição no Mapa</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSkipGeo}
                      disabled={geoSubmitting}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: 'none',
                        color: '#6B7280',
                        border: 'none',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      Não sei confirmar agora (pular)
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Busca ou Cadastro de Edifício */
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, marginBottom: '6px' }}>
            Pesquisar Edifício Existente
          </label>
          <div style={{ position: 'relative' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Digite o nome do edifício ou condomínio (ex: Solar das Acácias)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setShowDropdown(true);
              }}
              style={{
                width: '100%',
                padding: '10px 14px 10px 38px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-subtle)',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
            {searching && (
              <Loader2
                size={16}
                className="spin"
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
            )}
          </div>

          {/* Dropdown de Resultados */}
          {showDropdown && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '4px',
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid #D1D5DB',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                zIndex: 50,
                maxHeight: '280px',
                overflowY: 'auto',
              }}
            >
              {searchResults.length > 0 ? (
                <div>
                  <div style={{ padding: '8px 12px', fontSize: '0.74rem', color: '#6B7280', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #F3F4F6' }}>
                    Edifícios encontrados ({searchResults.length})
                  </div>
                  {searchResults.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => handlePickBuilding(b)}
                      style={{
                        padding: '10px 14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid #F3F4F6',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827' }}>
                            {b.name}
                          </span>
                          {b.externalId && (
                            <span style={{ fontSize: '0.68rem', backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                              🏛️ Cód: {b.externalId}
                            </span>
                          )}
                          {b.verifiedByAdmin && (
                            <span style={{ fontSize: '0.68rem', backgroundColor: '#DCFCE7', color: '#166534', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                              ✓ Oficial
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: '2px' }}>
                          {b.address}{b.number ? `, ${b.number}` : ''} • {b.neighborhood}
                        </div>
                      </div>
                      <button
                        type="button"
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#DCFCE7',
                          color: '#166534',
                          border: 'none',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                        }}
                      >
                        Selecionar
                      </button>
                    </div>
                  ))}
                </div>
              ) : searchQuery.trim().length >= 2 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#6B7280' }}>
                  <div style={{ fontSize: '0.84rem' }}>
                    Nenhum edifício encontrado para "<strong>{searchQuery}</strong>".
                  </div>
                </div>
              ) : null}

              {/* Opção para cadastrar novo edifício */}
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#F0FDF4',
                  borderTop: '1px solid #BBF7D0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
                onClick={handleOpenCreateModal}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 700, fontSize: '0.84rem' }}>
                  <Plus size={16} />
                  <span>Cadastrar novo edifício: "{searchQuery || 'Novo Edifício'}"</span>
                </div>
                <span style={{ fontSize: '0.76rem', color: '#15803D', fontWeight: 600 }}>
                  Criar agora →
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Identificação da Unidade (Apartamento, Torre e Andar) */}
      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            Identificação da Unidade no Edifício
          </label>
          <span style={{ fontSize: '0.74rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Shield size={12} color="#166534" />
            <span>Dados privados e confidenciais</span>
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
          {/* Torre / Bloco */}
          <div>
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 600, marginBottom: '4px' }}>
              Torre ou Bloco
            </label>
            {parsedTowers.length > 0 ? (
              <select
                value={tower}
                onChange={(e) => onChangeTower(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-subtle)',
                  fontSize: '0.86rem',
                }}
              >
                <option value="">Não aplicável / Torre única</option>
                {parsedTowers.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="Ex: Torre A ou Bloco 1"
                value={tower}
                onChange={(e) => onChangeTower(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--bg-subtle)',
                  fontSize: '0.86rem',
                }}
              />
            )}
          </div>

          {/* Andar */}
          <div>
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 600, marginBottom: '4px' }}>
              Andar
            </label>
            <input
              type="number"
              min="0"
              placeholder="Ex: 5"
              value={floor}
              onChange={(e) => onChangeFloor(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-subtle)',
                fontSize: '0.86rem',
              }}
            />
          </div>

          {/* Unidade / Apartamento */}
          <div>
            <label style={{ display: 'block', fontSize: '0.80rem', fontWeight: 600, marginBottom: '4px' }}>
              Número da Unidade / Apt.
            </label>
            <input
              type="text"
              placeholder="Ex: 502 ou 502-B"
              value={unitNumber}
              onChange={(e) => onChangeUnitNumber(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                backgroundColor: 'var(--bg-subtle)',
                fontSize: '0.86rem',
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#6B7280' }}>
          <Info size={13} color="#9CA3AF" />
          <span>
            A identificação exata (número da unidade e torre) é sigilosa e nunca é exibida nos compartilhamentos públicos ou para corretores parceiros.
          </span>
        </div>

        {/* Feedback visual de Vagas e Preço Compartilhado da Unidade */}
        {loadingSlot && (
          <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#6B7280' }}>
            <Loader2 size={16} className="animate-spin" />
            <span>Consultando disponibilidade e vagas da unidade no condomínio...</span>
          </div>
        )}

        {!loadingSlot && slotInfo && (
          <div style={{ marginTop: '14px' }}>
            {/* Caso 1: Corretor logado já possui anúncio ativo nesta unidade */}
            {slotInfo.userHasActiveListing ? (
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#FEF2F2',
                  border: '1.5px solid #F87171',
                  color: '#991B1B',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '0.90rem' }}>
                  <AlertCircle size={18} color="#DC2626" />
                  <span>Você já possui um anúncio ativo para esta unidade</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#B91C1C', lineHeight: 1.4 }}>
                  Cada corretor pode manter apenas um anúncio ativo por unidade física no Área Nobre. Para atualizar seu imóvel existente, edite-o em sua carteira.
                </p>
              </div>
            ) : slotInfo.isFull ? (
              /* Caso 2: 3 vagas ocupadas (Limite atingido) */
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#FFFBEB',
                  border: '1.5px solid #FCD34D',
                  color: '#92400E',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '0.90rem' }}>
                    <AlertTriangle size={18} color="#D97706" />
                    <span>Limite de 3 corretores atingido (Vagas esgotadas)</span>
                  </div>
                  <span style={{ fontSize: '0.74rem', padding: '2px 8px', borderRadius: '12px', backgroundColor: '#FEF3C7', color: '#B45309', fontWeight: 700 }}>
                    3 de 3 vagas preenchidas
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#B45309', lineHeight: 1.45 }}>
                  Este imóvel já possui três corretores anunciantes. Você pode entrar na lista de espera e será avisado quando surgir uma oportunidade.
                </p>
                {slotInfo.userHasWaitlist && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.80rem', color: '#065F46', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
                    <CheckCircle2 size={14} color="#059669" />
                    <span>Você já está inscrito nesta lista de espera{slotInfo.userWaitlistPosition ? ` (${slotInfo.userWaitlistPosition}º na fila)` : ''}.</span>
                  </div>
                )}
                {slotInfo.otherBrokers.length > 0 && (
                  <div style={{ fontSize: '0.76rem', color: '#78350F', marginTop: '2px' }}>
                    <strong>Corretores com anúncios ativos:</strong>{' '}
                    {slotInfo.otherBrokers.map((b) => b.commercialName || b.brokerName).join(', ')}
                  </div>
                )}
              </div>
            ) : slotInfo.activeListingsCount > 0 ? (
              /* Caso 3: Imóvel Compartilhado (Vaga 2 ou 3 disponível) */
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#EFF6FF',
                  border: '1.5px solid #93C5FD',
                  color: '#1E40AF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '0.90rem' }}>
                    <Users size={18} color="#2563EB" />
                    <span>Imóvel Compartilhado — Vaga {slotInfo.activeListingsCount + 1} de 3</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '12px', backgroundColor: '#DBEAFE', color: '#1D4ED8', fontWeight: 700 }}>
                    {slotInfo.availableSlots} {slotInfo.availableSlots === 1 ? 'vaga restante' : 'vagas restantes'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '0.82rem', color: '#1E3A8A' }}>Preço único compartilhado:</span>
                  <strong style={{ fontSize: '1.1rem', color: '#1E40AF' }}>
                    R$ {slotInfo.sharedPrice ? slotInfo.sharedPrice.toLocaleString('pt-BR') : 'Consulte'}
                  </strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.79rem', color: '#2563EB', lineHeight: 1.4 }}>
                  Definido pelo anúncio principal. Todos os anúncios desta unidade devem apresentar obrigatoriamente o mesmo valor de venda. O campo de preço foi ajustado automaticamente.
                </p>
                {slotInfo.otherBrokers.length > 0 && (
                  <div style={{ fontSize: '0.76rem', color: '#1E40AF', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Shield size={13} color="#2563EB" />
                    <span>
                      <strong>Corretor principal:</strong>{' '}
                      {slotInfo.otherBrokers.find((b) => b.isPrimary)?.commercialName || slotInfo.otherBrokers.find((b) => b.isPrimary)?.brokerName || 'Ativo'}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              /* Caso 4: Primeiro anúncio da unidade (Anúncio Principal) */
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  backgroundColor: '#ECFDF5',
                  border: '1.5px solid #6EE7B7',
                  color: '#065F46',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '0.90rem' }}>
                    <Sparkles size={18} color="#059669" />
                    <span>Primeiro anúncio desta unidade (Anúncio Principal)</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '12px', backgroundColor: '#D1FAE5', color: '#047857', fontWeight: 700 }}>
                    3 vagas disponíveis
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.80rem', color: '#047857', lineHeight: 1.4 }}>
                  Você será o corretor do <strong>Anúncio Principal</strong> desta unidade física. O valor que você cadastrar no formulário definirá o <strong>preço compartilhado de referência</strong> para os próximos corretores.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Colaborativo de Cadastro de Novo Edifício */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={20} color="#16A34A" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#111827' }}>
                  Cadastrar Novo Edifício Residencial
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveNewBuilding} style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {createError && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', fontSize: '0.84rem' }}>
                  {createError}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '6px' }}>
                  Nome do Edifício *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Edifício Solar das Acácias"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '6px' }}>
                    Logradouro / Rua *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Rua Coronel Pedro Benedet"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '6px' }}>
                    Número
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 350"
                    value={newNumber}
                    onChange={(e) => setNewNumber(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '6px' }}>
                    Bairro *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Centro"
                    value={newNeighborhood}
                    onChange={(e) => setNewNeighborhood(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '6px' }}>
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.88rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: '6px' }}>
                    CEP
                  </label>
                  <input
                    type="text"
                    placeholder="88801-250"
                    value={newZipcode}
                    onChange={(e) => setNewZipcode(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.88rem' }}
                  />
                </div>
              </div>

              {/* Pin no Mapa */}
              <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#111827' }}>
                    Localização Inicial do Edifício
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#6B7280' }}>
                    {newLat && newLng ? `Lat: ${newLat.toFixed(5)}, Lng: ${newLng.toFixed(5)}` : 'Não localizada'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLocationPicker(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.80rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <MapPin size={13} color="#16A34A" />
                  <span>Ajustar Pin</span>
                </button>
              </div>

              {/* Estrutura básica */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                    Total de Andares (opcional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ex: 10"
                    value={newFloors}
                    onChange={(e) => setNewFloors(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.86rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                    Torres / Blocos (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Torre A, Torre B"
                    value={newTowers}
                    onChange={(e) => setNewTowers(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.86rem' }}
                  />
                </div>
              </div>

              {/* Comodidades compartilhadas */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Comodidades do Edifício (opcional)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.80rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={newHasElevator} onChange={(e) => setNewHasElevator(e.target.checked)} />
                    <span>Elevador</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.80rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={newHasPool} onChange={(e) => setNewHasPool(e.target.checked)} />
                    <span>Piscina</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.80rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={newHasGym} onChange={(e) => setNewHasGym(e.target.checked)} />
                    <span>Academia</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.80rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={newHasPartyHall} onChange={(e) => setNewHasPartyHall(e.target.checked)} />
                    <span>Salão de festas</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.80rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={newHasPetSpace} onChange={(e) => setNewHasPetSpace(e.target.checked)} />
                    <span>Espaço Pet</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.80rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={newHasBarbecue} onChange={(e) => setNewHasBarbecue(e.target.checked)} />
                    <span>Churrasqueira</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#374151',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    backgroundColor: '#16A34A',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    cursor: creating ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {creating && <Loader2 size={16} className="spin" />}
                  <span>{creating ? 'Salvando...' : 'Cadastrar e Selecionar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Mapa para Novo Edifício */}
      {showLocationPicker && (
        <LocationPickerModal
          isOpen={showLocationPicker}
          initialLat={newLat}
          initialLng={newLng}
          addressToGeocode={`${newAddress || ''}${newNumber ? `, ${newNumber}` : ''}, ${newNeighborhood || ''}, ${newCity || 'Criciúma'}, ${newState || 'SC'}`}
          onConfirm={(lat, lng) => {
            setNewLat(lat);
            setNewLng(lng);
            setShowLocationPicker(false);
          }}
          onCancel={() => setShowLocationPicker(false)}
        />
      )}

      {/* Modal de Validação / Ajuste de Localização de Edifício Existente (Etapa H) */}
      {showGeoModal && selectedBuilding && (
        <LocationPickerModal
          isOpen={showGeoModal}
          initialLat={selectedBuilding.latitude ?? -28.6775}
          initialLng={selectedBuilding.longitude ?? -49.3700}
          title={`Confirmar Localização: ${selectedBuilding.name}`}
          addressToGeocode={`${selectedBuilding.address || ''}${selectedBuilding.number ? `, ${selectedBuilding.number}` : ''}, ${selectedBuilding.neighborhood || ''}, ${selectedBuilding.city || 'Criciúma'}, ${selectedBuilding.state || 'SC'}`}
          onConfirm={(lat, lng) => handleConfirmGeoPin(lat, lng)}
          onCancel={() => setShowGeoModal(false)}
        />
      )}
    </div>
  );
}

