import { prisma as defaultPrisma } from '@/lib/db';
import type { PrismaClient } from '@prisma/client';

/**
 * Normaliza o nome do edifício para buscas e prevenção de duplicidades:
 * - Remove acentos / diacríticos
 * - Remove pontuações e caracteres especiais
 * - Remove prefixos comuns ("Edifício", "Ed.", "Residencial", "Condomínio", "Cond.")
 * - Colapsa espaços múltiplos e converte para minúsculas
 */
export function normalizeBuildingName(rawName: string): string {
  if (!rawName) return '';

  let normalized = rawName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacríticos
    .toLowerCase();

  // Remove múltiplos prefixos comuns em sequência ("Edifício Residencial", "Edifício Condomínio", etc.)
  let previous = '';
  while (previous !== normalized) {
    previous = normalized;
    normalized = normalized.replace(/^(edificio|ed\.|ed|residencial|condominio|cond\.|cond)\s+/i, '');
  }

  // Remove caracteres especiais mantendo apenas letras, números e espaços
  normalized = normalized.replace(/[^a-z0-9\s]/g, ' ');

  // Colapsa espaços em branco
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * Normaliza a identificação da unidade (apartamento):
 * - Converte para minúsculas
 * - Remove prefixos como "apto", "apt", "unidade"
 * - Remove espaços e hifens internos para garantir unicidade
 * Ex: "Apt 302-B" -> "302b", "101" -> "101", "Cobertura 01" -> "cobertura01"
 */
export function normalizeUnitNumber(rawUnit: string): string {
  if (!rawUnit) return '';

  let normalized = rawUnit
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  normalized = normalized.replace(/^(apto|apt|unidade|unid|un)\.?\s*/i, '');
  normalized = normalized.replace(/[^a-z0-9]/g, '');

  return normalized;
}

/**
 * Normaliza a identificação de torre/bloco:
 * Ex: "Torre A" -> "Torre A", "Bloco 2" -> "Bloco 2"
 */
export function normalizeTower(rawTower?: string | null): string | null {
  if (!rawTower || !rawTower.trim()) return null;
  return rawTower.trim();
}

/**
 * Normaliza o logradouro para comparação e prevenção de duplicidades:
 * - Remove acentos / diacríticos
 * - Converte para minúsculas
 * - Remove prefixos comuns ("rua", "r.", "av.", "avenida", "alameda", etc.)
 * - Remove caracteres especiais
 */
export function normalizeAddressStreet(address?: string | null): string {
  if (!address) return '';
  let str = address
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  let previous = '';
  while (previous !== str) {
    previous = str;
    str = str.replace(/^(rua|r\.|avenida|av\.|alameda|al\.|travessa|tv\.|rodovia|rod\.|estrada|est\.)\s+/i, '');
  }

  return str.replace(/[^a-z0-9]/g, '');
}

/**
 * Normaliza o número do logradouro para comparação:
 * Ex: "120" -> "120", "s/n" -> "sn"
 */
export function normalizeAddressNumber(num?: string | null): string {
  if (!num) return '';
  return num
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export interface UnitLinkParams {
  buildingId: string;
  unitNumber?: string | null;
  tower?: string | null;
  floor?: number | null;
  privateArea?: number | null;
  totalArea?: number | null;
  bedrooms?: number | null;
  suites?: number | null;
  bathrooms?: number | null;
  parkingSpaces?: number | null;
  prismaClient?: any;
}

/**
 * Realiza o vínculo de um imóvel com Edifício e Unidade Física:
 * - Se a unidade for informada, busca ou cria o `BuildingUnit` correspondente.
 * - Garante a criação do `PhysicalProperty` para a unidade caso não exista.
 * - Retorna { buildingId, physicalPropertyId, unitId }
 * - Se a unidade não for informada, retorna apenas { buildingId, physicalPropertyId: null, unitId: null }
 */
export async function linkPropertyToBuildingAndUnit(params: UnitLinkParams) {
  const { buildingId, unitNumber, tower, floor, privateArea, totalArea, bedrooms, suites, bathrooms, parkingSpaces, prismaClient } = params;
  const prisma = prismaClient || defaultPrisma;

  const building = await prisma.building.findUnique({
    where: { id: buildingId },
  });

  if (!building) {
    throw new Error('Edifício selecionado não foi encontrado.');
  }

  if (!unitNumber || !unitNumber.trim()) {
    // Unidade não informada: vincula apenas ao edifício compartilhado, sem criar unidade física fictícia
    return {
      building,
      buildingId: building.id,
      physicalPropertyId: null,
      unitId: null,
    };
  }

  const cleanUnitNumber = unitNumber.trim();
  const normalizedUnit = normalizeUnitNumber(cleanUnitNumber);
  const normalizedTower = normalizeTower(tower);

  // Busca ou cria o BuildingUnit
  let unit = await prisma.buildingUnit.findFirst({
    where: {
      buildingId: building.id,
      tower: normalizedTower ? { equals: normalizedTower, mode: 'insensitive' } : null,
      normalizedUnit,
    },
  });

  if (!unit) {
    unit = await prisma.buildingUnit.create({
      data: {
        buildingId: building.id,
        unitNumber: cleanUnitNumber,
        normalizedUnit,
        tower: normalizedTower,
        floor: floor !== undefined && floor !== null ? Number(floor) : null,
        privateArea: privateArea !== undefined && privateArea !== null ? Number(privateArea) : null,
        totalArea: totalArea !== undefined && totalArea !== null ? Number(totalArea) : null,
        bedrooms: bedrooms !== undefined && bedrooms !== null ? Number(bedrooms) : null,
        suites: suites !== undefined && suites !== null ? Number(suites) : null,
        bathrooms: bathrooms !== undefined && bathrooms !== null ? Number(bathrooms) : null,
        parkingSpaces: parkingSpaces !== undefined && parkingSpaces !== null ? Number(parkingSpaces) : null,
      },
    });
  }

  // Garante que o BuildingUnit esteja associado a uma identidade física (PhysicalProperty)
  let physicalPropertyId = unit.physicalPropertyId;

  if (!physicalPropertyId) {
    const complementParts = [normalizedTower, `Apt ${cleanUnitNumber}`].filter(Boolean);
    const physical = await prisma.physicalProperty.create({
      data: {
        propertyType: 'Apartamento',
        buildingId: building.id,
        address: building.address,
        number: building.number,
        complement: complementParts.join(' - ') || null,
        neighborhood: building.neighborhood,
        city: building.city,
        state: building.state,
        zipcode: building.zipcode,
        latitude: building.latitude,
        longitude: building.longitude,
        privateArea: privateArea !== undefined && privateArea !== null ? Number(privateArea) : null,
        totalArea: totalArea !== undefined && totalArea !== null ? Number(totalArea) : null,
        activeListingsCount: 0,
        status: 'ACTIVE',
      },
    });

    await prisma.buildingUnit.update({
      where: { id: unit.id },
      data: { physicalPropertyId: physical.id },
    });

    physicalPropertyId = physical.id;
  }

  return {
    building,
    buildingId: building.id,
    physicalPropertyId,
    unitId: unit.id,
  };
}
