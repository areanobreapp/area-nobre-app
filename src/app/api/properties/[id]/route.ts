import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recalculateMatchesForProperty } from '@/lib/matching';
import { MATCH_THRESHOLD } from '@/lib/matching/config';
import { canPropertyBePubliclyExposed, recordPropertyAuthorization, assertUserAcceptedTerms } from '@/lib/legal/service';
import { isLand } from '@/lib/property-display';
import { linkPropertyToBuildingAndUnit } from '@/lib/building-service';
import { ListingSlotService, SlotClaimResult } from '@/lib/listing-slot-service';

class ListingSlotError extends Error {
  claimResult: SlotClaimResult;
  constructor(claimResult: SlotClaimResult) {
    super(claimResult.message || 'Falha ao alocar vaga para anúncio.');
    this.name = 'ListingSlotError';
    this.claimResult = claimResult;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const termsCheck = await assertUserAcceptedTerms(user);
    if (!termsCheck.allowed) {
      return termsCheck.errorResponse!;
    }

    const { id } = await params;

    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
        },
        building: {
          select: {
            id: true,
            name: true,
            address: true,
            number: true,
            neighborhood: true,
            city: true,
            state: true,
            zipcode: true,
            latitude: true,
            longitude: true,
            totalFloors: true,
            unitsPerFloor: true,
            towers: true,
            hasPool: true,
            hasGym: true,
            hasPartyHall: true,
            hasElevator: true,
            hasPetSpace: true,
            hasBarbecue: true,
            verifiedByAdmin: true,
          },
        },
        physicalProperty: {
          select: {
            id: true,
            complement: true,
            activeListingsCount: true,
            sharedPrice: true,
            priceUpdatedAt: true,
            primaryListingId: true,
            status: true,
            unit: {
              select: {
                id: true,
                unitNumber: true,
                tower: true,
                floor: true,
              },
            },
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
                responsibleBroker: {
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
              orderBy: [
                { isPrimaryListing: 'desc' },
                { listingSlot: 'asc' },
                { createdAt: 'asc' },
              ],
            },
          },
        },
        responsibleBroker: {
          select: {
            id: true,
            name: true,
            profile: {
              select: {
                commercialName: true,
                creci: true,
                phone: true,
              },
            },
          },
        },
        matches: {
          where: {
            score: { gte: MATCH_THRESHOLD },
            search: { active: true },
          },
          include: {
            search: {
              include: {
                client: true,
                user: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { score: 'desc' },
        },
      },
    });

    if (!property) {
      return NextResponse.json({ error: 'Imóvel não encontrado.' }, { status: 404 });
    }

    const isOwner = property.userId === user.id || property.responsibleBrokerId === user.id;
    const isAdmin = user.role === 'ADMIN';

    // Se não for o proprietário nem admin, permite visualização comercial caso exista match, mas sanitiza dados confidenciais
    let formattedMatches: any[] = [];
    if (isOwner || isAdmin) {
      formattedMatches = property.matches.map((m) => {
        let parsedExplanation = [];
        try {
          parsedExplanation = JSON.parse(m.explanation);
        } catch {
          parsedExplanation = [];
        }

        const isMySearch = m.search.userId === user.id;
        const searchClient = isMySearch || isAdmin
          ? m.search.client
          : {
              id: m.search.client.id,
              name: `Cliente de ${m.search.user?.name || 'outro corretor'}`,
              phone: null,
              email: null,
              notes: null,
            };

        return {
          ...m,
          parsedExplanation,
          search: {
            ...m.search,
            client: searchClient,
          },
        };
      });
    }

    const exposureCheck = (isOwner || isAdmin) ? await canPropertyBePubliclyExposed(property.id) : null;

    // Detecta se o corretor autenticado possui um anúncio ativo próprio vinculado a este mesmo imóvel físico
    const userOwnListing = property.physicalProperty?.listings?.find(
      (l) => l.userId === user.id || l.responsibleBrokerId === user.id
    );

    const sanitizedProperty: any = {
      ...property,
      internalNotes: (!isOwner && !isAdmin) ? null : property.internalNotes,
      exchangeNotes: (!isOwner && !isAdmin) ? null : property.exchangeNotes,
      registryNumber: (!isOwner && !isAdmin) ? null : property.registryNumber,
      boundary: (!isOwner && !isAdmin) ? null : property.boundary,
      physicalProperty: property.physicalProperty,
      matches: formattedMatches,
      authorizationState: exposureCheck,
    };

    return NextResponse.json({
      success: true,
      property: sanitizedProperty,
      isOwner: isOwner || isAdmin,
      userOwnListingId: userOwnListing?.id || null,
    });
  } catch (error) {
    console.error('Erro ao buscar imóvel:', error);
    return NextResponse.json({ error: 'Falha ao buscar imóvel.' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const termsCheck = await assertUserAcceptedTerms(user);
    if (!termsCheck.allowed) {
      return termsCheck.errorResponse!;
    }

    const { id } = await params;
    const body = await req.json();

    // Verifica propriedade do imóvel (Fase 5.4: apenas o responsável ou ADMIN pode alterar)
    const existing = await prisma.property.findFirst({
      where: {
        id,
        ...(user.role === 'ADMIN' ? {} : {
          OR: [{ userId: user.id }, { responsibleBrokerId: user.id }],
        }),
      },
      include: { images: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Imóvel não encontrado ou você não tem permissão para alterá-lo.' },
        { status: 403 }
      );
    }

    const targetStatus = body.status !== undefined ? body.status : existing.status;
    const isActivating = targetStatus !== 'Inativo' && existing.status === 'Inativo';

    // Se estiver ativando ou mantendo ativo em imóvel sem autorização válida
    if (targetStatus !== 'Inativo') {
      const exposureCheck = await canPropertyBePubliclyExposed(id);
      if (!exposureCheck.allowed) {
        if (body.hasOwnerAuthorization === true || body.hasOwnerAuthorization === 'true') {
          await recordPropertyAuthorization({
            propertyId: id,
            brokerId: user.id,
          });
        } else if (isActivating) {
          return NextResponse.json(
            {
              error: 'Para ativar o imóvel, é necessária a confirmação da autorização de divulgação do proprietário.',
              authorizationRequired: true,
            },
            { status: 400 }
          );
        }
      }
    }

    const {
      title,
      internalCode,
      propertyType,
      purpose,
      status,
      price,
      privateArea,
      builtArea,
      totalArea,
      landArea,
      bedrooms,
      suites,
      otherBedrooms,
      bathrooms,
      otherBathrooms,
      socialBathrooms,
      lavabos,
      parkingSpaces,
      coveredParkingSpaces,
      uncoveredParkingSpaces,
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
      images, // array de URLs atualizado
      buildingId,
      unitNumber,
      tower,
    } = body;

    const effectiveType = propertyType || existing.propertyType;
    const isLandPlot = isLand(effectiveType);

    const numericPrice = typeof price === 'string' ? parseFloat(price.replace(/\D/g, '')) / 100 || parseFloat(price) : Number(price);

    const parsedSuites = suites !== undefined ? parseInt(String(suites), 10) : existing.suites;
    const parsedOtherBedrooms = otherBedrooms !== undefined ? (otherBedrooms !== null ? parseInt(String(otherBedrooms), 10) : null) : existing.otherBedrooms;
    const parsedOtherBathrooms = otherBathrooms !== undefined ? (otherBathrooms !== null ? parseInt(String(otherBathrooms), 10) : null) : existing.otherBathrooms;

    const computedBedrooms = parsedOtherBedrooms !== null
      ? parsedSuites + parsedOtherBedrooms
      : (bedrooms !== undefined ? parseInt(String(bedrooms), 10) : existing.bedrooms);

    const computedBathrooms = parsedOtherBathrooms !== null
      ? parsedSuites + parsedOtherBathrooms
      : (bathrooms !== undefined ? parseInt(String(bathrooms), 10) : existing.bathrooms);

    const parsedBuiltArea = builtArea !== undefined ? (builtArea ? parseFloat(String(builtArea)) : null) : existing.builtArea;
    const parsedSocialBathrooms = socialBathrooms !== undefined ? (socialBathrooms !== null && socialBathrooms !== '' ? parseInt(String(socialBathrooms), 10) : null) : existing.socialBathrooms;
    const parsedLavabos = lavabos !== undefined ? (lavabos !== null && lavabos !== '' ? parseInt(String(lavabos), 10) : null) : existing.lavabos;
    const parsedCovered = coveredParkingSpaces !== undefined ? (coveredParkingSpaces !== null && coveredParkingSpaces !== '' ? parseInt(String(coveredParkingSpaces), 10) : null) : existing.coveredParkingSpaces;
    const parsedUncovered = uncoveredParkingSpaces !== undefined ? (uncoveredParkingSpaces !== null && uncoveredParkingSpaces !== '' ? parseInt(String(uncoveredParkingSpaces), 10) : null) : existing.uncoveredParkingSpaces;

    // Atualiza imagens se fornecidas
    if (images && Array.isArray(images)) {
      await prisma.propertyImage.deleteMany({
        where: { propertyId: id },
      });

      await prisma.propertyImage.createMany({
        data: images.map((url: string, index: number) => ({
          propertyId: id,
          url,
          isCover: index === 0,
          order: index,
        })),
      });
    }

    let resolvedBuildingId = existing.buildingId;
    let resolvedPhysicalPropertyId = existing.physicalPropertyId;

    if (buildingId !== undefined) {
      if (buildingId && effectiveType === 'Apartamento') {
        const linkRes = await linkPropertyToBuildingAndUnit({
          buildingId,
          unitNumber,
          tower,
          floor: floor !== undefined ? (floor !== null && floor !== '' ? parseInt(String(floor), 10) : null) : existing.floor,
          privateArea: isLandPlot ? null : (privateArea !== undefined ? (privateArea ? parseFloat(String(privateArea)) : null) : existing.privateArea),
          totalArea: totalArea !== undefined ? (totalArea ? parseFloat(String(totalArea)) : null) : existing.totalArea,
          bedrooms: isLandPlot ? 0 : computedBedrooms,
          suites: isLandPlot ? 0 : parsedSuites,
          bathrooms: isLandPlot ? 0 : computedBathrooms,
          parkingSpaces: isLandPlot ? 0 : (parkingSpaces !== undefined ? parseInt(String(parkingSpaces), 10) : existing.parkingSpaces),
        });
        resolvedBuildingId = linkRes.buildingId;
        resolvedPhysicalPropertyId = linkRes.physicalPropertyId;
      } else {
        resolvedBuildingId = null;
        resolvedPhysicalPropertyId = null;
      }
    }

    const oldPhysicalPropertyId = existing.physicalPropertyId;
    const newPhysicalPropertyId = resolvedPhysicalPropertyId;
    const isOldActive = existing.status === 'Disponível';
    const isNewActive = targetStatus === 'Disponível';

    // Determina o preço final
    let finalPrice = existing.price;
    if (newPhysicalPropertyId) {
      if (oldPhysicalPropertyId === newPhysicalPropertyId && !existing.isPrimaryListing && user.role !== 'ADMIN') {
        // Corretor secundário não pode alterar o preço compartilhado; mantém o preço compartilhado existente
        finalPrice = existing.price;
      } else if (oldPhysicalPropertyId === newPhysicalPropertyId && (existing.isPrimaryListing || user.role === 'ADMIN')) {
        // Corretor principal ou admin pode alterar o preço
        if (numericPrice !== undefined && !isNaN(numericPrice) && numericPrice > 0) {
          finalPrice = numericPrice;
        } else {
          finalPrice = existing.price;
        }
      } else {
        finalPrice = numericPrice !== undefined && !isNaN(numericPrice) && numericPrice > 0 ? numericPrice : existing.price;
      }
    } else {
      finalPrice = numericPrice !== undefined && !isNaN(numericPrice) ? numericPrice : existing.price;
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Mudança de imóvel físico (oldPhysicalPropertyId !== newPhysicalPropertyId)
      if (oldPhysicalPropertyId !== newPhysicalPropertyId) {
        // Deadlock prevention: lock pessimista determinístico ordenado por ID
        const affectedIds = [oldPhysicalPropertyId, newPhysicalPropertyId].filter(Boolean) as string[];
        affectedIds.sort();
        for (const pId of affectedIds) {
          await tx.$queryRaw`SELECT id FROM "PhysicalProperty" WHERE id = ${pId} FOR UPDATE;`;
        }

        // Se era ativo no antigo, libera vaga
        if (isOldActive && oldPhysicalPropertyId) {
          await ListingSlotService.releaseListingSlot({
            physicalPropertyId: oldPhysicalPropertyId,
            propertyId: id,
            prismaClient: tx,
          });
        }

        // Se será ativo no novo, aloca vaga
        if (isNewActive && newPhysicalPropertyId) {
          const claimRes = await ListingSlotService.claimListingSlot({
            physicalPropertyId: newPhysicalPropertyId,
            propertyId: id,
            brokerId: user.id,
            requestedPrice: finalPrice,
            prismaClient: tx,
          });
          if (!claimRes.success) {
            throw new ListingSlotError(claimRes);
          }
          if (claimRes.sharedPrice !== undefined) {
            finalPrice = claimRes.sharedPrice;
          }
        }
      } else if (newPhysicalPropertyId) {
        // 2. Mesmo imóvel físico
        if (isOldActive && !isNewActive) {
          // Inativação/venda do anúncio
          await ListingSlotService.releaseListingSlot({
            physicalPropertyId: newPhysicalPropertyId,
            propertyId: id,
            newStatus: targetStatus,
            prismaClient: tx,
          });
        } else if (!isOldActive && isNewActive) {
          // Reativação do anúncio
          const claimRes = await ListingSlotService.claimListingSlot({
            physicalPropertyId: newPhysicalPropertyId,
            propertyId: id,
            brokerId: user.id,
            requestedPrice: finalPrice,
            prismaClient: tx,
          });
          if (!claimRes.success) {
            throw new ListingSlotError(claimRes);
          }
          if (claimRes.sharedPrice !== undefined) {
            finalPrice = claimRes.sharedPrice;
          }
        } else if (isNewActive && (existing.isPrimaryListing || user.role === 'ADMIN')) {
          // Continua ativo e o corretor principal ou admin atualizou o preço
          if (numericPrice !== undefined && !isNaN(numericPrice) && numericPrice !== existing.price && numericPrice > 0) {
            const updatePriceRes = await ListingSlotService.updateSharedPrice({
              physicalPropertyId: newPhysicalPropertyId,
              userId: user.id,
              userRole: user.role,
              newPrice: numericPrice,
              reason: 'Atualização via edição de anúncio.',
              prismaClient: tx,
            });
            if (!updatePriceRes.success) {
              throw new Error(updatePriceRes.message || 'Falha ao atualizar preço compartilhado.');
            }
            finalPrice = numericPrice;
          }
        }
      }

      const up = await tx.property.update({
        where: { id },
        data: {
          buildingId: resolvedBuildingId,
          physicalPropertyId: resolvedPhysicalPropertyId,
          title: title !== undefined ? title.trim() : existing.title,
          internalCode: internalCode !== undefined ? internalCode?.trim() || null : existing.internalCode,
          propertyType: propertyType || existing.propertyType,
          purpose: purpose || existing.purpose,
          status: targetStatus,
          price: finalPrice,
          privateArea: isLandPlot ? null : (privateArea !== undefined ? (privateArea ? parseFloat(String(privateArea)) : null) : existing.privateArea),
          builtArea: isLandPlot ? null : parsedBuiltArea,
          totalArea: totalArea !== undefined ? (totalArea ? parseFloat(String(totalArea)) : null) : existing.totalArea,
          landArea: landArea !== undefined ? (landArea ? parseFloat(String(landArea)) : null) : existing.landArea,
          bedrooms: isLandPlot ? 0 : computedBedrooms,
          suites: isLandPlot ? 0 : parsedSuites,
          otherBedrooms: isLandPlot ? null : parsedOtherBedrooms,
          bathrooms: isLandPlot ? 0 : computedBathrooms,
          otherBathrooms: isLandPlot ? null : parsedOtherBathrooms,
          socialBathrooms: isLandPlot ? null : parsedSocialBathrooms,
          lavabos: isLandPlot ? null : parsedLavabos,
          parkingSpaces: isLandPlot ? 0 : (parkingSpaces !== undefined ? parseInt(String(parkingSpaces), 10) : existing.parkingSpaces),
          coveredParkingSpaces: isLandPlot ? null : parsedCovered,
          uncoveredParkingSpaces: isLandPlot ? null : parsedUncovered,
          description: description !== undefined ? description?.trim() || null : existing.description,
          internalNotes: internalNotes !== undefined ? internalNotes?.trim() || null : existing.internalNotes,
          address: address !== undefined ? address?.trim() || null : existing.address,
          number: number !== undefined ? number?.trim() || null : existing.number,
          complement: complement !== undefined ? complement?.trim() || null : existing.complement,
          neighborhood: neighborhood !== undefined ? neighborhood?.trim() || null : existing.neighborhood,
          city: city !== undefined ? city?.trim() || null : existing.city,
          state: state !== undefined ? state?.trim() || null : existing.state,
          zipcode: zipcode !== undefined ? zipcode?.trim() || null : existing.zipcode,
          latitude: latitude !== undefined ? (latitude !== null && latitude !== '' && !isNaN(Number(latitude)) ? Number(latitude) : null) : existing.latitude,
          longitude: longitude !== undefined ? (longitude !== null && longitude !== '' && !isNaN(Number(longitude)) ? Number(longitude) : null) : existing.longitude,
          boundary: boundary !== undefined ? (boundary ? String(boundary) : null) : existing.boundary,
          boundaryArea: boundaryArea !== undefined ? (boundaryArea !== null && boundaryArea !== '' && !isNaN(Number(boundaryArea)) ? Number(boundaryArea) : null) : existing.boundaryArea,

          // Novos campos Fase 5.0.1
          acceptsExchange: acceptsExchange !== undefined ? (acceptsExchange === true || acceptsExchange === 'true' || acceptsExchange === 'Sim') : existing.acceptsExchange,
          exchangeNotes: exchangeNotes !== undefined ? exchangeNotes?.trim() || null : existing.exchangeNotes,
          registryNumber: registryNumber !== undefined ? registryNumber?.trim() || null : existing.registryNumber,
          isRegistered: isRegistered !== undefined ? (isRegistered === true || isRegistered === 'true' || isRegistered === 'Sim') : existing.isRegistered,
          hasPool: hasPool !== undefined ? (hasPool === true || hasPool === 'true' || hasPool === 'Sim') : existing.hasPool,
          hasGym: hasGym !== undefined ? (hasGym === true || hasGym === 'true' || hasGym === 'Sim') : existing.hasGym,
          furniture: furniture !== undefined ? furniture?.trim() || null : existing.furniture,
          hasBarbecue: hasBarbecue !== undefined ? (hasBarbecue === true || hasBarbecue === 'true' || hasBarbecue === 'Sim') : existing.hasBarbecue,
          hasPartyHall: hasPartyHall !== undefined ? (hasPartyHall === true || hasPartyHall === 'true' || hasPartyHall === 'Sim') : existing.hasPartyHall,
          hasElevator: hasElevator !== undefined ? (hasElevator === true || hasElevator === 'true' || hasElevator === 'Sim') : existing.hasElevator,
          isPenthouse: isPenthouse !== undefined ? (isPenthouse === true || isPenthouse === 'true' || isPenthouse === 'Sim') : existing.isPenthouse,
          hasPetSpace: hasPetSpace !== undefined ? (hasPetSpace === true || hasPetSpace === 'true' || hasPetSpace === 'Sim') : existing.hasPetSpace,
          floor: floor !== undefined ? (floor !== null && floor !== '' ? parseInt(String(floor), 10) : null) : existing.floor,
          isCorner: isCorner !== undefined ? (isCorner === true || isCorner === 'true' || isCorner === 'Sim') : existing.isCorner,
          inGatedCommunity: inGatedCommunity !== undefined ? (inGatedCommunity === true || inGatedCommunity === 'true' || inGatedCommunity === 'Sim') : existing.inGatedCommunity,
          inAllotment: inAllotment !== undefined ? (inAllotment === true || inAllotment === 'true' || inAllotment === 'Sim') : existing.inAllotment,
          streetPaving: streetPaving !== undefined ? streetPaving?.trim() || null : existing.streetPaving,
          commercialType: commercialType !== undefined ? commercialType?.trim() || null : existing.commercialType,
        },
        include: {
          images: true,
          building: {
            select: {
              id: true,
              name: true,
              address: true,
              neighborhood: true,
            },
          },
        },
      });

      return up;
    }, { timeout: 15000, maxWait: 5000 });

    // Recalcula matches após edição do imóvel
    const matchCount = await recalculateMatchesForProperty(updated.id);

    return NextResponse.json({ success: true, property: updated, matchCount });
  } catch (error: any) {
    if (error instanceof ListingSlotError) {
      return NextResponse.json(
        {
          error: error.claimResult.message,
          code: error.claimResult.reason,
          activeCount: error.claimResult.activeCount,
        },
        { status: 409 }
      );
    }

    if (error.code === 'P2002') {
      return NextResponse.json(
        {
          error: 'O corretor já possui um anúncio ativo para este imóvel físico.',
          code: 'DUPLICATE_BROKER',
        },
        { status: 409 }
      );
    }

    console.error('Erro ao atualizar imóvel:', error);
    return NextResponse.json({ error: error.message || 'Falha ao atualizar imóvel.' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const termsCheck = await assertUserAcceptedTerms(user);
    if (!termsCheck.allowed) {
      return termsCheck.errorResponse!;
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.property.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Imóvel não encontrado.' }, { status: 404 });
    }

    if (body.status !== undefined && body.status !== 'Inativo' && existing.status === 'Inativo') {
      const exposureCheck = await canPropertyBePubliclyExposed(id);
      if (!exposureCheck.allowed) {
        if (body.hasOwnerAuthorization === true || body.hasOwnerAuthorization === 'true') {
          await recordPropertyAuthorization({
            propertyId: id,
            brokerId: user.id,
          });
        } else {
          return NextResponse.json(
            {
              error: 'Para ativar o imóvel, é necessária a confirmação da autorização de divulgação do proprietário.',
              authorizationRequired: true,
            },
            { status: 400 }
          );
        }
      }
    }

    const isActivating = body.status !== undefined && body.status === 'Disponível' && existing.status !== 'Disponível';
    const isDeactivating = body.status !== undefined && body.status !== 'Disponível' && existing.status === 'Disponível';

    const updated = await prisma.$transaction(async (tx) => {
      if (existing.physicalPropertyId) {
        if (isActivating) {
          const claimRes = await ListingSlotService.claimListingSlot({
            physicalPropertyId: existing.physicalPropertyId,
            propertyId: id,
            brokerId: user.id,
            requestedPrice: existing.price,
            prismaClient: tx,
          });
          if (!claimRes.success) {
            throw new ListingSlotError(claimRes);
          }
        } else if (isDeactivating) {
          await ListingSlotService.releaseListingSlot({
            physicalPropertyId: existing.physicalPropertyId,
            propertyId: id,
            newStatus: body.status,
            prismaClient: tx,
          });
        }
      }

      return tx.property.update({
        where: { id },
        data: {
          status: body.status !== undefined ? body.status : existing.status,
          latitude: body.latitude !== undefined ? (body.latitude !== null && body.latitude !== '' && !isNaN(Number(body.latitude)) ? Number(body.latitude) : null) : existing.latitude,
          longitude: body.longitude !== undefined ? (body.longitude !== null && body.longitude !== '' && !isNaN(Number(body.longitude)) ? Number(body.longitude) : null) : existing.longitude,
          boundary: body.boundary !== undefined ? (body.boundary ? String(body.boundary) : null) : existing.boundary,
          boundaryArea: body.boundaryArea !== undefined ? (body.boundaryArea !== null && body.boundaryArea !== '' && !isNaN(Number(body.boundaryArea)) ? Number(body.boundaryArea) : null) : existing.boundaryArea,
        },
      });
    }, { timeout: 15000, maxWait: 5000 });

    await recalculateMatchesForProperty(updated.id);

    return NextResponse.json({ success: true, property: updated });
  } catch (error: any) {
    if (error instanceof ListingSlotError) {
      return NextResponse.json(
        {
          error: error.claimResult.message,
          code: error.claimResult.reason,
          activeCount: error.claimResult.activeCount,
        },
        { status: 409 }
      );
    }

    if (error.code === 'P2002') {
      return NextResponse.json(
        {
          error: 'O corretor já possui um anúncio ativo para este imóvel físico.',
          code: 'DUPLICATE_BROKER',
        },
        { status: 409 }
      );
    }

    console.error('Erro ao atualizar imóvel parcialmente:', error);
    return NextResponse.json({ error: error.message || 'Falha ao atualizar imóvel.' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const termsCheck = await assertUserAcceptedTerms(user);
    if (!termsCheck.allowed) {
      return termsCheck.errorResponse!;
    }

    const { id } = await params;

    const existing = await prisma.property.findFirst({
      where: {
        id,
        ...(user.role === 'ADMIN' ? {} : {
          OR: [{ userId: user.id }, { responsibleBrokerId: user.id }],
        }),
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Imóvel não encontrado ou você não tem permissão para excluí-lo.' },
        { status: 403 }
      );
    }

    if (existing.physicalPropertyId && existing.status === 'Disponível') {
      await prisma.$transaction(async (tx) => {
        await ListingSlotService.releaseListingSlot({
          physicalPropertyId: existing.physicalPropertyId!,
          propertyId: id,
          isDeleting: true,
          prismaClient: tx,
        });
        await tx.property.delete({
          where: { id },
        });
      }, { timeout: 15000, maxWait: 5000 });
    } else {
      await prisma.property.delete({
        where: { id },
      });
    }

    return NextResponse.json({ success: true, message: 'Imóvel excluído com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao excluir imóvel:', error);
    return NextResponse.json({ error: error.message || 'Falha ao excluir imóvel.' }, { status: 500 });
  }
}
