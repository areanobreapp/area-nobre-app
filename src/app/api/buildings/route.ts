import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  normalizeBuildingName,
  normalizeAddressStreet,
  normalizeAddressNumber,
} from '@/lib/building-service';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status');
    const verified = searchParams.get('verified');
    const city = searchParams.get('city')?.trim();
    const neighborhood = searchParams.get('neighborhood')?.trim();
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30', 10)));

    const where: any = {};

    // Filtros de status (corretores veem apenas edifícios ativos; administradores podem filtrar)
    if (user.role === 'ADMIN') {
      if (status && status !== 'ALL' && status !== 'Todos') {
        where.status = status;
      }
      if (verified === 'true') {
        where.verifiedByAdmin = true;
      } else if (verified === 'false') {
        where.verifiedByAdmin = false;
      }
    } else {
      where.status = 'ACTIVE';
    }

    if (city) {
      where.city = { equals: city, mode: 'insensitive' };
    }

    if (neighborhood) {
      where.neighborhood = { equals: neighborhood, mode: 'insensitive' };
    }

    if (search) {
      const normalizedQuery = normalizeBuildingName(search);
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { normalizedName: { contains: normalizedQuery } },
        { address: { contains: search, mode: 'insensitive' } },
        { neighborhood: { contains: search, mode: 'insensitive' } },
      ];
    }

    const buildings = await prisma.building.findMany({
      where,
      take: limit,
      orderBy: [
        { verifiedByAdmin: 'desc' },
        { name: 'asc' },
      ],
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
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

    return NextResponse.json({
      buildings,
      total: buildings.length,
    });
  } catch (error) {
    console.error('Erro ao listar edifícios:', error);
    return NextResponse.json({ error: 'Falha ao buscar edifícios.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
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
    } = body;

    // Validações obrigatórias
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'O nome do edifício deve conter pelo menos 2 caracteres.' }, { status: 400 });
    }

    if (!address || typeof address !== 'string' || !address.trim()) {
      return NextResponse.json({ error: 'O logradouro/endereço do edifício é obrigatório.' }, { status: 400 });
    }

    if (!neighborhood || typeof neighborhood !== 'string' || !neighborhood.trim()) {
      return NextResponse.json({ error: 'O bairro do edifício é obrigatório.' }, { status: 400 });
    }

    const lat = typeof latitude === 'number' ? latitude : parseFloat(latitude);
    const lng = typeof longitude === 'number' ? longitude : parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
      return NextResponse.json({ error: 'Coordenadas geográficas inválidas para a localização do edifício.' }, { status: 400 });
    }

    const normalizedName = normalizeBuildingName(name);
    const effectiveCity = city?.trim() || 'Criciúma';
    const effectiveState = state?.trim() || 'SC';
    const effectiveNeighborhood = neighborhood.trim();

    // 1. Verificação de Duplicidade (Prevenção de Cadastros Repetidos)
    // Avalia nome normalizado, cidade, bairro e endereço (logradouro e número)
    // para evitar falsos positivos entre edifícios de nomes parecidos ou fases em locais distintos.
    const candidates = await prisma.building.findMany({
      where: {
        normalizedName,
        city: { equals: effectiveCity, mode: 'insensitive' },
        status: { in: ['ACTIVE', 'PENDING_REVIEW'] },
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    const normalizedReqStreet = normalizeAddressStreet(address);
    const normalizedReqNumber = normalizeAddressNumber(number);

    const duplicate = candidates.find((cand) => {
      const candStreet = normalizeAddressStreet(cand.address);
      const candNumber = normalizeAddressNumber(cand.number);

      // Se o logradouro normalizado for idêntico
      if (candStreet && normalizedReqStreet && candStreet === normalizedReqStreet) {
        // Se ambos especificaram número e os números são distintos, são edifícios/fases distintas na mesma rua
        if (candNumber && normalizedReqNumber && candNumber !== normalizedReqNumber) {
          return false;
        }
        return true; // Mesmo logradouro e mesmo número (ou sem número discriminado)
      }

      // Se o logradouro não for idêntico, verifica o bairro
      const sameNeighborhood = Boolean(cand.neighborhood && cand.neighborhood.trim().toLowerCase() === effectiveNeighborhood.toLowerCase());
      if (sameNeighborhood) {
        // Se ambos têm logradouros informados e são claramente diferentes (ex: "Raymundo Pícolo" vs "Almirante Barroso"),
        // são edifícios diferentes no mesmo bairro (fases distintas ou empreendimentos com nomes similares).
        if (candStreet && normalizedReqStreet && candStreet !== normalizedReqStreet) {
          return false;
        }
        // Se um deles não informou rua com clareza, considera duplicidade de segurança no mesmo bairro
        return true;
      }

      return false;
    });

    if (duplicate) {
      return NextResponse.json(
        {
          error: `Já existe um edifício cadastrado como "${duplicate.name}" no endereço ${duplicate.address}${duplicate.number ? ', ' + duplicate.number : ''} (${duplicate.neighborhood}).`,
          duplicate,
        },
        { status: 409 }
      );
    }

    // Se towers for array, converte para JSON string
    let serializedTowers: string | null = null;
    if (Array.isArray(towers)) {
      serializedTowers = JSON.stringify(towers.filter((t) => typeof t === 'string' && t.trim().length > 0));
    } else if (typeof towers === 'string' && towers.trim()) {
      serializedTowers = JSON.stringify([towers.trim()]);
    }

    const isAdmin = user.role === 'ADMIN';

    const building = await prisma.building.create({
      data: {
        name: name.trim(),
        normalizedName,
        address: address.trim(),
        number: number?.trim() || null,
        neighborhood: effectiveNeighborhood,
        city: effectiveCity,
        state: effectiveState,
        zipcode: zipcode?.trim() || null,
        latitude: lat,
        longitude: lng,
        totalFloors: totalFloors !== undefined && totalFloors !== null && totalFloors !== '' ? parseInt(String(totalFloors), 10) : null,
        unitsPerFloor: unitsPerFloor !== undefined && unitsPerFloor !== null && unitsPerFloor !== '' ? parseInt(String(unitsPerFloor), 10) : null,
        towers: serializedTowers,
        landRegistryNumber: landRegistryNumber?.trim() || null,
        landRegistryOffice: landRegistryOffice?.trim() || null,
        hasPool: hasPool === true || hasPool === 'true',
        hasGym: hasGym === true || hasGym === 'true',
        hasPartyHall: hasPartyHall === true || hasPartyHall === 'true',
        hasElevator: hasElevator === true || hasElevator === 'true',
        hasPetSpace: hasPetSpace === true || hasPetSpace === 'true',
        hasBarbecue: hasBarbecue === true || hasBarbecue === 'true',
        coverImageUrl: coverImageUrl || null,
        status: 'ACTIVE',
        verifiedByAdmin: isAdmin, // Corretores criam com verifiedByAdmin: false para revisão posterior
        createdById: user.id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: isAdmin
          ? 'Edifício cadastrado e verificado com sucesso.'
          : 'Edifício cadastrado com sucesso. Disponível imediatamente para uso e sinalizado para revisão administrativa.',
        building,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao cadastrar edifício:', error);
    return NextResponse.json({ error: 'Falha ao salvar edifício.' }, { status: 500 });
  }
}

