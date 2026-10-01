import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recalculateMatchesForDevelopment } from '@/lib/matching';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
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
          create: (typologies || []).map((t: any) => {
            const suites = t.suites !== undefined ? parseInt(String(t.suites), 10) || 0 : 0;
            const otherBedrooms = t.otherBedrooms !== undefined && t.otherBedrooms !== null ? parseInt(String(t.otherBedrooms), 10) : null;
            const otherBathrooms = t.otherBathrooms !== undefined && t.otherBathrooms !== null ? parseInt(String(t.otherBathrooms), 10) : null;
            const bedrooms = otherBedrooms !== null ? suites + otherBedrooms : (t.bedrooms !== undefined ? parseInt(String(t.bedrooms), 10) || 0 : suites);
            const bathrooms = otherBathrooms !== null ? suites + otherBathrooms : (t.bathrooms !== undefined ? parseInt(String(t.bathrooms), 10) || 0 : suites);

            return {
              name: t.name?.trim() || 'Tipologia',
              propertyType: t.propertyType || 'Apartamento',
              price: typeof t.price === 'string' ? parseFloat(t.price.replace(/\D/g, '')) || 0 : Number(t.price) || 0,
              privateArea: t.privateArea ? parseFloat(String(t.privateArea)) : null,
              totalArea: t.totalArea ? parseFloat(String(t.totalArea)) : null,
              bedrooms,
              suites,
              otherBedrooms,
              bathrooms,
              otherBathrooms,
              parkingSpaces: t.parkingSpaces !== undefined ? parseInt(String(t.parkingSpaces), 10) || 0 : 0,
              status: t.status || 'Disponível',
              notes: t.notes?.trim() || null,
              acceptsExchange: t.acceptsExchange !== undefined ? Boolean(t.acceptsExchange) : null,
              exchangeNotes: t.exchangeNotes?.trim() || null,
              hasBarbecue: t.hasBarbecue !== undefined ? Boolean(t.hasBarbecue) : null,
              hasElevator: t.hasElevator !== undefined ? Boolean(t.hasElevator) : null,
              isPenthouse: t.isPenthouse !== undefined ? Boolean(t.isPenthouse) : null,
            };
          }),
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
