import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recalculateMatchesForSearch } from '@/lib/matching';
import { MATCH_THRESHOLD } from '@/lib/matching/config';

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

    const search = await prisma.search.findFirst({
      where: {
        id,
        ...(user.role === 'ADMIN' ? {} : {
          OR: [{ userId: user.id }, { responsibleBrokerId: user.id }],
        }),
      },
      include: {
        client: true,
        matches: {
          where: {
            score: { gte: MATCH_THRESHOLD },
          },
          include: {
            property: {
              include: {
                images: {
                  where: { isCover: true },
                  take: 1,
                },
                responsibleBroker: {
                  select: {
                    id: true,
                    name: true,
                    profile: {
                      select: {
                        commercialName: true,
                        phone: true,
                        creci: true,
                      },
                    },
                  },
                },
              },
            },
            typology: {
              include: {
                development: {
                  include: {
                    images: {
                      where: { isCover: true },
                      take: 1,
                    },
                    responsibleBroker: {
                      select: {
                        id: true,
                        name: true,
                        profile: {
                          select: {
                            commercialName: true,
                            phone: true,
                            creci: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { score: 'desc' },
        },
      },
    });

    if (!search) {
      return NextResponse.json({ error: 'Busca não encontrada.' }, { status: 404 });
    }

    const formattedMatches = search.matches.map((m) => {
      let parsedExplanation = [];
      try {
        parsedExplanation = JSON.parse(m.explanation);
      } catch {
        parsedExplanation = [];
      }
      return {
        ...m,
        parsedExplanation,
      };
    });

    return NextResponse.json({
      success: true,
      search: {
        ...search,
        matches: formattedMatches,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar demanda:', error);
    return NextResponse.json({ error: 'Falha ao buscar demanda.' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.search.findFirst({
      where: {
        id,
        ...(user.role === 'ADMIN' ? {} : {
          OR: [{ userId: user.id }, { responsibleBrokerId: user.id }],
        }),
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Busca não encontrada.' }, { status: 404 });
    }

    const updated = await prisma.search.update({
      where: { id },
      data: {
        active: body.active !== undefined ? Boolean(body.active) : existing.active,
      },
    });

    // Recalcula matches da busca após alteração de status
    await recalculateMatchesForSearch(updated.id);

    return NextResponse.json({ success: true, search: updated });
  } catch (error) {
    console.error('Erro ao alternar status da busca:', error);
    return NextResponse.json({ error: 'Falha ao atualizar status.' }, { status: 500 });
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
    const body = await req.json();

    const existing = await prisma.search.findFirst({
      where: {
        id,
        ...(user.role === 'ADMIN' ? {} : {
          OR: [{ userId: user.id }, { responsibleBrokerId: user.id }],
        }),
      },
      include: { client: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Busca não encontrada.' }, { status: 404 });
    }

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
      active,
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

    // Atualiza cliente se enviado
    if (clientName || clientPhone !== undefined) {
      await prisma.client.update({
        where: { id: existing.clientId },
        data: {
          name: clientName?.trim() || existing.client.name,
          phone: clientPhone !== undefined ? clientPhone?.trim() || null : existing.client.phone,
        },
      });
    }

    const typesArray = propertyTypes ? (Array.isArray(propertyTypes) ? propertyTypes : [propertyTypes]) : null;
    const citiesArray = cities ? (Array.isArray(cities) ? cities : [cities]) : null;
    const neighborhoodsArray = neighborhoods
      ? Array.isArray(neighborhoods)
        ? neighborhoods
        : neighborhoods.split(',').map((s: string) => s.trim()).filter(Boolean)
      : null;

    let refLat: number | null = body.referenceLatitude !== undefined
      ? (body.referenceLatitude ? parseFloat(String(body.referenceLatitude)) : null)
      : existing.referenceLatitude;
    let refLng: number | null = body.referenceLongitude !== undefined
      ? (body.referenceLongitude ? parseFloat(String(body.referenceLongitude)) : null)
      : existing.referenceLongitude;

    const newRefAddress = referenceAddress !== undefined ? referenceAddress?.trim() || null : existing.referenceAddress;

    // Se o endereço de referência mudou e as coordenadas não foram enviadas explicitamente, regeocodifica uma vez
    if (newRefAddress && newRefAddress !== existing.referenceAddress && body.referenceLatitude === undefined) {
      try {
        const { getGeoProvider } = await import('@/lib/geo');
        const geoResults = await getGeoProvider().forwardGeocode(newRefAddress, { limit: 1 });
        if (geoResults && geoResults.length > 0) {
          refLat = geoResults[0].lat;
          refLng = geoResults[0].lng;
        }
      } catch (geoErr) {
        console.warn('Não foi possível geocodificar o ponto de referência atualizado:', geoErr);
      }
    } else if (!newRefAddress) {
      refLat = null;
      refLng = null;
    }

    const updated = await prisma.search.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        purpose: purpose || existing.purpose,
        propertyTypes: typesArray ? JSON.stringify(typesArray) : existing.propertyTypes,
        cities: citiesArray ? JSON.stringify(citiesArray) : existing.cities,
        neighborhoods: neighborhoodsArray ? JSON.stringify(neighborhoodsArray) : existing.neighborhoods,
        minPrice: minPrice !== undefined ? (minPrice ? parseFloat(String(minPrice)) : null) : existing.minPrice,
        maxPrice: maxPrice !== undefined ? parseFloat(String(maxPrice)) || 0 : existing.maxPrice,
        minBedrooms: minBedrooms !== undefined ? parseInt(String(minBedrooms), 10) : existing.minBedrooms,
        minSuites: minSuites !== undefined ? parseInt(String(minSuites), 10) : existing.minSuites,
        minOtherBedrooms: minOtherBedrooms !== undefined ? (minOtherBedrooms !== null ? parseInt(String(minOtherBedrooms), 10) : null) : existing.minOtherBedrooms,
        minOtherBathrooms: minOtherBathrooms !== undefined ? (minOtherBathrooms !== null ? parseInt(String(minOtherBathrooms), 10) : null) : existing.minOtherBathrooms,
        minParkingSpaces: minParkingSpaces !== undefined ? parseInt(String(minParkingSpaces), 10) : existing.minParkingSpaces,
        minArea: minArea !== undefined ? (minArea ? parseFloat(String(minArea)) : null) : existing.minArea,
        minLandArea: minLandArea !== undefined ? (minLandArea ? parseFloat(String(minLandArea)) : null) : existing.minLandArea,
        referenceAddress: newRefAddress,
        referenceLatitude: refLat,
        referenceLongitude: refLng,
        maxRadiusKm: maxRadiusKm !== undefined ? (maxRadiusKm ? parseFloat(String(maxRadiusKm)) : null) : existing.maxRadiusKm,
        notes: notes !== undefined ? notes?.trim() || null : existing.notes,
        active: active !== undefined ? Boolean(active) : existing.active,

        // Preferências adaptativas Fase 5.0.1
        acceptsExchangePref: acceptsExchangePref !== undefined ? acceptsExchangePref : existing.acceptsExchangePref,
        isRegisteredPref: isRegisteredPref !== undefined ? isRegisteredPref : existing.isRegisteredPref,
        poolPref: poolPref !== undefined ? poolPref : existing.poolPref,
        gymPref: gymPref !== undefined ? gymPref : existing.gymPref,
        barbecuePref: barbecuePref !== undefined ? barbecuePref : existing.barbecuePref,
        partyHallPref: partyHallPref !== undefined ? partyHallPref : existing.partyHallPref,
        elevatorPref: elevatorPref !== undefined ? elevatorPref : existing.elevatorPref,
        petSpacePref: petSpacePref !== undefined ? petSpacePref : existing.petSpacePref,
        penthousePref: penthousePref !== undefined ? penthousePref : existing.penthousePref,
        cornerPref: cornerPref !== undefined ? cornerPref : existing.cornerPref,
        gatedCommunityPref: gatedCommunityPref !== undefined ? gatedCommunityPref : existing.gatedCommunityPref,
        allotmentPref: allotmentPref !== undefined ? allotmentPref : existing.allotmentPref,
        furniturePref: furniturePref !== undefined ? furniturePref : existing.furniturePref,
        streetPavingPref: streetPavingPref !== undefined ? streetPavingPref : existing.streetPavingPref,
        commercialTypePref: commercialTypePref !== undefined ? commercialTypePref : existing.commercialTypePref,
        customPreferences: customPreferences !== undefined ? (customPreferences ? JSON.stringify(customPreferences) : null) : existing.customPreferences,

        // Estratégia territorial, raio e tempo de deslocamento Fase 5.2.1
        locationStrategy: locationStrategy !== undefined ? locationStrategy : existing.locationStrategy,
        searchLatitude: searchLatitude !== undefined ? (searchLatitude !== null ? parseFloat(String(searchLatitude)) : null) : existing.searchLatitude,
        searchLongitude: searchLongitude !== undefined ? (searchLongitude !== null ? parseFloat(String(searchLongitude)) : null) : existing.searchLongitude,
        searchRadiusMeters: searchRadiusMeters !== undefined ? (searchRadiusMeters !== null ? parseFloat(String(searchRadiusMeters)) : null) : existing.searchRadiusMeters,
        maxTravelTimeMinutes: maxTravelTimeMinutes !== undefined ? (maxTravelTimeMinutes !== null ? parseInt(String(maxTravelTimeMinutes), 10) : null) : existing.maxTravelTimeMinutes,
        travelMode: travelMode !== undefined ? travelMode : existing.travelMode,
      },
      include: {
        client: true,
      },
    });

    // Recalcula matches após atualização dos critérios
    const matchCount = await recalculateMatchesForSearch(updated.id);

    return NextResponse.json({ success: true, search: updated, matchCount });
  } catch (error) {
    console.error('Erro ao atualizar busca:', error);
    return NextResponse.json({ error: 'Falha ao atualizar busca.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.search.findFirst({
      where: {
        id,
        ...(user.role === 'ADMIN' ? {} : {
          OR: [{ userId: user.id }, { responsibleBrokerId: user.id }],
        }),
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Busca não encontrada.' }, { status: 404 });
    }

    await prisma.search.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Busca excluída com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir busca:', error);
    return NextResponse.json({ error: 'Falha ao excluir busca.' }, { status: 500 });
  }
}
