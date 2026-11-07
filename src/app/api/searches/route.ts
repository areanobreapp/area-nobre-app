import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recalculateMatchesForSearch } from '@/lib/matching';
import { MATCH_THRESHOLD } from '@/lib/matching/config';
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
    const active = searchParams.get('active');

    const brokerId = searchParams.get('brokerId');
    const viewAll = searchParams.get('all') === 'true';

    const where: any = {};
    if (user.role === 'ADMIN' && (viewAll || brokerId)) {
      if (brokerId) {
        where.responsibleBrokerId = brokerId;
      }
    } else {
      where.OR = [
        { userId: user.id },
        { responsibleBrokerId: user.id },
      ];
    }

    if (active === 'true') {
      where.active = true;
    } else if (active === 'false') {
      where.active = false;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { client: { name: { contains: search } } },
        { neighborhoods: { contains: search } },
        { cities: { contains: search } },
      ];
    }

    const searches = await prisma.search.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: true,
        _count: {
          select: {
            matches: {
              where: {
                score: { gte: MATCH_THRESHOLD },
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, searches });
  } catch (error) {
    console.error('Erro ao listar buscas:', error);
    return NextResponse.json({ error: 'Falha ao buscar demandas.' }, { status: 500 });
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
      clientName,
      clientPhone,
      name,
      purpose,
      propertyTypes,
      cities,
      neighborhoods,
      minPrice,
      maxPrice,
      minBedrooms,
      minSuites,
      minOtherBedrooms,
      minOtherBathrooms,
      minSocialBathrooms,
      minLavabos,
      minParkingSpaces,
      minCoveredParkingSpaces,
      minUncoveredParkingSpaces,
      minArea,
      minBuiltArea,
      minLandArea,
      referenceAddress,
      maxRadiusKm,
      notes,
      acceptsExchangePref,
      isRegisteredPref,
      poolPref,
      gymPref,
      barbecuePref,
      partyHallPref,
      elevatorPref,
      petSpacePref,
      penthousePref,
      cornerPref,
      gatedCommunityPref,
      allotmentPref,
      furniturePref,
      streetPavingPref,
      commercialTypePref,
      customPreferences,
      locationStrategy,
      searchLatitude,
      searchLongitude,
      searchRadiusMeters,
      maxTravelTimeMinutes,
      travelMode,
    } = body;

    if (!clientName || !purpose || maxPrice === undefined || maxPrice === null || String(maxPrice).trim() === '') {
      return NextResponse.json(
        { error: 'Nome do cliente, finalidade e valor máximo são obrigatórios.' },
        { status: 400 }
      );
    }

    const vMaxPrice = validateNonNegativeFloat(maxPrice, 'Valor máximo', { required: true, isCurrencyString: true });
    if (vMaxPrice.error) return NextResponse.json({ error: vMaxPrice.error }, { status: 400 });

    const vMinPrice = validateNonNegativeFloat(minPrice, 'Valor mínimo', { isCurrencyString: true });
    if (vMinPrice.error) return NextResponse.json({ error: vMinPrice.error }, { status: 400 });

    const vMinBedrooms = validateNonNegativeInt(minBedrooms, 'Mínimo de quartos', { defaultValue: 0 });
    if (vMinBedrooms.error) return NextResponse.json({ error: vMinBedrooms.error }, { status: 400 });

    const vMinSuites = validateNonNegativeInt(minSuites, 'Mínimo de suítes', { defaultValue: 0 });
    if (vMinSuites.error) return NextResponse.json({ error: vMinSuites.error }, { status: 400 });

    const vMinOtherBedrooms = validateNonNegativeInt(minOtherBedrooms, 'Mínimo de demais quartos');
    if (vMinOtherBedrooms.error) return NextResponse.json({ error: vMinOtherBedrooms.error }, { status: 400 });

    const vMinOtherBathrooms = validateNonNegativeInt(minOtherBathrooms, 'Mínimo de demais banheiros');
    if (vMinOtherBathrooms.error) return NextResponse.json({ error: vMinOtherBathrooms.error }, { status: 400 });

    const vMinSocialBathrooms = validateNonNegativeInt(minSocialBathrooms, 'Mínimo de banheiros sociais');
    if (vMinSocialBathrooms.error) return NextResponse.json({ error: vMinSocialBathrooms.error }, { status: 400 });

    const vMinLavabos = validateNonNegativeInt(minLavabos, 'Mínimo de lavabos');
    if (vMinLavabos.error) return NextResponse.json({ error: vMinLavabos.error }, { status: 400 });

    const vMinParkingSpaces = validateNonNegativeInt(minParkingSpaces, 'Mínimo de vagas', { defaultValue: 0 });
    if (vMinParkingSpaces.error) return NextResponse.json({ error: vMinParkingSpaces.error }, { status: 400 });

    const vMinCovered = validateNonNegativeInt(minCoveredParkingSpaces, 'Mínimo de vagas cobertas');
    if (vMinCovered.error) return NextResponse.json({ error: vMinCovered.error }, { status: 400 });

    const vMinUncovered = validateNonNegativeInt(minUncoveredParkingSpaces, 'Mínimo de vagas descobertas');
    if (vMinUncovered.error) return NextResponse.json({ error: vMinUncovered.error }, { status: 400 });

    const vMinArea = validateNonNegativeFloat(minArea, 'Área privativa mínima');
    if (vMinArea.error) return NextResponse.json({ error: vMinArea.error }, { status: 400 });

    const vMinBuiltArea = validateNonNegativeFloat(minBuiltArea, 'Área construída mínima');
    if (vMinBuiltArea.error) return NextResponse.json({ error: vMinBuiltArea.error }, { status: 400 });

    const vMinLandArea = validateNonNegativeFloat(minLandArea, 'Área do terreno mínima');
    if (vMinLandArea.error) return NextResponse.json({ error: vMinLandArea.error }, { status: 400 });

    const vMaxRadiusKm = validateNonNegativeFloat(maxRadiusKm, 'Raio máximo (km)');
    if (vMaxRadiusKm.error) return NextResponse.json({ error: vMaxRadiusKm.error }, { status: 400 });

    const vSearchRadiusMeters = validateNonNegativeFloat(searchRadiusMeters, 'Raio de busca (metros)');
    if (vSearchRadiusMeters.error) return NextResponse.json({ error: vSearchRadiusMeters.error }, { status: 400 });

    const vMaxTravelTime = validateNonNegativeInt(maxTravelTimeMinutes, 'Tempo de deslocamento máximo (minutos)');
    if (vMaxTravelTime.error) return NextResponse.json({ error: vMaxTravelTime.error }, { status: 400 });

    // Localiza ou cria o cliente isolado por usuário
    let client = await prisma.client.findFirst({
      where: {
        userId: user.id,
        name: clientName.trim(),
      },
    });

    if (!client) {
      client = await prisma.client.create({
        data: {
          userId: user.id,
          name: clientName.trim(),
          phone: clientPhone?.trim() || null,
        },
      });
    } else if (clientPhone && client.phone !== clientPhone) {
      client = await prisma.client.update({
        where: { id: client.id },
        data: { phone: clientPhone.trim() },
      });
    }

    const typesArray = Array.isArray(propertyTypes) ? propertyTypes : propertyTypes ? [propertyTypes] : ['Apartamento'];
    const citiesArray = Array.isArray(cities) ? cities : cities ? [cities] : [];
    const neighborhoodsArray = Array.isArray(neighborhoods)
      ? neighborhoods
      : neighborhoods
      ? neighborhoods.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];

    const searchName = name?.trim() || `${typesArray.join('/')} para ${client.name}`;

    // Geocodificação única do ponto de referência, se fornecido
    let refLat: number | null = body.referenceLatitude ? parseFloat(String(body.referenceLatitude)) : null;
    let refLng: number | null = body.referenceLongitude ? parseFloat(String(body.referenceLongitude)) : null;

    if (referenceAddress && referenceAddress.trim() && (refLat === null || refLng === null)) {
      try {
        const { getGeoProvider } = await import('@/lib/geo');
        const geoResults = await getGeoProvider().forwardGeocode(referenceAddress.trim(), { limit: 1 });
        if (geoResults && geoResults.length > 0) {
          refLat = geoResults[0].lat;
          refLng = geoResults[0].lng;
        }
      } catch (geoErr) {
        console.warn('Não foi possível geocodificar o ponto de referência da busca:', geoErr);
      }
    }

    const newSearch = await prisma.search.create({
      data: {
        userId: user.id,
        responsibleBrokerId: user.id,
        clientId: client.id,
        name: searchName,
        purpose: purpose || 'Venda',
        propertyTypes: JSON.stringify(typesArray),
        cities: JSON.stringify(citiesArray),
        neighborhoods: JSON.stringify(neighborhoodsArray),
        minPrice: vMinPrice.value,
        maxPrice: vMaxPrice.value!,
        minBedrooms: vMinBedrooms.value ?? 0,
        minSuites: vMinSuites.value ?? 0,
        minOtherBedrooms: vMinOtherBedrooms.value,
        minOtherBathrooms: vMinOtherBathrooms.value,
        minSocialBathrooms: vMinSocialBathrooms.value,
        minLavabos: vMinLavabos.value,
        minParkingSpaces: vMinParkingSpaces.value ?? 0,
        minCoveredParkingSpaces: vMinCovered.value,
        minUncoveredParkingSpaces: vMinUncovered.value,
        minArea: vMinArea.value,
        minBuiltArea: vMinBuiltArea.value,
        minLandArea: vMinLandArea.value,
        referenceAddress: referenceAddress?.trim() || null,
        referenceLatitude: refLat,
        referenceLongitude: refLng,
        maxRadiusKm: vMaxRadiusKm.value,
        notes: notes?.trim() || null,
        active: true,

        // Preferências adaptativas Fase 5.0.1
        acceptsExchangePref: acceptsExchangePref || 'INDIFERENTE',
        isRegisteredPref: isRegisteredPref || 'INDIFERENTE',
        poolPref: poolPref || 'INDIFERENTE',
        gymPref: gymPref || 'INDIFERENTE',
        barbecuePref: barbecuePref || 'INDIFERENTE',
        partyHallPref: partyHallPref || 'INDIFERENTE',
        elevatorPref: elevatorPref || 'INDIFERENTE',
        petSpacePref: petSpacePref || 'INDIFERENTE',
        penthousePref: penthousePref || 'INDIFERENTE',
        cornerPref: cornerPref || 'INDIFERENTE',
        gatedCommunityPref: gatedCommunityPref || 'INDIFERENTE',
        allotmentPref: allotmentPref || 'INDIFERENTE',
        furniturePref: furniturePref || 'INDIFERENTE',
        streetPavingPref: streetPavingPref || 'INDIFERENTE',
        commercialTypePref: commercialTypePref || 'INDIFERENTE',
        customPreferences: customPreferences ? JSON.stringify(customPreferences) : null,

        // Estratégia territorial, raio e tempo de deslocamento Fase 5.2.1
        locationStrategy: locationStrategy || (maxTravelTimeMinutes ? 'TRAVEL_TIME' : (searchRadiusMeters ? 'RADIUS' : 'NEIGHBORHOODS')),
        searchLatitude: searchLatitude !== undefined && searchLatitude !== null ? parseFloat(String(searchLatitude)) : (refLat || null),
        searchLongitude: searchLongitude !== undefined && searchLongitude !== null ? parseFloat(String(searchLongitude)) : (refLng || null),
        searchRadiusMeters: vSearchRadiusMeters.value !== null ? vSearchRadiusMeters.value : (vMaxRadiusKm.value !== null ? vMaxRadiusKm.value * 1000 : null),
        maxTravelTimeMinutes: vMaxTravelTime.value,
        travelMode: travelMode || 'DRIVING',
      },
      include: {
        client: true,
      },
    });

    // Recalcula matches determinísticos imediatamente
    const matchCount = await recalculateMatchesForSearch(newSearch.id);

    return NextResponse.json({ success: true, search: newSearch, matchCount });
  } catch (error) {
    console.error('Erro ao cadastrar busca:', error);
    return NextResponse.json({ error: 'Falha ao salvar busca.' }, { status: 500 });
  }
}
