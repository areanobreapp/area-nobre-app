'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Layers,
  Building2,
  Save,
  Loader2,
  AlertTriangle,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ShieldAlert,
  Info,
} from 'lucide-react';

export interface BlockFloorPlan {
  floor: number;
  label: string;
  plannedUnitsCount: number;
  unitTypeHint?: string;
}

interface BlockModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (block: any) => void;
  developmentId: string;
  initialBlock?: any;
}

// 1. Lista de Nomes Predefinidos Solicitada na Especificação
export const PRESET_FLOOR_LABELS = [
  'Subsolo',
  'Garagem',
  'Térreo',
  'Térreo + Salas',
  'Térreo + Unidades',
  'Salão de Festas',
  'Área de Lazer',
  'Andar Tipo',
  '1º Andar',
  'Cobertura',
  'Cobertura Duplex',
  'Área Técnica',
  'Personalizado',
];

export function getDefaultFloorLabel(floor: number): string {
  if (floor === 0) return 'Térreo';
  if (floor < 0) return `${Math.abs(floor)}º Subsolo`;
  return `${floor}º Andar`;
}

// Verifica se uma identificação é especial (nunca deve ser sobrescrita por numeração automática)
export function isSpecialLabel(label: string): boolean {
  if (!label) return false;
  const l = label.trim().toLowerCase();
  const specialKeywords = [
    'subsolo',
    'garagem',
    'térreo',
    'terreo',
    'salão de festas',
    'salao de festas',
    'área de lazer',
    'area de lazer',
    'lazer',
    'cobertura',
    'cobertura duplex',
    'área técnica',
    'area tecnica',
  ];
  return specialKeywords.some((kw) => l.includes(kw));
}

// Verifica se um rótulo é padrão/genérico e pode ser sequenciado
export function isReplaceableFloorLabel(label: string, floorNum: number): boolean {
  if (!label || !label.trim()) return true;
  const trimmed = label.trim().toLowerCase();
  if (trimmed === 'andar tipo') return true;
  if (/^\d+[º°]?\s*andar$/i.test(trimmed)) return true;
  if (trimmed === getDefaultFloorLabel(floorNum).toLowerCase()) return true;
  return false;
}

// Lógica de numeração sequencial automática
export function applySequentialFloorNumbering(
  currentFloors: BlockFloorPlan[],
  startIndex: number,
  startNumber: number
): BlockFloorPlan[] {
  const nextFloors = [...currentFloors];
  let currentNum = startNumber;

  for (let j = startIndex + 1; j < nextFloors.length; j++) {
    currentNum++;
    const target = nextFloors[j];

    // Se for pavimento especial (garagem, térreo, salão de festas, cobertura, área técnica), não modifica
    if (isSpecialLabel(target.label)) {
      continue;
    }

    // Se for pavimento com nome personalizado livre pelo usuário, não substitui
    if (!isReplaceableFloorLabel(target.label, target.floor)) {
      continue;
    }

    // Atualiza o pavimento sequencial
    nextFloors[j] = {
      ...target,
      label: `${currentNum}º Andar`,
    };
  }

  return nextFloors;
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

  // Floor distribution
  const [floors, setFloors] = useState<BlockFloorPlan[]>([]);
  const [registeredUnitsMap, setRegisteredUnitsMap] = useState<Record<number, number>>({});
  const [loadingUnits, setLoadingUnits] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carrega dados da torre e unidades já cadastradas para validação de segurança
  useEffect(() => {
    if (open) {
      setName(initialBlock?.name || '');
      setBlockType(initialBlock?.blockType || 'TOWER');
      setTotalFloors(initialBlock?.totalFloors ?? '');
      setUnitsPerFloor(initialBlock?.unitsPerFloor ?? '');
      setDisplayOrder(initialBlock?.displayOrder ?? 0);
      setError(null);

      // Carrega distribuição de pavimentos
      if (Array.isArray(initialBlock?.floorDistribution) && initialBlock.floorDistribution.length > 0) {
        setFloors(
          initialBlock.floorDistribution.map((item: any) => ({
            floor: typeof item.floor === 'number' ? item.floor : 1,
            label: item.label || getDefaultFloorLabel(item.floor ?? 1),
            plannedUnitsCount: typeof item.plannedUnitsCount === 'number' ? item.plannedUnitsCount : 0,
            unitTypeHint: item.unitTypeHint || '',
          }))
        );
      } else if (initialBlock?.totalFloors && Number(initialBlock.totalFloors) > 0) {
        // Se tem totalFloors mas não tem floorDistribution gravada, inicializa as linhas
        const count = Number(initialBlock.totalFloors);
        const defaultUnits = Number(initialBlock?.unitsPerFloor) || 0;
        const initialFloors: BlockFloorPlan[] = [];
        for (let i = 1; i <= count; i++) {
          initialFloors.push({
            floor: i,
            label: getDefaultFloorLabel(i),
            plannedUnitsCount: defaultUnits,
            unitTypeHint: 'APARTMENT',
          });
        }
        setFloors(initialFloors);
      } else {
        setFloors([]);
      }

      // Consulta unidades existentes deste bloco para proteger exclusão e capacidades mínimas
      if (initialBlock?.id && developmentId) {
        setLoadingUnits(true);
        fetch(`/api/admin/developments/${developmentId}/units?blockId=${initialBlock.id}&limit=500`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data) {
              const list = Array.isArray(data.units)
                ? data.units
                : Array.isArray(data.items)
                ? data.items
                : [];
              const counts: Record<number, number> = {};
              for (const u of list) {
                if (typeof u.floor === 'number') {
                  counts[u.floor] = (counts[u.floor] || 0) + 1;
                }
              }
              setRegisteredUnitsMap(counts);
            }
          })
          .catch((err) => console.warn('Erro ao consultar unidades existentes da torre:', err))
          .finally(() => setLoadingUnits(false));
      } else {
        setRegisteredUnitsMap({});
      }
    }
  }, [open, initialBlock, developmentId]);

  if (!open) return null;

  // Ajuste da quantidade de pavimentos preservando dados já existentes
  function handleTotalFloorsChange(val: string) {
    if (!val) {
      setTotalFloors('');
      return;
    }
    const targetCount = parseInt(val, 10);
    if (isNaN(targetCount) || targetCount < 0) return;
    setTotalFloors(targetCount);
    setError(null);

    const defaultUnits = Number(unitsPerFloor) || 0;

    // Se a tabela estiver vazia e targetCount > 0, cria os pavimentos iniciais
    if (floors.length === 0 && targetCount > 0) {
      const initial: BlockFloorPlan[] = [];
      for (let i = 1; i <= targetCount; i++) {
        initial.push({
          floor: i,
          label: getDefaultFloorLabel(i),
          plannedUnitsCount: defaultUnits,
          unitTypeHint: 'APARTMENT',
        });
      }
      setFloors(initial);
      return;
    }

    // Se já existem pavimentos:
    if (targetCount > floors.length) {
      // Aumentando: adiciona novos pavimentos preservando integralmente todos os anteriores
      const countToAdd = targetCount - floors.length;
      const maxFloor = floors.length > 0 ? Math.max(...floors.map((f) => f.floor)) : 0;

      // Descobre se há sequência de andares para continuar
      let lastNumberedVal = 0;
      for (const fl of floors) {
        const match = (fl.label || '').match(/^(\d+)[º°]?\s*andar$/i);
        if (match) {
          const n = parseInt(match[1], 10);
          if (n > lastNumberedVal) lastNumberedVal = n;
        }
      }

      const added: BlockFloorPlan[] = [];
      for (let i = 1; i <= countToAdd; i++) {
        const nextFloorNum = maxFloor + i;
        const label = lastNumberedVal > 0 ? `${lastNumberedVal + i}º Andar` : getDefaultFloorLabel(nextFloorNum);
        added.push({
          floor: nextFloorNum,
          label,
          plannedUnitsCount: defaultUnits,
          unitTypeHint: 'APARTMENT',
        });
      }
      setFloors((prev) => [...prev, ...added]);
    } else if (targetCount < floors.length) {
      // Reduzindo: verificar se os pavimentos excedentes (no fim da lista) possuem unidades cadastradas
      const excessFloors = floors.slice(targetCount);
      const hasStockInExcess = excessFloors.some((f) => (registeredUnitsMap[f.floor] || 0) > 0);

      if (hasStockInExcess) {
        setError(
          `Não é possível reduzir para ${targetCount} pavimentos porque existem pavimentos com unidades comerciais ativas no estoque entre os excedentes. Exclua ou transfira as unidades antes de reduzir a quantidade.`
        );
        return;
      }

      // Se nenhum tiver estoque no excesso, reduz preservando os primeiros targetCount
      setFloors((prev) => prev.slice(0, targetCount));
    }
  }

  // Atualizar campo de um pavimento
  function handleUpdateFloorRow(index: number, patch: Partial<BlockFloorPlan>) {
    setFloors((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  // Manipulação de texto manual do pavimento com detecção de sequência
  function handleFloorLabelChange(index: number, newText: string) {
    const match = newText.trim().match(/^(\d+)[º°]?\s*andar$/i);
    if (match) {
      const startNum = parseInt(match[1], 10);
      setFloors((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], label: newText };
        return applySequentialFloorNumbering(updated, index, startNum);
      });
    } else {
      handleUpdateFloorRow(index, { label: newText });
    }
  }

  // Seleção de opção predefinida
  function handlePresetSelect(index: number, selected: string) {
    if (!selected) return;

    if (selected === 'Personalizado') {
      const current = floors[index]?.label || '';
      if (isReplaceableFloorLabel(current, floors[index]?.floor ?? 0)) {
        handleUpdateFloorRow(index, { label: '' });
      }
      return;
    }

    const match = selected.match(/^(\d+)[º°]?\s*andar$/i);
    if (match) {
      const startNum = parseInt(match[1], 10);
      setFloors((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], label: selected };
        return applySequentialFloorNumbering(updated, index, startNum);
      });
      return;
    }

    // Demais opções predefinidas (Subsolo, Garagem, Térreo, Cobertura, etc.)
    handleUpdateFloorRow(index, { label: selected });
  }

  // Adicionar um pavimento individualmente continuando sequência quando aplicável
  function handleAddFloorRow() {
    const nextFloorNum = floors.length > 0 ? Math.max(...floors.map((f) => f.floor)) + 1 : 1;
    const defaultUnits = Number(unitsPerFloor) || 0;

    let suggestedLabel = getDefaultFloorLabel(nextFloorNum);

    // Verifica o maior número de andar já utilizado em pavimentos
    let lastNumberedFloorVal = 0;
    for (const fl of floors) {
      const match = (fl.label || '').match(/^(\d+)[º°]?\s*andar$/i);
      if (match) {
        const n = parseInt(match[1], 10);
        if (n > lastNumberedFloorVal) {
          lastNumberedFloorVal = n;
        }
      }
    }

    if (lastNumberedFloorVal > 0) {
      const lastFloor = floors[floors.length - 1];
      if (!lastFloor || !isSpecialLabel(lastFloor.label)) {
        suggestedLabel = `${lastNumberedFloorVal + 1}º Andar`;
      }
    }

    const newFloor: BlockFloorPlan = {
      floor: nextFloorNum,
      label: suggestedLabel,
      plannedUnitsCount: defaultUnits,
      unitTypeHint: 'APARTMENT',
    };

    setFloors((prev) => {
      const updated = [...prev, newFloor];
      setTotalFloors(updated.length);
      return updated;
    });
    setError(null);
  }

  // Mover pavimento para cima ou para baixo (não altera nomes personalizados)
  function handleMoveFloorRow(index: number, direction: 'up' | 'down') {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= floors.length) return;
    setFloors((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  }

  // Ordenar pavimentos por piso físico
  function handleSortFloors(order: 'asc' | 'desc') {
    setFloors((prev) => {
      return [...prev].sort((a, b) =>
        order === 'asc' ? a.floor - b.floor : b.floor - a.floor
      );
    });
  }

  // Remoção segura de pavimento: bloqueia se houver unidades cadastradas no piso
  function handleRemoveFloorRow(index: number) {
    const targetFloor = floors[index];
    const registeredCount = registeredUnitsMap[targetFloor.floor] || 0;

    if (registeredCount > 0) {
      setError(
        `Não é possível excluir o pavimento "${targetFloor.label || targetFloor.floor}" porque existem ${registeredCount} unidade(s) comercial(is) cadastrada(s) nele. Remova ou transfira as unidades antes de excluir o pavimento.`
      );
      return;
    }

    setFloors((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      setTotalFloors(updated.length);
      return updated;
    });
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Identificação do bloco / quadra é obrigatória.');
      return;
    }

    const isVertical = blockType !== 'QUADRA';

    // Validação de Capacidade Planejada vs Unidades Cadastradas (para Bloco Vertical)
    if (isVertical && floors.length > 0) {
      for (const fl of floors) {
        const registeredCount = registeredUnitsMap[fl.floor] || 0;
        const planned = Math.max(0, Number(fl.plannedUnitsCount) || 0);
        if (planned < registeredCount) {
          setError(
            `A capacidade do pavimento "${fl.label || fl.floor}" (${planned} un.) não pode ser inferior às ${registeredCount} unidades já cadastradas nele no estoque comercial.`
          );
          return;
        }
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      let payloadFloorDistribution: any = null;
      if (isVertical && floors.length > 0) {
        payloadFloorDistribution = floors.map((item) => ({
          floor: Number(item.floor),
          label: (item.label || getDefaultFloorLabel(Number(item.floor))).trim(),
          plannedUnitsCount: Math.max(0, Number(item.plannedUnitsCount) || 0),
          unitTypeHint: item.unitTypeHint?.trim() || undefined,
        }));
      }

      const payload = {
        name: name.trim(),
        blockType: isVertical ? (initialBlock?.blockType === 'BLOCO' ? 'BLOCO' : 'TOWER') : 'QUADRA',
        totalFloors: isVertical ? (floors.length > 0 ? floors.length : (totalFloors !== '' ? Number(totalFloors) : null)) : null,
        unitsPerFloor: unitsPerFloor !== '' ? Number(unitsPerFloor) : null,
        floorDistribution: isVertical ? payloadFloorDistribution : null,
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
        throw new Error(data.error || 'Erro ao salvar bloco/quadra.');
      }

      onSaved(data.block);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Falha ao salvar bloco/quadra.');
    } finally {
      setSubmitting(false);
    }
  }

  const totalPlannedUnits = floors.reduce(
    (acc, f) => acc + (Math.max(0, Number(f.plannedUnitsCount)) || 0),
    0
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.60)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 9999,
        backdropFilter: 'blur(3px)',
      }}
    >
      {/* Datalist nativo para autocomplete de identificação de pavimentos */}
      <datalist id="preset-floor-labels">
        {PRESET_FLOOR_LABELS.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>

      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '960px',
          maxHeight: '92vh',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header Fixo do Modal */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            backgroundColor: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
              <Layers size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                {isEditing ? 'Editar Bloco / Quadra' : 'Novo Bloco ou Quadra'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.80rem', color: '#6B7280' }}>
                Configuração individualizada de pavimentos, identificações e capacidade planejada
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: 'none',
              border: 'none',
              color: '#9CA3AF',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulário com Rolagem Vertical Principal Única */}
        <form
          onSubmit={handleSubmit}
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#FEF2F2',
                  color: '#991B1B',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  border: '1px solid #FECACA',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}
              >
                <AlertTriangle size={18} style={{ marginTop: '2px', flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Tipo de Estrutura: 2 Opções (Bloco Vertical ou Quadra Horizontal) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                Tipo de Estrutura <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button
                  type="button"
                  id="btn-blocktype-vertical"
                  onClick={() => setBlockType(initialBlock?.blockType === 'BLOCO' ? 'BLOCO' : 'TOWER')}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: blockType !== 'QUADRA' ? '2px solid #1E4620' : '1px solid #D1D5DB',
                    backgroundColor: blockType !== 'QUADRA' ? '#F0FDF4' : '#FFFFFF',
                    color: blockType !== 'QUADRA' ? '#1E4620' : '#374151',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={18} />
                    <span>Bloco (Vertical)</span>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#6B7280', fontWeight: 500 }}>
                    Edifícios com pavimentos, apartamentos, salas comerciais, studios e coberturas
                  </span>
                </button>

                <button
                  type="button"
                  id="btn-blocktype-horizontal"
                  onClick={() => setBlockType('QUADRA')}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: blockType === 'QUADRA' ? '2px solid #1E4620' : '1px solid #D1D5DB',
                    backgroundColor: blockType === 'QUADRA' ? '#F0FDF4' : '#FFFFFF',
                    color: blockType === 'QUADRA' ? '#1E4620' : '#374151',
                    fontSize: '0.86rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={18} />
                    <span>Quadra (Horizontal)</span>
                  </div>
                  <span style={{ fontSize: '0.74rem', color: '#6B7280', fontWeight: 500 }}>
                    Loteamentos e condomínios horizontais com quadras, lotes e casas
                  </span>
                </button>
              </div>
            </div>

            {blockType === 'QUADRA' ? (
              <>
                {/* Identificação da Quadra */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Identificação da Quadra <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    id="input-block-name"
                    required
                    placeholder="Ex: Quadra 04, Quadra A, Setor Sul ou Loteamento Fase 1"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      fontSize: '0.90rem',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Capacidade Planejada de Lotes / Casas */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                    Capacidade Planejada de Lotes / Casas (Opcional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="Ex: 24 lotes planejados"
                    value={unitsPerFloor}
                    onChange={(e) => setUnitsPerFloor(e.target.value ? parseInt(e.target.value, 10) : '')}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #D1D5DB',
                      fontSize: '0.90rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    fontSize: '0.82rem',
                    color: '#166534',
                    lineHeight: '1.4',
                    display: 'flex',
                    gap: '8px',
                  }}
                >
                  <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Empreendimento Horizontal:</strong> casas e lotes são vinculados diretamente a esta quadra, sem a necessidade de pavimentos. A capacidade informada serve como meta de planejamento e não cria unidades comerciais automaticamente.
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Campos do Bloco Vertical: Nome e Quantidade Inicial de Pavimentos */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                  {/* Nome do Bloco Vertical */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                      Nome do Bloco ou Torre <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      id="input-block-name"
                      required
                      placeholder="Ex: Bloco A, Torre Florença, Edifício Sul"
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

                  {/* Quantidade de Pavimentos */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                      Quantidade de Pavimentos
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="Ex: 8"
                      value={totalFloors}
                      onChange={(e) => handleTotalFloorsChange(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #D1D5DB',
                        fontSize: '0.88rem',
                        outline: 'none',
                        fontWeight: 600,
                      }}
                    />
                  </div>

                  {/* Unidades Padrão por Andar (Sugestão para novos pavimentos) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                      Unid./Andar (Sugestão)
                    </label>
                    <input
                      type="number"
                      min={0}
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

                {/* Tabela Direta com Todos os Pavimentos */}
                <div
                  style={{
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                    backgroundColor: '#FFFFFF',
                    overflow: 'hidden',
                  }}
                >
                  {/* Barra Superior da Tabela com Resumo e Ações Rápidas */}
                  <div
                    style={{
                      padding: '12px 16px',
                      backgroundColor: '#F9FAFB',
                      borderBottom: '1px solid #E5E7EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#1F2937' }}>
                        Pavimentos e Capacidade Individual
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#6B7280', display: 'block', marginTop: '2px' }}>
                        {floors.length > 0
                          ? `${floors.length} pavimento(s) configurado(s) • ${totalPlannedUnits} unidades planejadas no total`
                          : 'Informe a quantidade de pavimentos acima ou adicione manualmente.'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {floors.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleSortFloors('asc')}
                          title="Reordenar por ordem física crescente (Subsolo -> Térreo -> Cobertura)"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            backgroundColor: '#FFFFFF',
                            color: '#4B5563',
                            border: '1px solid #D1D5DB',
                            cursor: 'pointer',
                          }}
                        >
                          <ArrowUpDown size={13} />
                          <span>Ordenar Piso ↑</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleAddFloorRow}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          backgroundColor: '#ECFDF5',
                          color: '#065F46',
                          border: '1px solid #A7F3D0',
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={14} />
                        <span>Adicionar Pavimento</span>
                      </button>
                    </div>
                  </div>

                  {floors.length === 0 ? (
                    <div
                      style={{
                        padding: '32px 16px',
                        textAlign: 'center',
                        fontSize: '0.84rem',
                        color: '#6B7280',
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      Nenhum pavimento configurado ainda. Digite a <strong>Quantidade de Pavimentos</strong> acima ou clique em <strong>Adicionar Pavimento</strong>.
                    </div>
                  ) : (
                    /* Container responsivo para tabela (evita corte em mobile sem limitar a altura em desktop) */
                    <div style={{ overflowX: 'auto', width: '100%' }}>
                      <div style={{ minWidth: '780px' }}>
                        {/* Cabeçalho da Tabela com as 6 colunas aprovadas */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '75px 1fr 160px 110px 100px 80px',
                            gap: '10px',
                            padding: '8px 16px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: '#6B7280',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            backgroundColor: '#F3F4F6',
                            borderBottom: '1px solid #E5E7EB',
                            alignItems: 'center',
                          }}
                        >
                          <div>Piso / Nº</div>
                          <div>Nome / Identificação do Pavimento</div>
                          <div>Predefinições</div>
                          <div style={{ textAlign: 'center' }}>Capacidade</div>
                          <div style={{ textAlign: 'center' }}>No Estoque</div>
                          <div style={{ textAlign: 'center' }}>Ações</div>
                        </div>

                        {/* Linhas da Tabela (Fluem naturalmente na rolagem do modal) */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {floors.map((fl, idx) => {
                            const registeredCount = registeredUnitsMap[fl.floor] || 0;
                            const hasRegisteredUnits = registeredCount > 0;

                            return (
                              <div
                                key={idx}
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '75px 1fr 160px 110px 100px 80px',
                                  gap: '10px',
                                  alignItems: 'center',
                                  padding: '8px 16px',
                                  backgroundColor: hasRegisteredUnits ? '#F0FDF4' : idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                                  borderBottom: '1px solid #F3F4F6',
                                }}
                              >
                                {/* 1. Coluna Piso / Nº Físico (Editável) */}
                                <div>
                                  <input
                                    type="number"
                                    title="Piso físico (-2, -1, 0, 1, 2...)"
                                    value={fl.floor}
                                    onChange={(e) =>
                                      handleUpdateFloorRow(idx, {
                                        floor: parseInt(e.target.value || '0', 10),
                                      })
                                    }
                                    style={{
                                      width: '100%',
                                      padding: '6px 4px',
                                      fontSize: '0.82rem',
                                      fontWeight: 800,
                                      borderRadius: '6px',
                                      border: '1px solid #D1D5DB',
                                      textAlign: 'center',
                                      backgroundColor: '#FFFFFF',
                                    }}
                                  />
                                </div>

                                {/* 2. Coluna Nome / Identificação do Pavimento (Digitação livre) */}
                                <div>
                                  <input
                                    type="text"
                                    list="preset-floor-labels"
                                    placeholder="Ex: Térreo — Salas comerciais, 1º Pavimento, Cobertura"
                                    value={fl.label}
                                    onChange={(e) => handleFloorLabelChange(idx, e.target.value)}
                                    style={{
                                      width: '100%',
                                      padding: '6px 10px',
                                      fontSize: '0.82rem',
                                      borderRadius: '6px',
                                      border: '1px solid #D1D5DB',
                                      fontWeight: 600,
                                      color: '#111827',
                                    }}
                                  />
                                </div>

                                {/* 3. Coluna Predefinições (Seletor com as 13 opções solicitadas) */}
                                <div>
                                  <select
                                    aria-label={`Predefinição para ${fl.label || fl.floor}`}
                                    title="Selecionar nome predefinido"
                                    value=""
                                    onChange={(e) => {
                                      handlePresetSelect(idx, e.target.value);
                                      e.target.value = '';
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '6px 8px',
                                      fontSize: '0.78rem',
                                      borderRadius: '6px',
                                      border: '1px solid #D1D5DB',
                                      backgroundColor: '#F9FAFB',
                                      color: '#374151',
                                      cursor: 'pointer',
                                      fontWeight: 500,
                                    }}
                                  >
                                    <option value="" disabled>
                                      Predefinições...
                                    </option>
                                    {PRESET_FLOOR_LABELS.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* 4. Coluna Capacidade Planejada de Unidades (Aceita 0) */}
                                <div>
                                  <input
                                    type="number"
                                    min={registeredCount}
                                    title={`Capacidade de unidades comercializáveis (mínimo ${registeredCount})`}
                                    placeholder="0"
                                    value={fl.plannedUnitsCount}
                                    onChange={(e) => {
                                      const val = Math.max(0, parseInt(e.target.value || '0', 10));
                                      handleUpdateFloorRow(idx, { plannedUnitsCount: val });
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '6px 8px',
                                      fontSize: '0.82rem',
                                      fontWeight: 700,
                                      borderRadius: '6px',
                                      border: fl.plannedUnitsCount < registeredCount ? '2px solid #DC2626' : '1px solid #D1D5DB',
                                      textAlign: 'center',
                                      backgroundColor: '#FFFFFF',
                                    }}
                                  />
                                </div>

                                {/* 5. Coluna No Estoque (Somente Leitura) */}
                                <div style={{ textAlign: 'center' }}>
                                  {hasRegisteredUnits ? (
                                    <span
                                      title={`${registeredCount} unidade(s) ativa(s) vinculada(s) a este pavimento no estoque`}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        fontSize: '0.74rem',
                                        fontWeight: 800,
                                        backgroundColor: '#DCFCE7',
                                        color: '#166534',
                                        padding: '2px 8px',
                                        borderRadius: '999px',
                                      }}
                                    >
                                      ✓ {registeredCount} un.
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '0.76rem', color: '#9CA3AF' }}>0 un.</span>
                                  )}
                                </div>

                                {/* 6. Coluna Ações (Subir, Descer, Excluir com Proteção) */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                  <button
                                    type="button"
                                    disabled={idx === 0}
                                    onClick={() => handleMoveFloorRow(idx, 'up')}
                                    title="Subir posição"
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: idx === 0 ? '#D1D5DB' : '#4B5563',
                                      cursor: idx === 0 ? 'default' : 'pointer',
                                      padding: '4px',
                                    }}
                                  >
                                    <ArrowUp size={14} />
                                  </button>

                                  <button
                                    type="button"
                                    disabled={idx === floors.length - 1}
                                    onClick={() => handleMoveFloorRow(idx, 'down')}
                                    title="Descer posição"
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: idx === floors.length - 1 ? '#D1D5DB' : '#4B5563',
                                      cursor: idx === floors.length - 1 ? 'default' : 'pointer',
                                      padding: '4px',
                                    }}
                                  >
                                    <ArrowDown size={14} />
                                  </button>

                                  {hasRegisteredUnits ? (
                                    <span
                                      title={`Pavimento protegido: existem ${registeredCount} unidades comerciais ativas vinculadas.`}
                                      style={{
                                        color: '#9CA3AF',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        padding: '4px',
                                        cursor: 'not-allowed',
                                      }}
                                    >
                                      <ShieldAlert size={15} color="#D97706" />
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveFloorRow(idx)}
                                      title="Remover pavimento"
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#EF4444',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        padding: '4px',
                                      }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Ordem de Exibição */}
            <div>
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
          </div>

          {/* Rodapé Fixo com Resumo e Ações Salvar / Cancelar */}
          <div
            style={{
              padding: '14px 24px',
              borderTop: '1px solid #E5E7EB',
              backgroundColor: '#F9FAFB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              {blockType !== 'QUADRA' && floors.length > 0 ? (
                <span style={{ fontSize: '0.82rem', color: '#4B5563' }}>
                  Total: <strong>{floors.length} pavimentos</strong> • Capacidade planejada:{' '}
                  <strong style={{ color: '#166534' }}>{totalPlannedUnits} unidades</strong>
                </span>
              ) : (
                <span style={{ fontSize: '0.80rem', color: '#6B7280' }}>
                  Área Nobre • Módulo de Empreendimentos
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                disabled={submitting}
                onClick={onClose}
                style={{
                  padding: '9px 18px',
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
                  padding: '9px 22px',
                  backgroundColor: '#1E4620',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  border: 'none',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                }}
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>{isEditing ? 'Atualizar Bloco' : 'Salvar Bloco'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
