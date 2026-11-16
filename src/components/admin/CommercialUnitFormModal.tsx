'use client';

import React, { useMemo, useState } from 'react';
import { Building2, X, Ruler, Home, DollarSign, ShieldCheck, AlertCircle } from 'lucide-react';
import FieldHelper from '@/components/FieldHelper';
import type { FieldHelpKey } from '@/lib/field-help';
import styles from '@/styles/commercial-units.module.css';
import type { CommercialUnitStatus, CommercialUnitType } from '@/lib/commercial-unit-service';
import {
  COMMERCIAL_UNIT_STATUS_META,
  COMMERCIAL_UNIT_TYPE_LABELS,
  formatAreaSqm,
  formatBrazilianNumber,
  formatCurrencyBRL,
  parseBrazilianDecimal,
} from '@/lib/commercial-unit-format';
import {
  computeParkingTotal,
  computePricePerSqm,
  computeRoomTotals,
  deriveRoomBreakdown,
  getUnitCategory,
  unitTypeHasBathrooms,
  unitTypeHasBedrooms,
} from '@/lib/commercial-unit-rules';

interface DevelopmentBlockOption {
  id: string;
  name: string;
  blockType: string;
}

interface TypologyOption {
  id: string;
  name: string;
  propertyType: string;
  privateArea?: number | null;
  builtArea?: number | null;
  totalArea?: number | null;
  bedrooms?: number | null;
  suites?: number | null;
  bathrooms?: number | null;
  lavabos?: number | null;
  parkingSpaces?: number | null;
  price?: number | null;
}

interface CommercialUnitFormModalProps {
  developmentId: string;
  blocks: DevelopmentBlockOption[];
  typologies: TypologyOption[];
  initialUnit?: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

const UNIT_TYPES: CommercialUnitType[] = [
  'APARTAMENTO',
  'COBERTURA',
  'STUDIO',
  'SALA_COMERCIAL',
  'CASA',
  'LOTE',
];

const STATUS_OPTIONS: CommercialUnitStatus[] = [
  'DISPONIVEL',
  'RESERVADA',
  'VENDIDA',
  'INDISPONIVEL_TEMPORARIAMENTE',
];

const toRawDecimal = (v: number | null | undefined) => (v != null ? formatBrazilianNumber(v) : '');
const toRawInt = (v: number | null | undefined) => (v != null ? String(v) : '');
const parseIntSafe = (raw: string) => Math.max(parseInt(raw || '0', 10) || 0, 0);
const DESCRIPTION_MAX = 500;

function FieldLabel({
  htmlFor,
  children,
  helpKey,
  calc = false,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  helpKey?: FieldHelpKey;
  calc?: boolean;
}) {
  return (
    <div className={styles.labelRow}>
      <label htmlFor={htmlFor} className={`${styles.label} ${calc ? styles.labelCalc : ''}`}>
        {children}
      </label>
      {helpKey && <FieldHelper helpKey={helpKey} />}
    </div>
  );
}

export function CommercialUnitFormModal({
  developmentId,
  blocks,
  typologies,
  initialUnit,
  onClose,
  onSuccess,
}: CommercialUnitFormModalProps) {
  const isEditing = Boolean(initialUnit?.id);
  const initialRooms = deriveRoomBreakdown(initialUnit || {});

  // Identificação
  const [unitType, setUnitType] = useState<CommercialUnitType>(
    (initialUnit?.unitType as CommercialUnitType) || 'APARTAMENTO'
  );
  const [blockId, setBlockId] = useState<string>(initialUnit?.blockId || '');
  const [typologyId, setTypologyId] = useState<string>(initialUnit?.typologyId || '');
  const [unitCode, setUnitCode] = useState<string>(initialUnit?.unitCode || '');
  const [floor, setFloor] = useState<string>(toRawInt(initialUnit?.floor));
  const [position, setPosition] = useState<string>(initialUnit?.position || '');
  const [solarOrientation, setSolarOrientation] = useState<string>(initialUnit?.solarOrientation || '');
  const [lotNumber, setLotNumber] = useState<string>(initialUnit?.lotNumber || '');
  const [quadraName, setQuadraName] = useState<string>(initialUnit?.quadraName || '');

  // Metragens (padrão brasileiro)
  const [privateAreaRaw, setPrivateAreaRaw] = useState(toRawDecimal(initialUnit?.privateArea));
  const [totalAreaRaw, setTotalAreaRaw] = useState(toRawDecimal(initialUnit?.totalArea));
  const [builtAreaRaw, setBuiltAreaRaw] = useState(toRawDecimal(initialUnit?.builtArea));
  const [landAreaRaw, setLandAreaRaw] = useState(toRawDecimal(initialUnit?.landArea));
  // Área útil não é exibida nem enviada pelo formulário; o servidor preserva o valor existente (compatibilidade)
  const [description, setDescription] = useState<string>(initialUnit?.description || '');
  const [frontageRaw, setFrontageRaw] = useState(toRawDecimal(initialUnit?.frontage));
  const [backDimensionRaw, setBackDimensionRaw] = useState(toRawDecimal(initialUnit?.backDimension));
  const [leftDepthRaw, setLeftDepthRaw] = useState(toRawDecimal(initialUnit?.leftDepth));
  const [rightDepthRaw, setRightDepthRaw] = useState(toRawDecimal(initialUnit?.rightDepth));
  const [topography, setTopography] = useState<string>(initialUnit?.topography || '');
  const [isCorner, setIsCorner] = useState<boolean>(Boolean(initialUnit?.isCorner));

  // Características (mesma nomenclatura dos imóveis usados)
  const [suites, setSuites] = useState<string>(String(initialRooms.suites));
  const [extraBedrooms, setExtraBedrooms] = useState<string>(String(initialRooms.extraBedrooms));
  const [socialBathrooms, setSocialBathrooms] = useState<string>(String(initialRooms.socialBathrooms));
  const [lavabos, setLavabos] = useState<string>(String(initialRooms.lavabos));
  const [coveredParkingSpaces, setCoveredParkingSpaces] = useState<string>(
    toRawInt(initialUnit?.coveredParkingSpaces)
  );
  const [uncoveredParkingSpaces, setUncoveredParkingSpaces] = useState<string>(
    toRawInt(initialUnit?.uncoveredParkingSpaces)
  );
  // Total legado (registros sem discriminação coberta/descoberta) — preservado até ser discriminado
  const [legacyParkingSpaces, setLegacyParkingSpaces] = useState<number>(initialUnit?.parkingSpaces ?? 0);
  const [parkingBoxNumbers, setParkingBoxNumbers] = useState<string>(initialUnit?.parkingBoxNumbers || '');
  const [storageNumber, setStorageNumber] = useState<string>(initialUnit?.storageNumber || '');
  const [houseFloors, setHouseFloors] = useState<string>(toRawInt(initialUnit?.houseFloors));
  const [hasBarbecue, setHasBarbecue] = useState<boolean>(Boolean(initialUnit?.hasBarbecue));
  const [isPenthouse, setIsPenthouse] = useState<boolean>(
    Boolean(initialUnit?.isPenthouse || initialUnit?.unitType === 'COBERTURA')
  );

  // Comercial
  const [listPriceRaw, setListPriceRaw] = useState(toRawDecimal(initialUnit?.listPrice));
  const [promotionalPriceRaw, setPromotionalPriceRaw] = useState(toRawDecimal(initialUnit?.promotionalPrice));
  const [commercialStatus, setCommercialStatus] = useState<CommercialUnitStatus>(
    (initialUnit?.commercialStatus as CommercialUnitStatus) || 'DISPONIVEL'
  );
  const [acceptsFinancing, setAcceptsFinancing] = useState<boolean>(initialUnit?.acceptsFinancing ?? true);
  const [acceptsExchange, setAcceptsExchange] = useState<boolean>(Boolean(initialUnit?.acceptsExchange));
  const [exchangeNotes, setExchangeNotes] = useState<string>(initialUnit?.exchangeNotes || '');
  const [publicNotes, setPublicNotes] = useState<string>(initialUnit?.publicNotes || '');

  // Administração
  const [internalNotes, setInternalNotes] = useState<string>(initialUnit?.internalNotes || '');
  const [reservedByNote, setReservedByNote] = useState<string>(initialUnit?.reservedByNote || '');
  const [reason, setReason] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const category = getUnitCategory(unitType);
  const isVertical = category === 'VERTICAL';
  const isHouse = category === 'HOUSE';
  const isLot = category === 'LOT';
  const hasBedrooms = unitTypeHasBedrooms(unitType);
  const hasBathrooms = unitTypeHasBathrooms(unitType);

  // Totais automáticos (não editáveis)
  const roomTotals = useMemo(
    () =>
      computeRoomTotals({
        suites: hasBedrooms ? suites : 0,
        extraBedrooms: hasBedrooms ? extraBedrooms : 0,
        socialBathrooms: hasBathrooms ? socialBathrooms : 0,
        lavabos: hasBathrooms ? lavabos : 0,
      }),
    [hasBedrooms, hasBathrooms, suites, extraBedrooms, socialBathrooms, lavabos]
  );

  const parkingTotal = computeParkingTotal({
    coveredParkingSpaces: coveredParkingSpaces.trim(),
    uncoveredParkingSpaces: uncoveredParkingSpaces.trim(),
    parkingSpaces: legacyParkingSpaces,
  });

  // R$/m² em tempo real — mesma função central usada no servidor, listagem e consulta do corretor
  const liveSqm = useMemo(() => {
    const safe = (raw: string) => {
      const v = parseBrazilianDecimal(raw, { allowZero: false });
      return v != null && !Number.isNaN(v) ? v : null;
    };
    return computePricePerSqm({
      unitType,
      listPrice: safe(listPriceRaw),
      promotionalPrice: safe(promotionalPriceRaw),
      privateArea: safe(privateAreaRaw),
      builtArea: safe(builtAreaRaw),
      landArea: safe(landAreaRaw),
    });
  }, [unitType, listPriceRaw, promotionalPriceRaw, privateAreaRaw, builtAreaRaw, landAreaRaw]);

  const handleSelectTypology = (nextTypologyId: string) => {
    setTypologyId(nextTypologyId);
    if (isEditing || !nextTypologyId) return;
    const typ = typologies.find((t) => t.id === nextTypologyId);
    if (!typ) return;

    if (!privateAreaRaw && typ.privateArea != null) setPrivateAreaRaw(formatBrazilianNumber(typ.privateArea));
    if (!builtAreaRaw && typ.builtArea != null) setBuiltAreaRaw(formatBrazilianNumber(typ.builtArea));
    if (!totalAreaRaw && typ.totalArea != null) setTotalAreaRaw(formatBrazilianNumber(typ.totalArea));
    if (!listPriceRaw && typ.price != null) setListPriceRaw(formatBrazilianNumber(typ.price));

    const typRooms = deriveRoomBreakdown(typ);
    const roomsUntouched =
      suites === '0' && extraBedrooms === '0' && socialBathrooms === '0' && lavabos === '0';
    if (roomsUntouched) {
      setSuites(String(typRooms.suites));
      setExtraBedrooms(String(typRooms.extraBedrooms));
      setSocialBathrooms(String(typRooms.socialBathrooms));
      setLavabos(String(typRooms.lavabos));
    }
    if (!coveredParkingSpaces && !uncoveredParkingSpaces && typ.parkingSpaces != null) {
      setLegacyParkingSpaces(typ.parkingSpaces);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!unitCode.trim()) {
      setError('A identificação (número ou código) da unidade é obrigatória.');
      return;
    }

    const parsed = {
      privateArea: parseBrazilianDecimal(privateAreaRaw, { allowZero: false }),
      totalArea: parseBrazilianDecimal(totalAreaRaw, { allowZero: false }),
      builtArea: parseBrazilianDecimal(builtAreaRaw, { allowZero: false }),
      landArea: parseBrazilianDecimal(landAreaRaw, { allowZero: false }),
      frontage: parseBrazilianDecimal(frontageRaw, { allowZero: false }),
      backDimension: parseBrazilianDecimal(backDimensionRaw, { allowZero: false }),
      leftDepth: parseBrazilianDecimal(leftDepthRaw, { allowZero: false }),
      rightDepth: parseBrazilianDecimal(rightDepthRaw, { allowZero: false }),
      listPrice: parseBrazilianDecimal(listPriceRaw, { allowZero: false }),
      promotionalPrice: parseBrazilianDecimal(promotionalPriceRaw, { allowZero: false }),
    };
    const labels: Record<keyof typeof parsed, string> = {
      privateArea: 'Área privativa',
      totalArea: 'Área total',
      builtArea: 'Área construída',
      landArea: 'Área do terreno',
      frontage: 'Testada / frente',
      backDimension: 'Fundos',
      leftDepth: 'Lateral esquerda',
      rightDepth: 'Lateral direita',
      listPrice: 'Preço de tabela',
      promotionalPrice: 'Preço promocional',
    };
    for (const key of Object.keys(parsed) as Array<keyof typeof parsed>) {
      if (Number.isNaN(parsed[key])) {
        setError(`Valor inválido no campo "${labels[key]}". Utilize o formato brasileiro (ex.: 85,50).`);
        return;
      }
    }

    if (
      parsed.listPrice != null &&
      parsed.promotionalPrice != null &&
      parsed.promotionalPrice > parsed.listPrice
    ) {
      setError('O preço promocional não pode ser superior ao preço de tabela.');
      return;
    }

    const parsedFloor = isLot || floor.trim() === '' ? null : parseInt(floor.trim(), 10);
    if (!isLot && floor.trim() !== '' && Number.isNaN(parsedFloor)) {
      setError('Informe um número inteiro válido para o pavimento.');
      return;
    }

    if (description.trim().length > DESCRIPTION_MAX) {
      setError(`A descrição da unidade deve ter no máximo ${DESCRIPTION_MAX} caracteres.`);
      return;
    }

    const hasCovered = !isLot && coveredParkingSpaces.trim() !== '';
    const hasUncovered = !isLot && uncoveredParkingSpaces.trim() !== '';

    const payload: Record<string, any> = {
      unitCode: unitCode.trim(),
      unitType,
      blockId: blockId || null,
      typologyId: typologyId || null,
      floor: isLot ? null : parsedFloor,
      position: position.trim() || null,
      solarOrientation: solarOrientation.trim() || null,
      lotNumber: isVertical ? null : lotNumber.trim() || null,
      quadraName: isVertical ? null : quadraName.trim() || null,

      // Metragens: cada campo mantém seu significado próprio
      privateArea: isVertical ? parsed.privateArea : isHouse ? (initialUnit?.privateArea ?? null) : null,
      totalArea: parsed.totalArea,
      builtArea: isHouse ? parsed.builtArea : isVertical ? (initialUnit?.builtArea ?? null) : null,
      landArea: isLot || isHouse ? parsed.landArea : null,
      // usableArea não é enviada: o servidor preserva o valor existente (campo fora do formulário atual)
      frontage: isVertical ? null : parsed.frontage,
      backDimension: isVertical ? null : parsed.backDimension,
      leftDepth: isVertical ? null : parsed.leftDepth,
      rightDepth: isVertical ? null : parsed.rightDepth,
      topography: isVertical ? null : topography.trim() || null,
      isCorner: isVertical ? false : isCorner,
      houseFloors: isHouse && houseFloors.trim() !== '' ? parseInt(houseFloors, 10) : null,

      // Características: totais são recalculados no servidor a partir da discriminação
      suites: hasBedrooms ? parseIntSafe(suites) : 0,
      extraBedrooms: hasBedrooms ? parseIntSafe(extraBedrooms) : 0,
      socialBathrooms: hasBathrooms ? parseIntSafe(socialBathrooms) : 0,
      lavabos: hasBathrooms ? parseIntSafe(lavabos) : 0,
      bedrooms: roomTotals.totalBedrooms,
      bathrooms: roomTotals.totalBathrooms,
      coveredParkingSpaces: hasCovered ? parseIntSafe(coveredParkingSpaces) : null,
      uncoveredParkingSpaces: hasUncovered ? parseIntSafe(uncoveredParkingSpaces) : null,
      parkingSpaces: isLot ? 0 : parkingTotal,
      parkingBoxNumbers: isLot ? null : parkingBoxNumbers.trim() || null,
      storageNumber: isLot ? null : storageNumber.trim() || null,
      hasBarbecue: isLot ? false : hasBarbecue,
      isPenthouse: unitType === 'COBERTURA' ? true : isPenthouse,
      description: description.trim() || null,

      commercialStatus,
      listPrice: parsed.listPrice,
      promotionalPrice: parsed.promotionalPrice,
      acceptsFinancing,
      acceptsExchange,
      exchangeNotes: acceptsExchange ? exchangeNotes.trim() || null : null,
      publicNotes: publicNotes.trim() || null,
      internalNotes: internalNotes.trim() || null,
      reservedByNote: commercialStatus === 'RESERVADA' ? reservedByNote.trim() || null : null,
      reason:
        reason.trim() ||
        (isEditing ? 'Atualização administrativa da unidade comercial' : 'Cadastro inicial da unidade comercial'),
    };

    setSubmitting(true);
    try {
      const url = isEditing
        ? `/api/admin/developments/${developmentId}/units/${initialUnit.id}`
        : `/api/admin/developments/${developmentId}/units`;
      const res = await fetch(url, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar unidade comercial.');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar unidade comercial.');
    } finally {
      setSubmitting(false);
    }
  };

  const decimalInput = (
    id: string,
    value: string,
    onChange: (v: string) => void,
    placeholder: string
  ) => (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={styles.input}
    />
  );

  const intInput = (id: string, value: string, onChange: (v: string) => void, placeholder = '0') => (
    <input
      id={id}
      type="number"
      min={0}
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={styles.input}
    />
  );

  const descriptionLength = description.length;
  const descriptionField = (
    <div className={styles.field}>
      <FieldLabel htmlFor="cu-description" helpKey="unitDescription">
        Descrição da unidade
      </FieldLabel>
      <textarea
        id="cu-description"
        value={description}
        maxLength={DESCRIPTION_MAX}
        rows={3}
        onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
        placeholder="Opcional — detalhes da planta, acabamentos, posição ou particularidades da unidade"
        className={styles.textarea}
        aria-describedby="cu-description-count"
      />
      <span
        id="cu-description-count"
        className={styles.hint}
        style={{ textAlign: 'right', color: descriptionLength >= DESCRIPTION_MAX ? 'var(--color-danger)' : undefined }}
      >
        {descriptionLength}/{DESCRIPTION_MAX} caracteres
      </span>
    </div>
  );

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="cu-form-title">
      <form className={styles.modal} onSubmit={handleSubmit} noValidate>
        <div className={styles.modalHeader}>
          <div>
            <h2 id="cu-form-title" className={styles.modalTitle}>
              {isEditing ? `Editar unidade ${initialUnit.unitCode}` : 'Nova unidade comercial'}
            </h2>
            <p className={styles.modalSubtitle}>
              Campos adaptados para <strong>{COMMERCIAL_UNIT_TYPE_LABELS[unitType]}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`${styles.btn} ${styles.btnGhost} ${styles.btnIcon}`}
            aria-label="Fechar formulário"
          >
            <X size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {error && (
            <div className={`${styles.alert} ${styles.alertError}`} role="alert">
              <AlertCircle size={16} className={styles.alertIcon} />
              <span>{error}</span>
            </div>
          )}

          {/* 1. IDENTIFICAÇÃO */}
          <fieldset className={styles.formGroup}>
            <div className={styles.formGroupHeader}>
              <span className={styles.formGroupTitle}>
                <Building2 size={16} className={styles.sectionTitleIcon} />
                1. Identificação da unidade
              </span>
            </div>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <FieldLabel htmlFor="cu-type">Tipo de imóvel *</FieldLabel>
                <select
                  id="cu-type"
                  value={unitType}
                  onChange={(e) => {
                    const next = e.target.value as CommercialUnitType;
                    setUnitType(next);
                    if (next === 'COBERTURA') setIsPenthouse(true);
                  }}
                  className={styles.select}
                >
                  {UNIT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {COMMERCIAL_UNIT_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <FieldLabel htmlFor="cu-block">{isVertical ? 'Torre / Bloco' : 'Quadra / Setor'}</FieldLabel>
                <select
                  id="cu-block"
                  value={blockId}
                  onChange={(e) => setBlockId(e.target.value)}
                  className={styles.select}
                >
                  <option value="">Sem torre/quadra específica</option>
                  {blocks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.blockType})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <FieldLabel htmlFor="cu-typology" helpKey="typology">
                  Tipologia
                </FieldLabel>
                <select
                  id="cu-typology"
                  value={typologyId}
                  onChange={(e) => handleSelectTypology(e.target.value)}
                  className={styles.select}
                >
                  <option value="">Sem tipologia específica</option>
                  {typologies.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <FieldLabel htmlFor="cu-code" helpKey="unitCode">
                  Identificação *
                </FieldLabel>
                <input
                  id="cu-code"
                  type="text"
                  value={unitCode}
                  onChange={(e) => setUnitCode(e.target.value)}
                  placeholder={isLot ? 'Ex.: Lote 14' : isHouse ? 'Ex.: Casa 05' : 'Ex.: 802'}
                  className={styles.input}
                  required
                />
              </div>

              {!isLot && (
                <div className={styles.field}>
                  <FieldLabel htmlFor="cu-floor" helpKey="unitFloor">
                    Pavimento
                  </FieldLabel>
                  <input
                    id="cu-floor"
                    type="number"
                    inputMode="numeric"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder="Ex.: 8 (0 = térreo)"
                    className={styles.input}
                  />
                </div>
              )}

              <div className={styles.field}>
                <FieldLabel htmlFor="cu-position">Posição</FieldLabel>
                <input
                  id="cu-position"
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Ex.: Frente / Final 02"
                  className={styles.input}
                />
              </div>

              <div className={styles.field}>
                <FieldLabel htmlFor="cu-solar">Orientação solar</FieldLabel>
                <input
                  id="cu-solar"
                  type="text"
                  value={solarOrientation}
                  onChange={(e) => setSolarOrientation(e.target.value)}
                  placeholder="Ex.: Sol da manhã / Norte"
                  className={styles.input}
                />
              </div>

              {!isVertical && (
                <>
                  <div className={styles.field}>
                    <FieldLabel htmlFor="cu-lot">Número do lote</FieldLabel>
                    <input
                      id="cu-lot"
                      type="text"
                      value={lotNumber}
                      onChange={(e) => setLotNumber(e.target.value)}
                      placeholder="Ex.: 14-B"
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.field}>
                    <FieldLabel htmlFor="cu-quadra">Quadra (texto)</FieldLabel>
                    <input
                      id="cu-quadra"
                      type="text"
                      value={quadraName}
                      onChange={(e) => setQuadraName(e.target.value)}
                      placeholder="Ex.: Quadra C"
                      className={styles.input}
                    />
                  </div>
                </>
              )}
            </div>
          </fieldset>

          {/* 2. METRAGENS */}
          <fieldset className={styles.formGroup}>
            <div className={styles.formGroupHeader}>
              <span className={styles.formGroupTitle}>
                <Ruler size={16} className={styles.sectionTitleIcon} />
                2. Metragens
              </span>
            </div>

            {isVertical && (
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <FieldLabel htmlFor="cu-private" helpKey="privateArea">
                    Área privativa (m²)
                  </FieldLabel>
                  {decimalInput('cu-private', privateAreaRaw, setPrivateAreaRaw, 'Ex.: 85,50')}
                  <span className={styles.hint}>Base do cálculo do R$/m².</span>
                </div>
                <div className={styles.field}>
                  <FieldLabel htmlFor="cu-total" helpKey="totalArea">
                    Área total (m²)
                  </FieldLabel>
                  {decimalInput('cu-total', totalAreaRaw, setTotalAreaRaw, 'Ex.: 132,40')}
                </div>
              </div>
            )}

            {isHouse && (
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <FieldLabel htmlFor="cu-built" helpKey="builtArea">
                    Área construída (m²)
                  </FieldLabel>
                  {decimalInput('cu-built', builtAreaRaw, setBuiltAreaRaw, 'Ex.: 180,00')}
                  <span className={styles.hint}>Base do cálculo do R$/m².</span>
                </div>
                <div className={styles.field}>
                  <FieldLabel htmlFor="cu-land" helpKey="landArea">
                    Área do terreno (m²)
                  </FieldLabel>
                  {decimalInput('cu-land', landAreaRaw, setLandAreaRaw, 'Ex.: 360,00')}
                </div>
                <div className={styles.field}>
                  <FieldLabel htmlFor="cu-total" helpKey="totalArea">
                    Área total documental (m²)
                  </FieldLabel>
                  {decimalInput('cu-total', totalAreaRaw, setTotalAreaRaw, 'Opcional')}
                </div>
              </div>
            )}

            {isLot && (
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <FieldLabel htmlFor="cu-land" helpKey="landArea">
                    Área do terreno (m²)
                  </FieldLabel>
                  {decimalInput('cu-land', landAreaRaw, setLandAreaRaw, 'Ex.: 360,00')}
                  <span className={styles.hint}>Base do cálculo do R$/m².</span>
                </div>
                <div className={styles.field}>
                  <FieldLabel htmlFor="cu-total" helpKey="totalArea">
                    Área total (fração ideal) (m²)
                  </FieldLabel>
                  {decimalInput('cu-total', totalAreaRaw, setTotalAreaRaw, 'Opcional')}
                </div>
              </div>
            )}

            {!isVertical && (
              <div className={styles.subGroup}>
                <span className={styles.subGroupTitle}>Dimensões do terreno (m)</span>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <FieldLabel htmlFor="cu-front">Testada / frente</FieldLabel>
                    {decimalInput('cu-front', frontageRaw, setFrontageRaw, 'Ex.: 12,00')}
                  </div>
                  <div className={styles.field}>
                    <FieldLabel htmlFor="cu-back">Fundos</FieldLabel>
                    {decimalInput('cu-back', backDimensionRaw, setBackDimensionRaw, 'Ex.: 12,00')}
                  </div>
                  <div className={styles.field}>
                    <FieldLabel htmlFor="cu-left">Lateral esquerda</FieldLabel>
                    {decimalInput('cu-left', leftDepthRaw, setLeftDepthRaw, 'Ex.: 30,00')}
                  </div>
                  <div className={styles.field}>
                    <FieldLabel htmlFor="cu-right">Lateral direita</FieldLabel>
                    {decimalInput('cu-right', rightDepthRaw, setRightDepthRaw, 'Ex.: 30,00')}
                  </div>
                  <div className={styles.field}>
                    <FieldLabel htmlFor="cu-topo">Topografia</FieldLabel>
                    <select
                      id="cu-topo"
                      value={topography}
                      onChange={(e) => setTopography(e.target.value)}
                      className={styles.select}
                    >
                      <option value="">Não informada</option>
                      <option value="PLANO">Plano</option>
                      <option value="ACLIVE">Aclive</option>
                      <option value="DECLIVE">Declive</option>
                      <option value="IRREGULAR">Irregular</option>
                    </select>
                  </div>
                </div>
                <label className={styles.checkbox}>
                  <input type="checkbox" checked={isCorner} onChange={(e) => setIsCorner(e.target.checked)} />
                  Lote de esquina
                </label>
              </div>
            )}

            {isLot && descriptionField}
          </fieldset>

          {/* 3. CARACTERÍSTICAS */}
          {!isLot && (
            <fieldset className={styles.formGroup}>
              <div className={styles.formGroupHeader}>
                <span className={styles.formGroupTitle}>
                  <Home size={16} className={styles.sectionTitleIcon} />
                  3. Características
                </span>
              </div>

              {hasBedrooms && (
                <div className={styles.subGroup}>
                  <span className={styles.subGroupTitle}>
                    Dormitórios e suítes
                    <span className={styles.totalBadge}>Total: {roomTotals.totalBedrooms} dormitório(s)</span>
                  </span>
                  <div className={styles.formGrid}>
                    <div className={styles.field}>
                      <FieldLabel htmlFor="cu-suites" helpKey="suites">
                        Suítes
                      </FieldLabel>
                      {intInput('cu-suites', suites, setSuites)}
                    </div>
                    <div className={styles.field}>
                      <FieldLabel htmlFor="cu-extra" helpKey="extraBedrooms">
                        Dormitórios extras
                      </FieldLabel>
                      {intInput('cu-extra', extraBedrooms, setExtraBedrooms)}
                    </div>
                    <div className={styles.field}>
                      <FieldLabel htmlFor="cu-total-bed" helpKey="totalDormitories" calc>
                        Total de dormitórios (automático)
                      </FieldLabel>
                      <input
                        id="cu-total-bed"
                        type="number"
                        value={roomTotals.totalBedrooms}
                        readOnly
                        disabled
                        className={`${styles.input} ${styles.inputCalc}`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {hasBathrooms && (
                <div className={styles.subGroup}>
                  <span className={styles.subGroupTitle}>
                    Banheiros e lavabos
                    <span className={styles.totalBadge}>Total: {roomTotals.totalBathrooms} banheiro(s)</span>
                  </span>
                  <div className={styles.formGrid}>
                    <div className={styles.field}>
                      <FieldLabel htmlFor="cu-social" helpKey="socialBathrooms">
                        Banheiros sociais
                      </FieldLabel>
                      {intInput('cu-social', socialBathrooms, setSocialBathrooms)}
                    </div>
                    <div className={styles.field}>
                      <FieldLabel htmlFor="cu-lavabos" helpKey="lavabos">
                        Lavabos
                      </FieldLabel>
                      {intInput('cu-lavabos', lavabos, setLavabos)}
                    </div>
                    <div className={styles.field}>
                      <FieldLabel htmlFor="cu-total-bath" helpKey="totalBathrooms" calc>
                        Total de banheiros (automático)
                      </FieldLabel>
                      <input
                        id="cu-total-bath"
                        type="number"
                        value={roomTotals.totalBathrooms}
                        readOnly
                        disabled
                        className={`${styles.input} ${styles.inputCalc}`}
                      />
                    </div>
                  </div>
                  {hasBedrooms && (
                    <span className={styles.hint}>
                      Cada suíte corresponde a um banheiro no total ({roomTotals.suites} suíte(s) +{' '}
                      {roomTotals.socialBathrooms} social(is) + {roomTotals.lavabos} lavabo(s)).
                    </span>
                  )}
                </div>
              )}

              <div className={styles.subGroup}>
                <span className={styles.subGroupTitle}>
                  Vagas de garagem
                  <span className={styles.totalBadge}>Total: {parkingTotal} vaga(s)</span>
                </span>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <FieldLabel htmlFor="cu-covered" helpKey="coveredParkingSpaces">
                      Vagas cobertas
                    </FieldLabel>
                    {intInput('cu-covered', coveredParkingSpaces, setCoveredParkingSpaces, 'Ex.: 1')}
                  </div>
                  <div className={styles.field}>
                    <FieldLabel htmlFor="cu-uncovered" helpKey="uncoveredParkingSpaces">
                      Vagas descobertas
                    </FieldLabel>
                    {intInput('cu-uncovered', uncoveredParkingSpaces, setUncoveredParkingSpaces, 'Ex.: 0')}
                  </div>
                  <div className={styles.field}>
                    <FieldLabel htmlFor="cu-total-park" helpKey="totalParkingSpaces" calc>
                      Vagas totais (automático)
                    </FieldLabel>
                    <input
                      id="cu-total-park"
                      type="number"
                      value={parkingTotal}
                      readOnly
                      disabled
                      className={`${styles.input} ${styles.inputCalc}`}
                    />
                  </div>
                  <div className={styles.field}>
                    <FieldLabel htmlFor="cu-box">Box de garagem</FieldLabel>
                    <input
                      id="cu-box"
                      type="text"
                      value={parkingBoxNumbers}
                      onChange={(e) => setParkingBoxNumbers(e.target.value)}
                      placeholder="Ex.: Box 42 / 43"
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.field}>
                    <FieldLabel htmlFor="cu-storage">Depósito</FieldLabel>
                    <input
                      id="cu-storage"
                      type="text"
                      value={storageNumber}
                      onChange={(e) => setStorageNumber(e.target.value)}
                      placeholder="Ex.: Dep. 12"
                      className={styles.input}
                    />
                  </div>
                  {isHouse && (
                    <div className={styles.field}>
                      <FieldLabel htmlFor="cu-hfloors">Pavimentos da casa</FieldLabel>
                      {intInput('cu-hfloors', houseFloors, setHouseFloors, 'Ex.: 2')}
                    </div>
                  )}
                </div>
                {!coveredParkingSpaces.trim() && !uncoveredParkingSpaces.trim() && legacyParkingSpaces > 0 && (
                  <span className={styles.hint}>
                    Total registrado anteriormente: {legacyParkingSpaces} vaga(s). Informe cobertas e descobertas
                    para discriminar.
                  </span>
                )}
              </div>

              <div className={styles.checkboxRow}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={hasBarbecue}
                    onChange={(e) => setHasBarbecue(e.target.checked)}
                  />
                  Churrasqueira
                </label>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={unitType === 'COBERTURA' ? true : isPenthouse}
                    disabled={unitType === 'COBERTURA'}
                    onChange={(e) => setIsPenthouse(e.target.checked)}
                  />
                  Cobertura
                </label>
              </div>

              {descriptionField}
            </fieldset>
          )}

          {/* 4. COMERCIAL */}
          <fieldset className={styles.formGroup}>
            <div className={styles.formGroupHeader}>
              <span className={styles.formGroupTitle}>
                <DollarSign size={16} className={styles.sectionTitleIcon} />
                {isLot ? '3' : '4'}. Preços, disponibilidade e condições
              </span>
            </div>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <FieldLabel htmlFor="cu-list" helpKey="listPrice">
                  Preço de tabela (R$)
                </FieldLabel>
                {decimalInput('cu-list', listPriceRaw, setListPriceRaw, 'Ex.: 850.000,00')}
              </div>
              <div className={styles.field}>
                <FieldLabel htmlFor="cu-promo" helpKey="promotionalPrice">
                  Preço promocional (R$)
                </FieldLabel>
                {decimalInput('cu-promo', promotionalPriceRaw, setPromotionalPriceRaw, 'Opcional')}
              </div>
              <div className={styles.field}>
                <FieldLabel htmlFor="cu-status" helpKey="commercialStatus">
                  Disponibilidade
                </FieldLabel>
                <select
                  id="cu-status"
                  value={commercialStatus}
                  onChange={(e) => setCommercialStatus(e.target.value as CommercialUnitStatus)}
                  className={styles.select}
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>
                      {COMMERCIAL_UNIT_STATUS_META[st].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={`${styles.highlightBox} ${liveSqm.pricePerSqm != null ? '' : styles.highlightMuted}`}>
              <span className={styles.highlightLabel}>
                Preço por m² (automático)
                <FieldHelper helpKey="pricePerSqm" size={13} />
              </span>
              <span className={styles.highlightValue}>
                {liveSqm.pricePerSqm != null && liveSqm.referenceArea != null
                  ? `${formatCurrencyBRL(liveSqm.pricePerSqm)}/m² (base: ${formatAreaSqm(liveSqm.referenceArea)} de ${liveSqm.referenceAreaLabel})`
                  : `Indisponível — informe o preço e a ${liveSqm.requiredAreaLabel}`}
              </span>
            </div>

            <div className={styles.checkboxRow}>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={acceptsFinancing}
                  onChange={(e) => setAcceptsFinancing(e.target.checked)}
                />
                Aceita financiamento
                <FieldHelper helpKey="acceptsFinancing" size={13} />
              </label>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={acceptsExchange}
                  onChange={(e) => setAcceptsExchange(e.target.checked)}
                />
                Aceita permuta
                <FieldHelper helpKey="acceptsExchange" size={13} />
              </label>
            </div>

            <div className={styles.formGridWide}>
              {acceptsExchange && (
                <div className={styles.field}>
                  <FieldLabel htmlFor="cu-exchange">Condições da permuta</FieldLabel>
                  <input
                    id="cu-exchange"
                    type="text"
                    value={exchangeNotes}
                    onChange={(e) => setExchangeNotes(e.target.value)}
                    placeholder="Ex.: Aceita veículo até 30% do valor"
                    className={styles.input}
                  />
                </div>
              )}
              <div className={styles.field}>
                <FieldLabel htmlFor="cu-public" helpKey="publicNotes">
                  Observações para corretores
                </FieldLabel>
                <textarea
                  id="cu-public"
                  value={publicNotes}
                  onChange={(e) => setPublicNotes(e.target.value)}
                  placeholder="Ex.: Unidade decorada / vista livre"
                  className={styles.textarea}
                />
              </div>
            </div>

            <div className={styles.labelRow}>
              <span className={styles.hint}>
                As condições comerciais de pagamento são cadastradas na aba <strong>Condições Comerciais</strong>.
              </span>
              <FieldHelper helpKey="paymentConditions" size={13} />
            </div>
          </fieldset>

          {/* 5. ADMINISTRAÇÃO */}
          <fieldset className={`${styles.formGroup} ${styles.formGroupInternal}`}>
            <div className={styles.formGroupHeader}>
              <span className={styles.formGroupTitle}>
                <ShieldCheck size={16} className={styles.sectionTitleIcon} />
                {isLot ? '4' : '5'}. Controle interno (exclusivo admin)
              </span>
            </div>
            <div className={styles.formGridWide}>
              <div className={styles.field}>
                <FieldLabel htmlFor="cu-internal" helpKey="internalNotes">
                  Observações internas
                </FieldLabel>
                <textarea
                  id="cu-internal"
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Anotações internas da administração"
                  className={styles.textarea}
                />
              </div>
              {commercialStatus === 'RESERVADA' && (
                <div className={styles.field}>
                  <FieldLabel htmlFor="cu-reserved">Controle interno da reserva</FieldLabel>
                  <input
                    id="cu-reserved"
                    type="text"
                    value={reservedByNote}
                    onChange={(e) => setReservedByNote(e.target.value)}
                    placeholder="Ex.: Reservado p/ corretor João até sexta"
                    className={styles.input}
                  />
                </div>
              )}
              <div className={styles.field}>
                <FieldLabel htmlFor="cu-reason">Motivo da alteração (histórico)</FieldLabel>
                <input
                  id="cu-reason"
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={isEditing ? 'Ex.: Correção de metragem' : 'Ex.: Cadastro da tabela de lançamento'}
                  className={styles.input}
                />
              </div>
            </div>
          </fieldset>
        </div>

        <div className={styles.modalFooter}>
          <button type="button" onClick={onClose} className={`${styles.btn} ${styles.btnSecondary}`}>
            Cancelar
          </button>
          <button type="submit" disabled={submitting} className={`${styles.btn} ${styles.btnPrimary}`}>
            {submitting ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar unidade'}
          </button>
        </div>
      </form>
    </div>
  );
}
