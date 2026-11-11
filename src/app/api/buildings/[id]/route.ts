import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { normalizeBuildingName } from '@/lib/building-service';

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
    const building = await prisma.building.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        units: {
          orderBy: [
            { tower: 'asc' },
            { floor: 'asc' },
            { unitNumber: 'asc' },
          ],
          select: {
            id: true,
            unitNumber: true,
            normalizedUnit: true,
            tower: true,
            floor: true,
            privateArea: true,
            totalArea: true,
            bedrooms: true,
            suites: true,
            bathrooms: true,
            parkingSpaces: true,
            physicalPropertyId: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            units: true,
            properties: true,
          },
        },
      },
    });

    if (!building) {
      return NextResponse.json({ error: 'Edifício não encontrado.' }, { status: 404 });
    }

    // Busca dados complementares de terreno coletivo e auditoria de fachada (Etapa J.2.C)
    let boundaryData: any = {};
    try {
      const extra: any = await prisma.$queryRawUnsafe(`
        SELECT "boundary", "boundaryArea", "boundaryValidationStatus", "coverImageValidationStatus"
        FROM "Building"
        WHERE "id" = $1
      `, id);
      if (extra && extra[0]) {
        boundaryData = extra[0];
      }
    } catch {}

    const enrichedBuilding = {
      ...building,
      boundary: (building as any).boundary ?? boundaryData.boundary ?? null,
      boundaryArea: (building as any).boundaryArea ?? boundaryData.boundaryArea ?? null,
      boundaryValidationStatus: (building as any).boundaryValidationStatus ?? boundaryData.boundaryValidationStatus ?? 'UNVERIFIED',
      coverImageValidationStatus: (building as any).coverImageValidationStatus ?? boundaryData.coverImageValidationStatus ?? 'UNVERIFIED',
    };

    return NextResponse.json({ building: enrichedBuilding });
  } catch (error) {
    console.error('Erro ao buscar edifício:', error);
    return NextResponse.json({ error: 'Falha ao buscar dados do edifício.' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.building.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Edifício não encontrado.' }, { status: 404 });
    }

    const isAdmin = user.role === 'ADMIN';

    // Regra de autorização colaborativa:
    // Corretores só podem alterar o edifício se foram eles que criaram E o registro ainda não foi homologado pelo ADMIN.
    if (!isAdmin) {
      if (existing.createdById !== user.id) {
        return NextResponse.json(
          { error: 'Você não tem permissão para alterar dados de um edifício cadastrado por outro usuário.' },
          { status: 403 }
        );
      }
      if (existing.verifiedByAdmin) {
        return NextResponse.json(
          { error: 'Este edifício já foi verificado e homologado pela administração e não pode ser alterado livremente.' },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const {
      name,
      address,
      number,
      neighborhood,
      city,
      state,
      zipcode,
      latitude,
      longitude,
      totalFloors,
      unitsPerFloor,
      towers,
      landRegistryNumber,
      landRegistryOffice,
      hasPool,
      hasGym,
      hasPartyHall,
      hasElevator,
      hasPetSpace,
      hasBarbecue,
      coverImageUrl,
      status,
      verifiedByAdmin,
    } = body;

    const dataToUpdate: any = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return NextResponse.json({ error: 'O nome do edifício deve conter pelo menos 2 caracteres.' }, { status: 400 });
      }
      dataToUpdate.name = name.trim();
      dataToUpdate.normalizedName = normalizeBuildingName(name);
    }

    if (address !== undefined) {
      dataToUpdate.address = String(address).trim();
    }

    if (number !== undefined) {
      dataToUpdate.number = number ? String(number).trim() : null;
    }

    if (neighborhood !== undefined) {
      dataToUpdate.neighborhood = String(neighborhood).trim();
    }

    if (city !== undefined) {
      dataToUpdate.city = String(city).trim();
    }

    if (state !== undefined) {
      dataToUpdate.state = String(state).trim();
    }

    if (zipcode !== undefined) {
      dataToUpdate.zipcode = zipcode ? String(zipcode).trim() : null;
    }

    if (latitude !== undefined && longitude !== undefined) {
      const lat = typeof latitude === 'number' ? latitude : parseFloat(latitude);
      const lng = typeof longitude === 'number' ? longitude : parseFloat(longitude);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        dataToUpdate.latitude = lat;
        dataToUpdate.longitude = lng;
      }
    }

    if (totalFloors !== undefined) {
      dataToUpdate.totalFloors = totalFloors !== null && totalFloors !== '' ? parseInt(String(totalFloors), 10) : null;
    }

    if (unitsPerFloor !== undefined) {
      dataToUpdate.unitsPerFloor = unitsPerFloor !== null && unitsPerFloor !== '' ? parseInt(String(unitsPerFloor), 10) : null;
    }

    if (towers !== undefined) {
      if (Array.isArray(towers)) {
        dataToUpdate.towers = JSON.stringify(towers.filter((t) => typeof t === 'string' && t.trim().length > 0));
      } else if (typeof towers === 'string') {
        dataToUpdate.towers = towers.trim() ? JSON.stringify([towers.trim()]) : null;
      } else {
        dataToUpdate.towers = null;
      }
    }

    if (landRegistryNumber !== undefined) {
      dataToUpdate.landRegistryNumber = landRegistryNumber ? String(landRegistryNumber).trim() : null;
    }

    if (landRegistryOffice !== undefined) {
      dataToUpdate.landRegistryOffice = landRegistryOffice ? String(landRegistryOffice).trim() : null;
    }

    if (hasPool !== undefined) dataToUpdate.hasPool = Boolean(hasPool);
    if (hasGym !== undefined) dataToUpdate.hasGym = Boolean(hasGym);
    if (hasPartyHall !== undefined) dataToUpdate.hasPartyHall = Boolean(hasPartyHall);
    if (hasElevator !== undefined) dataToUpdate.hasElevator = Boolean(hasElevator);
    if (hasPetSpace !== undefined) dataToUpdate.hasPetSpace = Boolean(hasPetSpace);
    if (hasBarbecue !== undefined) dataToUpdate.hasBarbecue = Boolean(hasBarbecue);
    if (coverImageUrl !== undefined) dataToUpdate.coverImageUrl = coverImageUrl || null;

    // Campos de governança exclusivos de administradores
    if (isAdmin) {
      if (status !== undefined && ['ACTIVE', 'PENDING_REVIEW', 'MERGED', 'INACTIVE'].includes(status)) {
        dataToUpdate.status = status;
      }
      if (verifiedByAdmin !== undefined) {
        dataToUpdate.verifiedByAdmin = Boolean(verifiedByAdmin);
      }
    }

    const updated = await prisma.building.update({
      where: { id },
      data: dataToUpdate,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    return NextResponse.json({
      message: 'Edifício atualizado com sucesso.',
      building: updated,
    });
  } catch (error) {
    console.error('Erro ao atualizar edifício:', error);
    return NextResponse.json({ error: 'Falha ao salvar alterações do edifício.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas administradores podem excluir edifícios.' }, { status: 403 });
    }

    const { id } = await params;

    const building = await prisma.building.findUnique({
      where: { id },
      include: {
        _count: {
          select: { properties: true, units: true },
        },
      },
    });

    if (!building) {
      return NextResponse.json({ error: 'Edifício não encontrado.' }, { status: 404 });
    }

    if (building._count.properties > 0) {
      return NextResponse.json(
        {
          error: `Não é possível excluir o edifício "${building.name}" pois ele possui ${building._count.properties} imóvel(is) vinculado(s). Altere o status para Inativo se desejar ocultá-lo.`,
        },
        { status: 400 }
      );
    }

    await prisma.building.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Edifício excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir edifício:', error);
    return NextResponse.json({ error: 'Falha ao excluir edifício.' }, { status: 500 });
  }
}

