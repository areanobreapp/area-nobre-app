import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recalculateMatchesForProperty } from '@/lib/matching';
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

    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
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

    const sanitizedProperty: any = {
      ...property,
      internalNotes: (!isOwner && !isAdmin) ? null : property.internalNotes,
      exchangeNotes: (!isOwner && !isAdmin) ? null : property.exchangeNotes,
      registryNumber: (!isOwner && !isAdmin) ? null : property.registryNumber,
      boundary: (!isOwner && !isAdmin) ? null : property.boundary,
      matches: formattedMatches,
    };

    return NextResponse.json({
      success: true,
      property: sanitizedProperty,
      isOwner: isOwner || isAdmin,
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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
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
      images, // array de URLs atualizado
    } = body;

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

    const updated = await prisma.property.update({
      where: { id },
      data: {
        title: title !== undefined ? title.trim() : existing.title,
        internalCode: internalCode !== undefined ? internalCode?.trim() || null : existing.internalCode,
        propertyType: propertyType || existing.propertyType,
        purpose: purpose || existing.purpose,
        status: status || existing.status,
        price: numericPrice !== undefined && !isNaN(numericPrice) ? numericPrice : existing.price,
        privateArea: privateArea !== undefined ? (privateArea ? parseFloat(String(privateArea)) : null) : existing.privateArea,
        totalArea: totalArea !== undefined ? (totalArea ? parseFloat(String(totalArea)) : null) : existing.totalArea,
        landArea: landArea !== undefined ? (landArea ? parseFloat(String(landArea)) : null) : existing.landArea,
        bedrooms: computedBedrooms,
        suites: parsedSuites,
        otherBedrooms: parsedOtherBedrooms,
        bathrooms: computedBathrooms,
        otherBathrooms: parsedOtherBathrooms,
        parkingSpaces: parkingSpaces !== undefined ? parseInt(String(parkingSpaces), 10) : existing.parkingSpaces,
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
      },
    });

    // Recalcula matches após edição do imóvel
    const matchCount = await recalculateMatchesForProperty(updated.id);

    return NextResponse.json({ success: true, property: updated, matchCount });
  } catch (error) {
    console.error('Erro ao atualizar imóvel:', error);
    return NextResponse.json({ error: 'Falha ao atualizar imóvel.' }, { status: 500 });
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

    const existing = await prisma.property.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Imóvel não encontrado.' }, { status: 404 });
    }

    const updated = await prisma.property.update({
      where: { id },
      data: {
        status: body.status !== undefined ? body.status : existing.status,
        latitude: body.latitude !== undefined ? (body.latitude !== null && body.latitude !== '' && !isNaN(Number(body.latitude)) ? Number(body.latitude) : null) : existing.latitude,
        longitude: body.longitude !== undefined ? (body.longitude !== null && body.longitude !== '' && !isNaN(Number(body.longitude)) ? Number(body.longitude) : null) : existing.longitude,
        boundary: body.boundary !== undefined ? (body.boundary ? String(body.boundary) : null) : existing.boundary,
        boundaryArea: body.boundaryArea !== undefined ? (body.boundaryArea !== null && body.boundaryArea !== '' && !isNaN(Number(body.boundaryArea)) ? Number(body.boundaryArea) : null) : existing.boundaryArea,
      },
    });

    await recalculateMatchesForProperty(updated.id);

    return NextResponse.json({ success: true, property: updated });
  } catch (error) {
    console.error('Erro ao atualizar imóvel parcialmente:', error);
    return NextResponse.json({ error: 'Falha ao atualizar imóvel.' }, { status: 500 });
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

    // Desativação ou exclusão
    await prisma.property.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Imóvel excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir imóvel:', error);
    return NextResponse.json({ error: 'Falha ao excluir imóvel.' }, { status: 500 });
  }
}
