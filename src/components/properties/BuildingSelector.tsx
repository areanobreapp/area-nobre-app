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
} from 'lucide-react';
import dynamic from 'next/dynamic';

const LocationPickerModal = dynamic(() => import('@/components/LocationPickerModal'), { ssr: false });

export interface BuildingData {
  id: string;
  name: string;
  address: string;
  number: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipcode: string | null;
  latitude: number;
  longitude: number;
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
}: BuildingSelectorProps) {
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingData | null>(initialBuilding || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BuildingData[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

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
  }

  function handleClearBuilding() {
    setSelectedBuilding(null);
    onSelectBuilding(null);
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
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827' }}>
                          {b.name}
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
    </div>
  );
}

