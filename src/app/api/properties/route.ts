import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recalculateMatchesForProperty } from '@/lib/matching';
import { getGeoProvider } from '@/lib/geo';
import { validateNonNegativeInt, validateNonNegativeFloat } from '@/lib/validation';
import { recordPropertyAuthorization, assertUserAcceptedTerms } from '@/lib/legal/service';
import { isLand } from '@/lib/property-display';

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
    const status = searchParams.get('status');
    const propertyType = searchParams.get('type');
    const purpose = searchParams.get('purpose');

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

    if (status && status !== 'Todos') {
      where.status = status;
    }

    if (propertyType && propertyType !== 'Todos') {
      where.propertyType = propertyType;
    }

    if (purpose && purpose !== 'Todos') {
      where.purpose = purpose;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { internalCode: { contains: search } },
        { neighborhood: { contains: search } },
        { city: { contains: search } },
        { address: { contains: search } },
      ];
    }

    const properties = await prisma.property.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        images: {
          orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
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
          select: { matches: true },
        },
      },
    });

    const isUserAdmin = user.role === 'ADMIN';
    const sanitizedProperties = properties.map((p) => {
      const isOwner = p.responsibleBrokerId === user.id || p.userId === user.id || isUserAdmin;
      if (isOwner) return p;
      return {
        ...p,
        internalNotes: null,
        exchangeNotes: null,
        registryNumber: null,
        boundary: null,
        boundaryArea: null,
      };
    });

    return NextResponse.json({ success: true, properties: sanitizedProperties });
  } catch (error) {
    console.error('Erro ao listar imóveis:', error);
    return NextResponse.json({ error: 'Falha ao buscar imóveis.' }, { status: 500 });
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
      title,
      internalCode,
      propertyType,
      purpose,
      status,
      price,
      privateArea,
      totalArea,
      landArea,
      builtArea,
      coveredParkingSpaces,
      uncoveredParkingSpaces,
      socialBathrooms,
      lavabos,
      bedrooms,
      suites,
      otherBedrooms,
      bathrooms,
      otherBathrooms,
      parkingSpaces,
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
      boundary,
      boundaryArea,
      acceptsExchange,
      exchangeNotes,
      registryNumber,
      isRegistered,
      hasPool,
      hasGym,
      furniture,
      hasBarbecue,
      hasPartyHall,
      hasElevator,
      isPenthouse,
      hasPetSpace,
      floor,
      isCorner,
      inGatedCommunity,
      inAllotment,
      streetPaving,
      commercialType,
      images, // array de URLs
    } = body;

    if (!title || !propertyType || !purpose || price === undefined || price === null || String(price).trim() === '') {
      return NextResponse.json(
        { error: 'Título, tipo de imóvel, finalidade e valor são obrigatórios.' },
        { status: 400 }
      );
    }

    const priceRes = validateNonNegativeFloat(price, 'Valor', { required: true, isCurrencyString: true });
    if (priceRes.error) {
      return NextResponse.json({ error: priceRes.error }, { status: 400 });
    }
    const numericPrice = priceRes.value!;

    const vSuites = validateNonNegativeInt(suites, 'Suítes', { defaultValue: 0 });
    if (vSuites.error) return NextResponse.json({ error: vSuites.error }, { status: 400 });

    const vOtherBedrooms = validateNonNegativeInt(otherBedrooms, 'Demais quartos');
    if (vOtherBedrooms.error) return NextResponse.json({ error: vOtherBedrooms.error }, { status: 400 });

    const vBedrooms = validateNonNegativeInt(bedrooms, 'Total de quartos');
    if (vBedrooms.error) return NextResponse.json({ error: vBedrooms.error }, { status: 400 });

    const vSocialBathrooms = validateNonNegativeInt(socialBathrooms, 'Banheiros sociais');
    if (vSocialBathrooms.error) return NextResponse.json({ error: vSocialBathrooms.error }, { status: 400 });

    const vLavabos = validateNonNegativeInt(lavabos, 'Lavabos');
    if (vLavabos.error) return NextResponse.json({ error: vLavabos.error }, { status: 400 });

    const vOtherBathrooms = validateNonNegativeInt(otherBathrooms, 'Demais banheiros');
    if (vOtherBathrooms.error) return NextResponse.json({ error: vOtherBathrooms.error }, { status: 400 });

    const vBathrooms = validateNonNegativeInt(bathrooms, 'Total de banheiros');
    if (vBathrooms.error) return NextResponse.json({ error: vBathrooms.error }, { status: 400 });

    const vCovered = validateNonNegativeInt(coveredParkingSpaces, 'Vagas cobertas');
    if (vCovered.error) return NextResponse.json({ error: vCovered.error }, { status: 400 });

    const vUncovered = validateNonNegativeInt(uncoveredParkingSpaces, 'Vagas descobertas');
    if (vUncovered.error) return NextResponse.json({ error: vUncovered.error }, { status: 400 });

    const vParkingSpaces = validateNonNegativeInt(parkingSpaces, 'Total de vagas');
    if (vParkingSpaces.error) return NextResponse.json({ error: vParkingSpaces.error }, { status: 400 });

    const vBuiltArea = validateNonNegativeFloat(builtArea, 'Área construída');
    if (vBuiltArea.error) return NextResponse.json({ error: vBuiltArea.error }, { status: 400 });

    const vPrivateArea = validateNonNegativeFloat(privateArea, 'Área privativa');
    if (vPrivateArea.error) return NextResponse.json({ error: vPrivateArea.error }, { status: 400 });

    const vTotalArea = validateNonNegativeFloat(totalArea, 'Área total');
    if (vTotalArea.error) return NextResponse.json({ error: vTotalArea.error }, { status: 400 });

    const vLandArea = validateNonNegativeFloat(landArea, 'Área do terreno');
    if (vLandArea.error) return NextResponse.json({ error: vLandArea.error }, { status: 400 });

    const parsedSuites = vSuites.value ?? 0;
    const parsedOtherBedrooms = vOtherBedrooms.value;
    const computedBedrooms = parsedOtherBedrooms !== null
      ? parsedSuites + parsedOtherBedrooms
      : (vBedrooms.value ?? parsedSuites);

    const parsedSocialBathrooms = vSocialBathrooms.value;
    const parsedLavabos = vLavabos.value;
    const parsedOtherBathrooms = vOtherBathrooms.value;

    let computedBathrooms: number;
    if (parsedSocialBathrooms !== null || parsedLavabos !== null) {
      computedBathrooms = parsedSuites + (parsedSocialBathrooms ?? 0) + (parsedLavabos ?? 0);
    } else if (parsedOtherBathrooms !== null) {
      computedBathrooms = parsedSuites + parsedOtherBathrooms;
    } else {
      computedBathrooms = vBathrooms.value ?? parsedSuites;
    }

    const parsedCovered = vCovered.value;
    const parsedUncovered = vUncovered.value;

    let computedParkingSpaces: number;
    if (parsedCovered !== null || parsedUncovered !== null) {
      computedParkingSpaces = (parsedCovered ?? 0) + (parsedUncovered ?? 0);
    } else {
      computedParkingSpaces = vParkingSpaces.value ?? 0;
    }

    const parsedBuiltArea = vBuiltArea.value;
    const parsedPrivateArea = vPrivateArea.value;
    const parsedTotalArea = vTotalArea.value;
    const parsedLandArea = vLandArea.value;

    let finalLat = latitude !== null && latitude !== undefined && latitude !== '' && !isNaN(Number(latitude)) ? Number(latitude) : null;
    let finalLng = longitude !== null && longitude !== undefined && longitude !== '' && !isNaN(Number(longitude)) ? Number(longitude) : null;

    if ((finalLat === null || finalLng === null) && (address || zipcode)) {
      try {
        const fullAddr = [address, number, neighborhood, city || 'Criciúma', state || 'SC'].filter(Boolean).join(', ');
        const provider = getGeoProvider();
        const geoResults = await provider.forwardGeocode(fullAddr, {
          limit: 1,
          components: {
            street: address || undefined,
            number: number || undefined,
            neighborhood: neighborhood || undefined,
            city: city || 'Criciúma',
            state: state || 'SC',
            postalCode: zipcode || undefined,
          },
        });
        if (geoResults && geoResults.length > 0) {
          finalLat = geoResults[0].lat;
          finalLng = geoResults[0].lng;
        }
      } catch (err) {
        console.warn('Fallback de geocodificação no backend falhou:', err);
      }
    }

    const isAuthorized = body.hasOwnerAuthorization === true || body.hasOwnerAuthorization === 'true';
    // Se o corretor confirmou a autorização, permite o status informado (padrão 'Disponível').
    // Se NÃO confirmou, salva o imóvel obrigatoriamente como 'Inativo' e sem apresentação pública.
    const finalStatus = isAuthorized ? (status || 'Disponível') : 'Inativo';

    const isLandPlot = isLand(propertyType);

    const property = await prisma.property.create({
      data: {
        userId: user.id,
        responsibleBrokerId: user.id,
        title: title.trim(),
        internalCode: internalCode?.trim() || null,
        propertyType,
        purpose,
        status: finalStatus,
        isPublic: false,
        legacyExemptFromAuthorization: false, // Novos imóveis nunca recebem isenção de legado
        price: numericPrice || 0,
        builtArea: isLandPlot ? null : parsedBuiltArea,
        privateArea: isLandPlot ? null : parsedPrivateArea,
        totalArea: parsedTotalArea,
        landArea: parsedLandArea,
        bedrooms: isLandPlot ? 0 : computedBedrooms,
        suites: isLandPlot ? 0 : parsedSuites,
        otherBedrooms: isLandPlot ? null : parsedOtherBedrooms,
        bathrooms: isLandPlot ? 0 : computedBathrooms,
        otherBathrooms: isLandPlot ? null : parsedOtherBathrooms,
        socialBathrooms: isLandPlot ? null : parsedSocialBathrooms,
        lavabos: isLandPlot ? null : parsedLavabos,
        parkingSpaces: isLandPlot ? 0 : computedParkingSpaces,
        coveredParkingSpaces: isLandPlot ? null : parsedCovered,
        uncoveredParkingSpaces: isLandPlot ? null : parsedUncovered,
        description: description?.trim() || null,
        internalNotes: internalNotes?.trim() || null,
        address: address?.trim() || null,
        number: number?.trim() || null,
        complement: complement?.trim() || null,
        neighborhood: neighborhood?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        zipcode: zipcode?.trim() || null,
        latitude: finalLat,
        longitude: finalLng,
        boundary: boundary ? String(boundary) : null,
        boundaryArea: boundaryArea !== null && boundaryArea !== undefined && !isNaN(Number(boundaryArea)) ? Number(boundaryArea) : null,
        
        // Novos campos Fase 5.0.1
        acceptsExchange: acceptsExchange !== undefined ? (acceptsExchange === true || acceptsExchange === 'true' || acceptsExchange === 'Sim') : null,
        exchangeNotes: exchangeNotes?.trim() || null,
        registryNumber: registryNumber?.trim() || null,
        isRegistered: isRegistered !== undefined ? (isRegistered === true || isRegistered === 'true' || isRegistered === 'Sim') : null,
        hasPool: hasPool !== undefined ? (hasPool === true || hasPool === 'true' || hasPool === 'Sim') : null,
        hasGym: hasGym !== undefined ? (hasGym === true || hasGym === 'true' || hasGym === 'Sim') : null,
        furniture: furniture?.trim() || null,
        hasBarbecue: hasBarbecue !== undefined ? (hasBarbecue === true || hasBarbecue === 'true' || hasBarbecue === 'Sim') : null,
        hasPartyHall: hasPartyHall !== undefined ? (hasPartyHall === true || hasPartyHall === 'true' || hasPartyHall === 'Sim') : null,
        hasElevator: hasElevator !== undefined ? (hasElevator === true || hasElevator === 'true' || hasElevator === 'Sim') : null,
        isPenthouse: isPenthouse !== undefined ? (isPenthouse === true || isPenthouse === 'true' || isPenthouse === 'Sim') : null,
        hasPetSpace: hasPetSpace !== undefined ? (hasPetSpace === true || hasPetSpace === 'true' || hasPetSpace === 'Sim') : null,
        floor: floor !== undefined && floor !== null && floor !== '' ? parseInt(String(floor), 10) : null,
        isCorner: isCorner !== undefined ? (isCorner === true || isCorner === 'true' || isCorner === 'Sim') : null,
        inGatedCommunity: inGatedCommunity !== undefined ? (inGatedCommunity === true || inGatedCommunity === 'true' || inGatedCommunity === 'Sim') : null,
        inAllotment: inAllotment !== undefined ? (inAllotment === true || inAllotment === 'true' || inAllotment === 'Sim') : null,
        streetPaving: streetPaving?.trim() || null,
        commercialType: commercialType?.trim() || null,

        images: {
          create: (images || []).map((url: string, index: number) => ({
            url,
            isCover: index === 0,
            order: index,
          })),
        },
      },
      include: {
        images: true,
      },
    });

    // Se o corretor declarou a autorização, registra no histórico legal auditável
    let createdAuth = null;
    if (isAuthorized) {
      createdAuth = await recordPropertyAuthorization({
        propertyId: property.id,
        brokerId: user.id,
      });
    }

    // Recalcula matches imediatamente para a carteira
    const matchCount = await recalculateMatchesForProperty(property.id);

    const message = isAuthorized
      ? 'Imóvel cadastrado com sucesso.'
      : 'Imóvel salvo como inativo. A publicação poderá ser realizada após a confirmação da autorização do proprietário.';

    return NextResponse.json({
      success: true,
      property,
      matchCount,
      authorizationRecorded: !!createdAuth,
      authorizationPending: !isAuthorized,
      message,
    });
  } catch (error) {
    console.error('Erro ao cadastrar imóvel:', error);
    return NextResponse.json({ error: 'Falha ao salvar imóvel.' }, { status: 500 });
  }
}
