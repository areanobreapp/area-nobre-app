import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recalculateMatchesForDevelopment } from '@/lib/matching';

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

    const development = await prisma.development.findUnique({
      where: { id },
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
        typologies: {
          include: {
            matches: {
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
          orderBy: { price: 'asc' },
        },
      },
    });

    if (!development) {
      return NextResponse.json({ error: 'Empreendimento não encontrado.' }, { status: 404 });
    }

    const isOwner = development.userId === user.id || development.responsibleBrokerId === user.id;
    const isAdmin = user.role === 'ADMIN';

    // Se corretor inativo e usuário não for admin nem dono, 404
    if (development.responsibleBroker?.status === 'INACTIVE' && !isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Empreendimento não disponível.' }, { status: 404 });
    }

    // Formata explicações das tipologias e sanitiza para não-proprietários
    const formattedTypologies = development.typologies.map((t) => {
      const sanitizedMatches = (t.matches || []).map((m: any) => {
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

      return {
        ...t,
        notes: (!isOwner && !isAdmin) ? null : t.notes,
        matches: (isOwner || isAdmin) ? sanitizedMatches : [],
      };
    });

    return NextResponse.json({
      success: true,
      development: {
        ...development,
        typologies: formattedTypologies,
      },
      isOwner: isOwner || isAdmin,
    });
  } catch (error) {
    console.error('Erro ao buscar empreendimento:', error);
    return NextResponse.json({ error: 'Falha ao buscar empreendimento.' }, { status: 500 });
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

    const existing = await prisma.development.findFirst({
      where: {
        id,
        ...(user.role === 'ADMIN' ? {} : {
          OR: [{ userId: user.id }, { responsibleBrokerId: user.id }],
        }),
      },
      include: { images: true, typologies: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Empreendimento não encontrado.' }, { status: 404 });
    }

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
      images,
      typologies,
    } = body;

    // Atualiza fotos se fornecidas
    if (images && Array.isArray(images)) {
      await prisma.developmentImage.deleteMany({
        where: { developmentId: id },
      });

      await prisma.developmentImage.createMany({
        data: images.map((url: string, index: number) => ({
          developmentId: id,
          url,
          isCover: index === 0,
          order: index,
        })),
      });
    }

    // Atualiza tipologias se fornecidas
    if (typologies && Array.isArray(typologies)) {
      await prisma.typology.deleteMany({
        where: { developmentId: id },
      });

      await prisma.typology.createMany({
        data: typologies.map((t: any) => {
          const suites = t.suites !== undefined ? parseInt(String(t.suites), 10) || 0 : 0;
          const otherBedrooms = t.otherBedrooms !== undefined && t.otherBedrooms !== null ? parseInt(String(t.otherBedrooms), 10) : null;
          const otherBathrooms = t.otherBathrooms !== undefined && t.otherBathrooms !== null ? parseInt(String(t.otherBathrooms), 10) : null;
          const bedrooms = otherBedrooms !== null ? suites + otherBedrooms : (t.bedrooms !== undefined ? parseInt(String(t.bedrooms), 10) || 0 : suites);
          const bathrooms = otherBathrooms !== null ? suites + otherBathrooms : (t.bathrooms !== undefined ? parseInt(String(t.bathrooms), 10) || 0 : suites);

          return {
            developmentId: id,
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
      });
    }

    const updated = await prisma.development.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        developer: developer !== undefined ? developer.trim() : existing.developer,
        stage: stage !== undefined ? stage.trim() : existing.stage,
        deliveryDate: deliveryDate !== undefined ? deliveryDate?.trim() || null : existing.deliveryDate,
        status: status !== undefined ? status : existing.status,
        description: description !== undefined ? description?.trim() || null : existing.description,
        internalNotes: internalNotes !== undefined ? internalNotes?.trim() || null : existing.internalNotes,
        address: address !== undefined ? address?.trim() || null : existing.address,
        number: number !== undefined ? number?.trim() || null : existing.number,
        complement: complement !== undefined ? complement?.trim() || null : existing.complement,
        neighborhood: neighborhood !== undefined ? neighborhood?.trim() || null : existing.neighborhood,
        city: city !== undefined ? city?.trim() || null : existing.city,
        state: state !== undefined ? state?.trim() || null : existing.state,
        zipcode: zipcode !== undefined ? zipcode?.trim() || null : existing.zipcode,
        latitude: latitude !== undefined ? (latitude ? parseFloat(String(latitude)) : null) : existing.latitude,
        longitude: longitude !== undefined ? (longitude ? parseFloat(String(longitude)) : null) : existing.longitude,
        hasPool: hasPool !== undefined ? Boolean(hasPool) : existing.hasPool,
        hasGym: hasGym !== undefined ? Boolean(hasGym) : existing.hasGym,
        hasPartyHall: hasPartyHall !== undefined ? Boolean(hasPartyHall) : existing.hasPartyHall,
        hasPetSpace: hasPetSpace !== undefined ? Boolean(hasPetSpace) : existing.hasPetSpace,
        hasElevator: hasElevator !== undefined ? Boolean(hasElevator) : existing.hasElevator,
        hasDirectInstallments: hasDirectInstallments !== undefined ? Boolean(hasDirectInstallments) : existing.hasDirectInstallments,
      },
      include: {
        images: {
          orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
        },
        typologies: {
          orderBy: { price: 'asc' },
        },
      },
    });

    // Recalcula matches após atualização do empreendimento e tipologias
    await recalculateMatchesForDevelopment(updated.id);

    return NextResponse.json({ success: true, development: updated });
  } catch (error) {
    console.error('Erro ao atualizar empreendimento:', error);
    return NextResponse.json({ error: 'Falha ao atualizar empreendimento.' }, { status: 500 });
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

    const existing = await prisma.development.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Empreendimento não encontrado.' }, { status: 404 });
    }

    const updated = await prisma.development.update({
      where: { id },
      data: {
        status: body.status !== undefined ? body.status : existing.status,
        latitude: body.latitude !== undefined ? (body.latitude ? parseFloat(String(body.latitude)) : null) : existing.latitude,
        longitude: body.longitude !== undefined ? (body.longitude ? parseFloat(String(body.longitude)) : null) : existing.longitude,
      },
    });

    // Recalcula matches após alteração de status do empreendimento
    await recalculateMatchesForDevelopment(updated.id);

    return NextResponse.json({ success: true, development: updated });
  } catch (error) {
    console.error('Erro ao alternar status do empreendimento:', error);
    return NextResponse.json({ error: 'Falha ao atualizar status.' }, { status: 500 });
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

    const existing = await prisma.development.findFirst({
      where: {
        id,
        ...(user.role === 'ADMIN' ? {} : {
          OR: [{ userId: user.id }, { responsibleBrokerId: user.id }],
        }),
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Empreendimento não encontrado.' }, { status: 404 });
    }

    await prisma.development.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Empreendimento excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir empreendimento:', error);
    return NextResponse.json({ error: 'Falha ao excluir empreendimento.' }, { status: 500 });
  }
}
