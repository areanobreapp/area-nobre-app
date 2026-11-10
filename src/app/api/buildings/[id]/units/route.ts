import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { normalizeUnitNumber, normalizeTower } from '@/lib/building-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id } = await params;
    const units = await prisma.buildingUnit.findMany({
      where: { buildingId: id },
      orderBy: [
        { tower: 'asc' },
        { floor: 'asc' },
        { unitNumber: 'asc' },
      ],
    });

    return NextResponse.json({ units });
  } catch (error) {
    console.error('Erro ao listar unidades do edifício:', error);
    return NextResponse.json({ error: 'Falha ao buscar unidades.' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id } = await params;
    const building = await prisma.building.findUnique({
      where: { id },
    });

    if (!building) {
      return NextResponse.json({ error: 'Edifício não encontrado.' }, { status: 404 });
    }

    const body = await req.json();
    const {
      unitNumber,
      tower,
      floor,
      unitRegistryNumber,
      bedrooms,
      suites,
      bathrooms,
      parkingSpaces,
      privateArea,
      totalArea,
    } = body;

    if (!unitNumber || typeof unitNumber !== 'string' || !unitNumber.trim()) {
      return NextResponse.json({ error: 'O número ou identificação da unidade é obrigatório.' }, { status: 400 });
    }

    const normalizedUnit = normalizeUnitNumber(unitNumber);
    const normalizedTowerValue = normalizeTower(tower);

    // Evita duplicidade de unidade no mesmo edifício e torre
    const existingUnit = await prisma.buildingUnit.findFirst({
      where: {
        buildingId: id,
        tower: normalizedTowerValue,
        normalizedUnit,
      },
    });

    if (existingUnit) {
      return NextResponse.json(
        {
          error: `A unidade ${unitNumber}${tower ? ` (${tower})` : ''} já está cadastrada neste edifício.`,
          unit: existingUnit,
        },
        { status: 409 }
      );
    }

    const unit = await prisma.buildingUnit.create({
      data: {
        buildingId: id,
        unitNumber: unitNumber.trim(),
        normalizedUnit,
        tower: normalizedTowerValue,
        floor: floor !== undefined && floor !== null && floor !== '' ? parseInt(String(floor), 10) : null,
        unitRegistryNumber: unitRegistryNumber?.trim() || null,
        bedrooms: bedrooms !== undefined && bedrooms !== null && bedrooms !== '' ? parseInt(String(bedrooms), 10) : null,
        suites: suites !== undefined && suites !== null && suites !== '' ? parseInt(String(suites), 10) : null,
        bathrooms: bathrooms !== undefined && bathrooms !== null && bathrooms !== '' ? parseInt(String(bathrooms), 10) : null,
        parkingSpaces: parkingSpaces !== undefined && parkingSpaces !== null && parkingSpaces !== '' ? parseInt(String(parkingSpaces), 10) : null,
        privateArea: privateArea !== undefined && privateArea !== null && privateArea !== '' ? parseFloat(String(privateArea)) : null,
        totalArea: totalArea !== undefined && totalArea !== null && totalArea !== '' ? parseFloat(String(totalArea)) : null,
      },
    });

    return NextResponse.json({ unit }, { status: 201 });
  } catch (error) {
    console.error('Erro ao cadastrar unidade no edifício:', error);
    return NextResponse.json({ error: 'Falha ao salvar unidade.' }, { status: 500 });
  }
}

