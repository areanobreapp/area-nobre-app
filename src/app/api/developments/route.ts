import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recalculateMatchesForDevelopment } from '@/lib/matching';
import { validateNonNegativeInt, validateNonNegativeFloat } from '@/lib/validation';
import { assertUserAcceptedTerms } from '@/lib/legal/service';

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
    const search = searchParams.get('search')?.trim();
    const stage = searchParams.get('stage');
    const status = searchParams.get('status');

    const brokerId = searchParams.get('brokerId');
    const viewAll = searchParams.get('all') === 'true';
    const scope = searchParams.get('scope'); // 'shared' | 'mine'

    const where: any = {};
    const isSharedQuery = scope === 'shared' || (user.role === 'ADMIN' && viewAll);

    if (user.role === 'ADMIN' && brokerId) {
      where.responsibleBrokerId = brokerId;
    } else if (isSharedQuery) {
      where.OR = [
        { responsibleBroker: { status: 'ACTIVE' } },
        { responsibleBrokerId: null, user: { status: 'ACTIVE' } },
      ];
    } else {
      where.OR = [
        { userId: user.id },
        { responsibleBrokerId: user.id },
      ];
    }

    if (stage && stage !== 'Todos') {
      where.stage = stage;
    }

    if (status && status !== 'Todos') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { developer: { contains: search } },
        { neighborhood: { contains: search } },
        { city: { contains: search } },
        { address: { contains: search } },
      ];
    }

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
          select: { typologies: true },
        },
      },
    });

    const isUserAdmin = user.role === 'ADMIN';
    const sanitizedDevelopments = developments.map((d) => {
      const isOwner = d.responsibleBrokerId === user.id || d.userId === user.id || isUserAdmin;
      if (isOwner) return d;
      return {
        ...d,
        typologies: d.typologies?.map((t) => ({
          ...t,
          notes: null,
        })),
      };
    });

    return NextResponse.json({ success: true, developments: sanitizedDevelopments });
  } catch (error) {
    console.error('Erro ao listar empreendimentos:', error);
    return NextResponse.json({ error: 'Falha ao buscar empreendimentos.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const termsCheck = await assertUserAcceptedTerms(user);
    if (!termsCheck.allowed) {
      return termsCheck.errorResponse!;
    }

    const body = await req.json();
    const {
      name,
      developer,
      stage,
      deliveryDate,
      status,
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
    if (!developer?.trim()) {
      return NextResponse.json({ error: 'Nome da construtora é obrigatório.' }, { status: 400 });
    }
    if (!stage?.trim()) {
      return NextResponse.json({ error: 'Estágio da obra é obrigatório.' }, { status: 400 });
    }

    // Valida tipologias se fornecidas
    const validatedTypologies = [];
    if (typologies && Array.isArray(typologies)) {
      for (let i = 0; i < typologies.length; i++) {
        const t = typologies[i];
        const tipLabel = t.name?.trim() ? `Tipologia "${t.name.trim()}": ` : `Tipologia #${i + 1}: `;

        const vSuites = validateNonNegativeInt(t.suites, 'Suítes', { defaultValue: 0 });
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

        const vPrivateArea = validateNonNegativeFloat(t.privateArea, 'Área privativa');
        if (vPrivateArea.error) return NextResponse.json({ error: `${tipLabel}${vPrivateArea.error}` }, { status: 400 });

        const vBuiltArea = validateNonNegativeFloat(t.builtArea, 'Área construída');
        if (vBuiltArea.error) return NextResponse.json({ error: `${tipLabel}${vBuiltArea.error}` }, { status: 400 });

        const vTotalArea = validateNonNegativeFloat(t.totalArea, 'Área total');
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
          status: t.status || 'Disponível',
          notes: t.notes?.trim() || null,
          acceptsExchange: t.acceptsExchange !== undefined ? Boolean(t.acceptsExchange) : null,
          exchangeNotes: t.exchangeNotes?.trim() || null,
          hasBarbecue: t.hasBarbecue !== undefined ? Boolean(t.hasBarbecue) : null,
          hasElevator: t.hasElevator !== undefined ? Boolean(t.hasElevator) : null,
          isPenthouse: t.isPenthouse !== undefined ? Boolean(t.isPenthouse) : null,
        });
      }
    }

    const development = await prisma.development.create({
      data: {
        userId: user.id,
        responsibleBrokerId: user.id,
        name: name.trim(),
        developer: developer.trim(),
        stage: stage.trim(),
        deliveryDate: deliveryDate?.trim() || null,
        status: status || 'Ativo',
        description: description?.trim() || null,
        internalNotes: internalNotes?.trim() || null,
        address: address?.trim() || null,
        number: number?.trim() || null,
        complement: complement?.trim() || null,
        neighborhood: neighborhood?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        zipcode: zipcode?.trim() || null,
        latitude: latitude ? parseFloat(String(latitude)) : null,
        longitude: longitude ? parseFloat(String(longitude)) : null,
        hasPool: hasPool !== undefined ? Boolean(hasPool) : null,
        hasGym: hasGym !== undefined ? Boolean(hasGym) : null,
        hasPartyHall: hasPartyHall !== undefined ? Boolean(hasPartyHall) : null,
        hasPetSpace: hasPetSpace !== undefined ? Boolean(hasPetSpace) : null,
        hasElevator: hasElevator !== undefined ? Boolean(hasElevator) : null,
        hasDirectInstallments: hasDirectInstallments !== undefined ? Boolean(hasDirectInstallments) : null,
        images: {
          create: (images || []).map((url: string, index: number) => ({
            url,
            isCover: index === 0,
            order: index,
          })),
        },
        typologies: {
          create: validatedTypologies,
        },
      },
      include: {
        images: true,
        typologies: true,
      },
    });

    // Recalcula matches imediatamente para todas as tipologias cadastradas
    await recalculateMatchesForDevelopment(development.id);

    return NextResponse.json({ success: true, development });
  } catch (error) {
    console.error('Erro ao cadastrar empreendimento:', error);
    return NextResponse.json({ error: 'Falha ao salvar empreendimento.' }, { status: 500 });
  }
}
