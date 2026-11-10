import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { normalizeUnitNumber, normalizeTower } from '@/lib/building-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const unitNumberParam = searchParams.get('unitNumber');
    const towerParam = searchParams.get('tower');

    // Se informou unitNumber, faz consulta pontual de vagas e preço compartilhado da unidade
    if (unitNumberParam) {
      const normalizedUnit = normalizeUnitNumber(unitNumberParam);
      const normalizedTower = normalizeTower(towerParam);

      const unit = await prisma.buildingUnit.findFirst({
        where: {
          buildingId: id,
          normalizedUnit,
          ...(normalizedTower ? { tower: normalizedTower } : {}),
        },
        include: {
          physicalProperty: {
            include: {
              listings: {
                where: { status: 'Disponível' },
                select: {
                  id: true,
                  userId: true,
                  responsibleBrokerId: true,
                  isPrimaryListing: true,
                  listingSlot: true,
                  price: true,
                  createdAt: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                      profile: {
                        select: {
                          commercialName: true,
                          creci: true,
                        },
                      },
                    },
                  },
                },
              },
              waitlist: {
                where: {
                  status: { in: ['WAITING', 'PENDING_NOTIFICATION', 'OFFERED'] },
                },
                select: { id: true, brokerId: true, status: true, position: true },
              },
            },
          },
        },
      });

      if (!unit || !unit.physicalProperty) {
        return NextResponse.json({
          unitExists: !!unit,
          unit: unit ? { id: unit.id, unitNumber: unit.unitNumber, tower: unit.tower, floor: unit.floor } : null,
          hasPhysicalProperty: false,
          activeListingsCount: 0,
          availableSlots: 3,
          isPrimaryEligible: true,
          sharedPrice: null,
          isFull: false,
          userHasActiveListing: false,
          userHasWaitlist: false,
          userWaitlistPosition: null,
          otherBrokers: [],
          waitlistCount: 0,
        });
      }

      const activeListings = unit.physicalProperty.listings || [];
      const activeCount = unit.physicalProperty.activeListingsCount ?? activeListings.length;
      const userHasActive = activeListings.some(
        (l) => l.userId === user.id || l.responsibleBrokerId === user.id
      );
      const isFull = activeCount >= 3;
      const sharedPrice = unit.physicalProperty.sharedPrice
        ? Number(unit.physicalProperty.sharedPrice)
        : activeListings[0]?.price ?? null;

      const userWaitlistEntry = unit.physicalProperty.waitlist?.find((w) => w.brokerId === user.id);

      const otherBrokers = activeListings.map((l) => ({
        listingId: l.id,
        isPrimary: l.isPrimaryListing,
        slot: l.listingSlot,
        brokerId: l.user?.id,
        brokerName: l.user?.name || 'Corretor Parceiro',
        commercialName: l.user?.profile?.commercialName || null,
        creci: l.user?.profile?.creci || null,
      }));

      return NextResponse.json({
        unitExists: true,
        unit: { id: unit.id, unitNumber: unit.unitNumber, tower: unit.tower, floor: unit.floor },
        hasPhysicalProperty: true,
        physicalPropertyId: unit.physicalProperty.id,
        activeListingsCount: activeCount,
        availableSlots: Math.max(0, 3 - activeCount),
        isPrimaryEligible: activeCount === 0,
        sharedPrice,
        isFull,
        userHasActiveListing: userHasActive,
        userHasWaitlist: !!userWaitlistEntry,
        userWaitlistPosition: userWaitlistEntry?.position ?? null,
        otherBrokers,
        waitlistCount: unit.physicalProperty.waitlist?.length || 0,
      });
    }

    // Listagem geral de unidades do edifício
    const units = await prisma.buildingUnit.findMany({
      where: { buildingId: id },
      include: {
        physicalProperty: {
          select: {
            id: true,
            activeListingsCount: true,
            sharedPrice: true,
            primaryListingId: true,
          },
        },
      },
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

