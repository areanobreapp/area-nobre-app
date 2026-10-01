import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recalculateMatchesForSearch } from '@/lib/matching';
import { MATCH_THRESHOLD } from '@/lib/matching/config';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
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
      minParkingSpaces,
      minArea,
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

    if (!clientName || !purpose || maxPrice === undefined || maxPrice === null) {
      return NextResponse.json(
        { error: 'Nome do cliente, finalidade e valor máximo são obrigatórios.' },
        { status: 400 }
      );
    }

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
        minPrice: minPrice ? parseFloat(String(minPrice)) : null,
        maxPrice: parseFloat(String(maxPrice)) || 0,
        minBedrooms: minBedrooms ? parseInt(String(minBedrooms), 10) : 0,
        minSuites: minSuites ? parseInt(String(minSuites), 10) : 0,
        minOtherBedrooms: minOtherBedrooms !== undefined && minOtherBedrooms !== null ? parseInt(String(minOtherBedrooms), 10) : null,
        minOtherBathrooms: minOtherBathrooms !== undefined && minOtherBathrooms !== null ? parseInt(String(minOtherBathrooms), 10) : null,
        minParkingSpaces: minParkingSpaces ? parseInt(String(minParkingSpaces), 10) : 0,
        minArea: minArea ? parseFloat(String(minArea)) : null,
        minLandArea: minLandArea ? parseFloat(String(minLandArea)) : null,
        referenceAddress: referenceAddress?.trim() || null,
        referenceLatitude: refLat,
        referenceLongitude: refLng,
        maxRadiusKm: maxRadiusKm ? parseFloat(String(maxRadiusKm)) : null,
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
        searchRadiusMeters: searchRadiusMeters !== undefined && searchRadiusMeters !== null ? parseFloat(String(searchRadiusMeters)) : (maxRadiusKm ? parseFloat(String(maxRadiusKm)) * 1000 : null),
        maxTravelTimeMinutes: maxTravelTimeMinutes !== undefined && maxTravelTimeMinutes !== null ? parseInt(String(maxTravelTimeMinutes), 10) : null,
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
