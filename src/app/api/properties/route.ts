import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recalculateMatchesForProperty } from '@/lib/matching';
import { getGeoProvider } from '@/lib/geo';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
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

    if (!title || !propertyType || !purpose || price === undefined || price === null) {
      return NextResponse.json(
        { error: 'Título, tipo de imóvel, finalidade e valor são obrigatórios.' },
        { status: 400 }
      );
    }

    const numericPrice = typeof price === 'string' ? parseFloat(price.replace(/\D/g, '')) / 100 || parseFloat(price) : Number(price);

    const parsedSuites = suites !== undefined && suites !== null ? parseInt(String(suites), 10) : 0;
    const parsedOtherBedrooms = otherBedrooms !== undefined && otherBedrooms !== null ? parseInt(String(otherBedrooms), 10) : null;
    const parsedOtherBathrooms = otherBathrooms !== undefined && otherBathrooms !== null ? parseInt(String(otherBathrooms), 10) : null;

    // Se informou outros quartos, calcula total de dormitórios = suítes + outros quartos
    const computedBedrooms = parsedOtherBedrooms !== null
      ? parsedSuites + parsedOtherBedrooms
      : (bedrooms ? parseInt(String(bedrooms), 10) : parsedSuites);

    // Se informou outros banheiros, calcula total de banheiros = suítes + outros banheiros
    const computedBathrooms = parsedOtherBathrooms !== null
      ? parsedSuites + parsedOtherBathrooms
      : (bathrooms ? parseInt(String(bathrooms), 10) : parsedSuites);

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

    const property = await prisma.property.create({
      data: {
        userId: user.id,
        responsibleBrokerId: user.id,
        title: title.trim(),
        internalCode: internalCode?.trim() || null,
        propertyType,
        purpose,
        status: status || 'Disponível',
        price: numericPrice || 0,
        privateArea: privateArea ? parseFloat(String(privateArea)) : null,
        totalArea: totalArea ? parseFloat(String(totalArea)) : null,
        landArea: landArea ? parseFloat(String(landArea)) : null,
        bedrooms: computedBedrooms,
        suites: parsedSuites,
        otherBedrooms: parsedOtherBedrooms,
        bathrooms: computedBathrooms,
        otherBathrooms: parsedOtherBathrooms,
        parkingSpaces: parkingSpaces ? parseInt(String(parkingSpaces), 10) : 0,
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

    // Recalcula matches imediatamente para a carteira
    const matchCount = await recalculateMatchesForProperty(property.id);

    return NextResponse.json({ success: true, property, matchCount });
  } catch (error) {
    console.error('Erro ao cadastrar imóvel:', error);
    return NextResponse.json({ error: 'Falha ao salvar imóvel.' }, { status: 500 });
  }
}
