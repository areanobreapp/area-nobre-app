import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recalculateMatchesForDevelopment } from '@/lib/matching';
import { validateNonNegativeInt, validateNonNegativeFloat } from '@/lib/validation';
import { assertUserAcceptedTerms } from '@/lib/legal/service';
import {
  buildDevelopmentWhere,
  sanitizeDevelopmentForViewer,
  normalizeDevelopmentStatusInput,
  resolvePublicationStatus,
  DEVELOPMENT_BUILDING_SELECT,
  DEVELOPMENT_COMPANY_SELECT,
} from '@/lib/development-visibility';

const VALID_PROJECT_TYPES = ['VERTICAL', 'HORIZONTAL', 'MISTO', 'LOTEAMENTO'];

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const termsCheck = await assertUserAcceptedTerms(user);
    if (!termsCheck.allowed) {
      return termsCheck.errorResponse!;
    }

    const { searchParams } = new URL(req.url);

    // Camadas independentes (acesso, publicação, comercial, texto) combinadas com AND.
    // A pesquisa textual NUNCA substitui as restrições obrigatórias (Bloco 6A.6).
    const where = buildDevelopmentWhere(user, {
      search: searchParams.get('search'),
      stage: searchParams.get('stage'),
      status: searchParams.get('status') || searchParams.get('publicationStatus'),
      projectType: searchParams.get('projectType'),
      companyId: searchParams.get('companyId'),
      city: searchParams.get('city'),
      neighborhood: searchParams.get('neighborhood'),
      brokerId: searchParams.get('brokerId'),
      scope: searchParams.get('scope'),
    });
    const developments = await prisma.development.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        images: {
          orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
        },
        typologies: {
          orderBy: { price: 'asc' },
        },
        blocks: {
          orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        },
        company: {
          select: DEVELOPMENT_COMPANY_SELECT,
        },
        building: { select: DEVELOPMENT_BUILDING_SELECT },
        responsibleBroker: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            profile: {
              select: {
                commercialName: true,
                phone: true,
                creci: true,
                avatarUrl: true,
                logoUrl: true,
                city: true,
                tagline: true,
              },
            },
          },
        },
        _count: {
          select: { typologies: true, blocks: true },
        },
      },
    });

    const isUserAdmin = user.role === 'ADMIN';
    const sanitizedDevelopments = developments.map((d) => sanitizeDevelopmentForViewer(d, user));

    return NextResponse.json({
      success: true,
      developments: sanitizedDevelopments,
      canManage: isUserAdmin, // Somente ADMIN cadastra/edita empreendimentos (Bloco 6)
    });
  } catch (error) {
    console.error('Erro ao listar empreendimentos:', error);
    return NextResponse.json({ error: 'Falha ao buscar empreendimentos.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'NÃ£o autorizado.' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Apenas administradores podem cadastrar novos empreendimentos de construtoras.' },
        { status: 403 }
      );
    }

    const termsCheck = await assertUserAcceptedTerms(user);
    if (!termsCheck.allowed) {
      return termsCheck.errorResponse!;
    }

    const body = await req.json();
    const {
      name,
      developer,
      companyId,
      projectType,
      totalTowers,
      totalUnits,
      stage,
      deliveryDate,
      deliveryYear,
      deliveryMonth,
      indexCorrection,
      status,
      publicationStatus,
      description,
      internalNotes,
      address,
      number,
      complement,
      neighborhood,
      city,
      state,
      zipcode,
      latitude,
      longitude,
      buildingId,
      hasPool,
      hasGym,
      hasPartyHall,
      hasPetSpace,
      hasElevator,
      hasDirectInstallments,
      images, // array de URLs de fotos
      typologies, // array de objetos de tipologias
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome do empreendimento é obrigatório.' }, { status: 400 });
    }
    if (!companyId?.trim()) {
      return NextResponse.json({ error: 'É obrigatório selecionar uma construtora parceira cadastrada (companyId).' }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId.trim() },
    });
    if (!company) {
      return NextResponse.json({ error: 'Construtora selecionada não existe no cadastro.' }, { status: 404 });
    }
    if (company.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'A construtora selecionada está inativa e não pode receber novos empreendimentos.' }, { status: 400 });
    }

    if (!stage?.trim()) {
      return NextResponse.json({ error: 'Estágio da obra é obrigatório.' }, { status: 400 });
    }

    const resolvedProjectType = projectType ? String(projectType).trim().toUpperCase() : 'VERTICAL';
    if (!VALID_PROJECT_TYPES.includes(resolvedProjectType)) {
      return NextResponse.json(
        { error: `Tipo de projeto inválido. Valores aceitos: ${VALID_PROJECT_TYPES.join(', ')}.` },
        { status: 400 }
      );
    }

    const vTowers = validateNonNegativeInt(totalTowers, 'Quantidade de torres/quadras');
    if (vTowers.error) return NextResponse.json({ error: vTowers.error }, { status: 400 });

    const vUnits = validateNonNegativeInt(totalUnits, 'Total estimado de unidades');
    if (vUnits.error) return NextResponse.json({ error: vUnits.error }, { status: 400 });

    let resolvedDeliveryMonth: number | null = null;
    if (deliveryMonth !== undefined && deliveryMonth !== null && String(deliveryMonth).trim() !== '') {
      const m = parseInt(String(deliveryMonth), 10);
      if (isNaN(m) || m < 1 || m > 12) {
        return NextResponse.json({ error: 'Mês de entrega inválido (1 a 12).' }, { status: 400 });
      }
      resolvedDeliveryMonth = m;
    }

    let resolvedDeliveryYear: number | null = null;
    if (deliveryYear !== undefined && deliveryYear !== null && String(deliveryYear).trim() !== '') {
      const y = parseInt(String(deliveryYear), 10);
      if (isNaN(y) || y < 1990 || y > 2100) {
        return NextResponse.json({ error: 'Ano de entrega inválido.' }, { status: 400 });
      }
      resolvedDeliveryYear = y;
    }

    let resolvedDeliveryDate = deliveryDate?.trim() || null;
    if (!resolvedDeliveryDate && resolvedDeliveryYear) {
      resolvedDeliveryDate = resolvedDeliveryMonth
        ? `${String(resolvedDeliveryMonth).padStart(2, '0')}/${resolvedDeliveryYear}`
        : `${resolvedDeliveryYear}`;
    }

    let resolvedBuildingId: string | null = null;
    if (buildingId && typeof buildingId === 'string' && buildingId.trim()) {
      const building = await prisma.building.findUnique({ where: { id: buildingId.trim() } });
      if (!building) {
        return NextResponse.json({ error: 'Edifício da base cartográfica não encontrado.' }, { status: 404 });
      }
      resolvedBuildingId = building.id;
    }

    const resolvedStatus = normalizeDevelopmentStatusInput(status, publicationStatus);

    // Valida tipologias se fornecidas
    const validatedTypologies = [];
    if (typologies && Array.isArray(typologies)) {
      for (let i = 0; i < typologies.length; i++) {
        const t = typologies[i];
        const tipLabel = t.name?.trim() ? `Tipologia "${t.name.trim()}": ` : `Tipologia #${i + 1}: `;

        const vSuites = validateNonNegativeInt(t.suites, 'SuÃ­tes', { defaultValue: 0 });
        if (vSuites.error) return NextResponse.json({ error: `${tipLabel}${vSuites.error}` }, { status: 400 });

        const vOtherBedrooms = validateNonNegativeInt(t.otherBedrooms, 'Demais quartos');
        if (vOtherBedrooms.error) return NextResponse.json({ error: `${tipLabel}${vOtherBedrooms.error}` }, { status: 400 });

        const vBedrooms = validateNonNegativeInt(t.bedrooms, 'Total de quartos');
        if (vBedrooms.error) return NextResponse.json({ error: `${tipLabel}${vBedrooms.error}` }, { status: 400 });

        const vSocialBathrooms = validateNonNegativeInt(t.socialBathrooms, 'Banheiros sociais');
        if (vSocialBathrooms.error) return NextResponse.json({ error: `${tipLabel}${vSocialBathrooms.error}` }, { status: 400 });

        const vLavabos = validateNonNegativeInt(t.lavabos, 'Lavabos');
        if (vLavabos.error) return NextResponse.json({ error: `${tipLabel}${vLavabos.error}` }, { status: 400 });

        const vBathrooms = validateNonNegativeInt(t.bathrooms, 'Total de banheiros');
        if (vBathrooms.error) return NextResponse.json({ error: `${tipLabel}${vBathrooms.error}` }, { status: 400 });

        const vCovered = validateNonNegativeInt(t.coveredParkingSpaces, 'Vagas cobertas');
        if (vCovered.error) return NextResponse.json({ error: `${tipLabel}${vCovered.error}` }, { status: 400 });

        const vUncovered = validateNonNegativeInt(t.uncoveredParkingSpaces, 'Vagas descobertas');
        if (vUncovered.error) return NextResponse.json({ error: `${tipLabel}${vUncovered.error}` }, { status: 400 });

        const vParkingSpaces = validateNonNegativeInt(t.parkingSpaces, 'Total de vagas');
        if (vParkingSpaces.error) return NextResponse.json({ error: `${tipLabel}${vParkingSpaces.error}` }, { status: 400 });

        const vPrice = validateNonNegativeFloat(t.price, 'Valor', { isCurrencyString: true, defaultValue: 0 });
        if (vPrice.error) return NextResponse.json({ error: `${tipLabel}${vPrice.error}` }, { status: 400 });

        const vPrivateArea = validateNonNegativeFloat(t.privateArea, 'Ãrea privativa');
        if (vPrivateArea.error) return NextResponse.json({ error: `${tipLabel}${vPrivateArea.error}` }, { status: 400 });

        const vBuiltArea = validateNonNegativeFloat(t.builtArea, 'Ãrea construÃ­da');
        if (vBuiltArea.error) return NextResponse.json({ error: `${tipLabel}${vBuiltArea.error}` }, { status: 400 });

        const vTotalArea = validateNonNegativeFloat(t.totalArea, 'Ãrea total');
        if (vTotalArea.error) return NextResponse.json({ error: `${tipLabel}${vTotalArea.error}` }, { status: 400 });

        const suites = vSuites.value ?? 0;
        const otherBedrooms = vOtherBedrooms.value;
        const bedrooms = otherBedrooms !== null
          ? suites + otherBedrooms
          : (vBedrooms.value !== null ? vBedrooms.value : suites);

        const socialBathrooms = vSocialBathrooms.value;
        const lavabos = vLavabos.value;
        let bathrooms = vBathrooms.value !== null ? vBathrooms.value : suites;
        if (socialBathrooms !== null || lavabos !== null) {
          bathrooms = suites + (socialBathrooms ?? 0) + (lavabos ?? 0);
        }

        const coveredParkingSpaces = vCovered.value;
        const uncoveredParkingSpaces = vUncovered.value;
        let parkingSpaces = vParkingSpaces.value !== null ? vParkingSpaces.value : 0;
        if (coveredParkingSpaces !== null || uncoveredParkingSpaces !== null) {
          parkingSpaces = (coveredParkingSpaces ?? 0) + (uncoveredParkingSpaces ?? 0);
        }

        validatedTypologies.push({
          name: t.name?.trim() || 'Tipologia',
          propertyType: t.propertyType || 'Apartamento',
          price: vPrice.value ?? 0,
          privateArea: vPrivateArea.value,
          builtArea: vBuiltArea.value,
          totalArea: vTotalArea.value,
          bedrooms,
          suites,
          otherBedrooms,
          bathrooms,
          socialBathrooms,
          lavabos,
          parkingSpaces,
          coveredParkingSpaces,
          uncoveredParkingSpaces,
          status: t.status || 'DisponÃ­vel',
          notes: t.notes?.trim() || null,
          acceptsExchange: t.acceptsExchange !== undefined ? Boolean(t.acceptsExchange) : null,
          exchangeNotes: t.exchangeNotes?.trim() || null,
          hasBarbecue: t.hasBarbecue !== undefined ? Boolean(t.hasBarbecue) : null,
          hasElevator: t.hasElevator !== undefined ? Boolean(t.hasElevator) : null,
          isPenthouse: t.isPenthouse !== undefined ? Boolean(t.isPenthouse) : null,
        });
      }
    }

    const parsedLat =
      latitude !== undefined && latitude !== null && String(latitude).trim() !== ''
        ? parseFloat(String(latitude))
        : null;
    const parsedLng =
      longitude !== undefined && longitude !== null && String(longitude).trim() !== ''
        ? parseFloat(String(longitude))
        : null;

    const development = await prisma.development.create({
      data: {
        userId: user.id,
        responsibleBrokerId: user.id,
        name: name.trim(),
        developer: company.tradeName || company.name,
        companyId: company.id,
        projectType: resolvedProjectType,
        totalTowers: vTowers.value ?? null,
        totalUnits: vUnits.value ?? null,
        stage: stage.trim(),
        deliveryDate: resolvedDeliveryDate,
        deliveryYear: resolvedDeliveryYear,
        deliveryMonth: resolvedDeliveryMonth,
        indexCorrection: indexCorrection?.trim() || null,
        status: resolvedStatus,
        description: description?.trim() || null,
        internalNotes: internalNotes?.trim() || null,
        address: address?.trim() || null,
        number: number?.trim() || null,
        complement: complement?.trim() || null,
        neighborhood: neighborhood?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() ? state.trim().toUpperCase() : null,
        zipcode: zipcode?.trim() || null,
        latitude: parsedLat !== null && !isNaN(parsedLat) ? parsedLat : null,
        longitude: parsedLng !== null && !isNaN(parsedLng) ? parsedLng : null,
        buildingId: resolvedBuildingId,
        hasPool: hasPool !== undefined && hasPool !== null ? Boolean(hasPool) : null,
        hasGym: hasGym !== undefined && hasGym !== null ? Boolean(hasGym) : null,
        hasPartyHall: hasPartyHall !== undefined && hasPartyHall !== null ? Boolean(hasPartyHall) : null,
        hasPetSpace: hasPetSpace !== undefined && hasPetSpace !== null ? Boolean(hasPetSpace) : null,
        hasElevator: hasElevator !== undefined && hasElevator !== null ? Boolean(hasElevator) : null,
        hasDirectInstallments:
          hasDirectInstallments !== undefined && hasDirectInstallments !== null
            ? Boolean(hasDirectInstallments)
            : null,
        images: {
          create: (images || [])
            .map((img: any, index: number) => {
              const url = typeof img === 'string' ? img.trim() : String(img?.url || '').trim();
              if (!url) return null;
              const isCover =
                typeof img === 'object' && img !== null && typeof img.isCover === 'boolean'
                  ? img.isCover
                  : index === 0;
              return {
                url,
                isCover,
                order: index,
              };
            })
            .filter(Boolean) as { url: string; isCover: boolean; order: number }[],
        },
        typologies: {
          create: validatedTypologies,
        },
      },
      include: {
        company: { select: DEVELOPMENT_COMPANY_SELECT },
        building: { select: DEVELOPMENT_BUILDING_SELECT },
        images: { orderBy: [{ isCover: 'desc' }, { order: 'asc' }] },
        typologies: { orderBy: { price: 'asc' } },
        blocks: { orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }] },
      },
    });

    // Recalcula matches imediatamente para todas as tipologias cadastradas
    await recalculateMatchesForDevelopment(development.id);

    return NextResponse.json({
      success: true,
      development: {
        ...development,
        publicationStatus: resolvePublicationStatus(development.status),
      },
    });
  } catch (error) {
    console.error('Erro ao cadastrar empreendimento:', error);
    return NextResponse.json({ error: 'Falha ao salvar empreendimento.' }, { status: 500 });
  }
}
