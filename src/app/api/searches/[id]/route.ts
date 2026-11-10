import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recalculateMatchesForSearch } from '@/lib/matching';
import { MATCH_THRESHOLD } from '@/lib/matching/config';
import { validateNonNegativeInt, validateNonNegativeFloat } from '@/lib/validation';
import { assertUserAcceptedTerms } from '@/lib/legal/service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const termsCheck = await assertUserAcceptedTerms(user);
    if (!termsCheck.allowed) {
      return termsCheck.errorResponse!;
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
                        avatarUrl: true,
                        logoUrl: true,
                      },
                    },
                  },
                },
                physicalProperty: {
                  select: {
                    id: true,
                    sharedPrice: true,
                    activeListingsCount: true,
                    primaryListingId: true,
                    listings: {
                      where: {
                        status: 'Disponível',
                        OR: [
                          { responsibleBroker: { status: 'ACTIVE' } },
                          { responsibleBrokerId: null, user: { status: 'ACTIVE' } },
                        ],
                      },
                      select: {
                        id: true,
                        title: true,
                        price: true,
                        isPrimaryListing: true,
                        createdAt: true,
                        responsibleBroker: {
                          select: {
                            id: true,
                            name: true,
                            profile: {
                              select: {
                                commercialName: true,
                                phone: true,
                                creci: true,
                                avatarUrl: true,
                                logoUrl: true,
                              },
                            },
                          },
                        },
                        user: {
                          select: {
                            id: true,
                            name: true,
                            profile: {
                              select: {
                                commercialName: true,
                                phone: true,
                                creci: true,
                                avatarUrl: true,
                                logoUrl: true,
                              },
                            },
                          },
                        },
                      },
                      orderBy: [{ isPrimaryListing: 'desc' }, { createdAt: 'asc' }],
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

    const termsCheck = await assertUserAcceptedTerms(user);
    if (!termsCheck.allowed) {
      return termsCheck.errorResponse!;
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

    const termsCheck = await assertUserAcceptedTerms(user);
    if (!termsCheck.allowed) {
      return termsCheck.errorResponse!;
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
      const existsAny = await prisma.search.findUnique({ where: { id } });
      if (existsAny) {
        return NextResponse.json({ error: 'Você não tem permissão para editar esta busca.' }, { status: 403 });
      }
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

    let finalMaxPrice = existing.maxPrice;
    if (maxPrice !== undefined) {
      const v = validateNonNegativeFloat(maxPrice, 'Valor máximo', { required: true, isCurrencyString: true });
      if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });
      finalMaxPrice = v.value!;
    }

    let finalMinPrice = existing.minPrice;
    if (minPrice !== undefined) {
      const v = validateNonNegativeFloat(minPrice, 'Valor mínimo', { isCurrencyString: true });
      if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });
      finalMinPrice = v.value;
    }

    let finalMinBedrooms = existing.minBedrooms;
    if (minBedrooms !== undefined) {
      const v = validateNonNegativeInt(minBedrooms, 'Mínimo de quartos', { defaultValue: 0 });
      if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });
      finalMinBedrooms = v.value ?? 0;
    }

    let finalMinSuites = existing.minSuites;
    if (minSuites !== undefined) {
      const v = validateNonNegativeInt(minSuites, 'Mínimo de suítes', { defaultValue: 0 });
      if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });
      finalMinSuites = v.value ?? 0;
    }

    let finalMinOtherBedrooms = existing.minOtherBedrooms;
    if (minOtherBedrooms !== undefined) {
      const v = validateNonNegativeInt(minOtherBedrooms, 'Mínimo de demais quartos');
      if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });
      finalMinOtherBedrooms = v.value;
    }

    let finalMinOtherBathrooms = existing.minOtherBathrooms;
    if (minOtherBathrooms !== undefined) {
      const v = validateNonNegativeInt(minOtherBathrooms, 'Mínimo de demais banheiros');
      if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });
      finalMinOtherBathrooms = v.value;
    }

    let finalMinSocialBathrooms = existing.minSocialBathrooms;
    if (minSocialBathrooms !== undefined) {
      const v = validateNonNegativeInt(minSocialBathrooms, 'Mínimo de banheiros sociais');
      if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });
      finalMinSocialBathrooms = v.value;
    }

    let finalMinLavabos = existing.minLavabos;
    if (minLavabos !== undefined) {
      const v = validateNonNegativeInt(minLavabos, 'Mínimo de lavabos');
      if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });
      finalMinLavabos = v.value;
    }

    let finalMinParkingSpaces = existing.minParkingSpaces;
    if (minParkingSpaces !== undefined) {
      const v = validateNonNegativeInt(minParkingSpaces, 'Mínimo de vagas', { defaultValue: 0 });
      if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });
      finalMinParkingSpaces = v.value ?? 0;
    }

    let finalMinCovered = existing.minCoveredParkingSpaces;
    if (minCoveredParkingSpaces !== undefined) {
      const v = validateNonNegativeInt(minCoveredParkingSpaces, 'Mínimo de vagas cobertas');
      if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });
      finalMinCovered = v.value;
    }

    let finalMinUncovered = existing.minUncoveredParkingSpaces;
    if (minUncoveredParkingSpaces !== undefined) {
      const v = validateNonNegativeInt(minUncoveredParkingSpaces, 'Mínimo de vagas descobertas');
      if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });
      finalMinUncovered = v.value;
    }

    let finalMinArea = existing.minArea;
    if (minArea !== undefined) {
      const v = validateNonNegativeFloat(minArea, 'Área privativa mínima');
      if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });
      finalMinArea = v.value;
    }

    let finalMinBuiltArea = existing.minBuiltArea;
    if (minBuiltArea !== undefined) {
      const v = validateNonNegativeFloat(minBuiltArea, 'Área construída mínima');
      if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });
      finalMinBuiltArea = v.value;
    }

    let finalMinLandArea = existing.minLandArea;
    if (minLandArea !== undefined) {
      const v = validateNonNegativeFloat(minLandArea, 'Área do terreno mínima');
      if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });
      finalMinLandArea = v.value;
    }

    let finalMaxRadiusKm = existing.maxRadiusKm;
    if (maxRadiusKm !== undefined) {
      const v = validateNonNegativeFloat(maxRadiusKm, 'Raio máximo (km)');
      if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });
      finalMaxRadiusKm = v.value;
    }

    let finalSearchRadiusMeters = existing.searchRadiusMeters;
    if (searchRadiusMeters !== undefined) {
      const v = validateNonNegativeFloat(searchRadiusMeters, 'Raio de busca (metros)');
      if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });
      finalSearchRadiusMeters = v.value;
    }

    let finalMaxTravelTime = existing.maxTravelTimeMinutes;
    if (maxTravelTimeMinutes !== undefined) {
      const v = validateNonNegativeInt(maxTravelTimeMinutes, 'Tempo de deslocamento máximo (minutos)');
      if (v.error) return NextResponse.json({ error: v.error }, { status: 400 });
      finalMaxTravelTime = v.value;
    }

    const updated = await prisma.search.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        purpose: purpose || existing.purpose,
        propertyTypes: typesArray ? JSON.stringify(typesArray) : existing.propertyTypes,
        cities: citiesArray ? JSON.stringify(citiesArray) : existing.cities,
        neighborhoods: neighborhoodsArray ? JSON.stringify(neighborhoodsArray) : existing.neighborhoods,
        minPrice: finalMinPrice,
        maxPrice: finalMaxPrice,
        minBedrooms: finalMinBedrooms,
        minSuites: finalMinSuites,
        minOtherBedrooms: finalMinOtherBedrooms,
        minOtherBathrooms: finalMinOtherBathrooms,
        minSocialBathrooms: finalMinSocialBathrooms,
        minLavabos: finalMinLavabos,
        minParkingSpaces: finalMinParkingSpaces,
        minCoveredParkingSpaces: finalMinCovered,
        minUncoveredParkingSpaces: finalMinUncovered,
        minArea: finalMinArea,
        minBuiltArea: finalMinBuiltArea,
        minLandArea: finalMinLandArea,
        referenceAddress: newRefAddress,
        referenceLatitude: refLat,
        referenceLongitude: refLng,
        maxRadiusKm: finalMaxRadiusKm,
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
        searchRadiusMeters: finalSearchRadiusMeters,
        maxTravelTimeMinutes: finalMaxTravelTime,
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

    const termsCheck = await assertUserAcceptedTerms(user);
    if (!termsCheck.allowed) {
      return termsCheck.errorResponse!;
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
