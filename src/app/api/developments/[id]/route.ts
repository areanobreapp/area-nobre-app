import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recalculateMatchesForDevelopment } from '@/lib/matching';
import { validateNonNegativeInt, validateNonNegativeFloat } from '@/lib/validation';
import { assertUserAcceptedTerms } from '@/lib/legal/service';
import {
  buildDevelopmentVisibleByIdWhere,
  normalizeDevelopmentStatusInput,
  resolvePublicationStatus,
  DEVELOPMENT_BUILDING_SELECT,
  DEVELOPMENT_COMPANY_SELECT,
} from '@/lib/development-visibility';

const VALID_PROJECT_TYPES = ['VERTICAL', 'HORIZONTAL', 'MISTO', 'LOTEAMENTO'];

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

    // Visibilidade (Bloco 6A.6): o registro só é aberto se estiver no escopo de acesso e publicação do usuário.
    const development = await prisma.development.findFirst({
      where: buildDevelopmentVisibleByIdWhere(user, id),
      include: {
        company: {
          select: DEVELOPMENT_COMPANY_SELECT,
        },
        images: {
          orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
        },
        blocks: {
          orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        },
        building: { select: DEVELOPMENT_BUILDING_SELECT },
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

    const isOwner =
      !development.companyId &&
      (development.userId === user.id || development.responsibleBrokerId === user.id);
    const isAdmin = user.role === 'ADMIN';

    // Se corretor inativo e usuário não for admin nem dono, 404
    if (!development.companyId && development.responsibleBroker?.status === 'INACTIVE' && !isAdmin && !isOwner) {
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
        publicationStatus: resolvePublicationStatus(development.status),
        internalNotes: (isOwner || isAdmin) ? development.internalNotes : null,
        typologies: formattedTypologies,
      },
      isOwner: isOwner || isAdmin,
      canManage: isAdmin, // Somente ADMIN gerencia dados oficiais (Bloco 6)
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

    const termsCheck = await assertUserAcceptedTerms(user);
    if (!termsCheck.allowed) {
      return termsCheck.errorResponse!;
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.development.findUnique({
      where: { id },
      include: { images: true, typologies: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Empreendimento não encontrado.' }, { status: 404 });
    }

    // Regra de negócio (Bloco 6): somente ADMIN edita dados oficiais de empreendimentos.
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Apenas administradores podem editar empreendimentos de construtoras.' },
        { status: 403 }
      );
    }

    const {
      name,
      developer,
      companyId,
      projectType,
      totalTowers,
      totalUnits,
      stage,
      deliveryDate,
      deliveryYear,
      deliveryMonth,
      indexCorrection,
      status,
      publicationStatus,
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
      buildingId,
      hasPool,
      hasGym,
      hasPartyHall,
      hasPetSpace,
      hasElevator,
      hasDirectInstallments,
      images,
      typologies,
    } = body;

    if (name !== undefined && !String(name).trim()) {
      return NextResponse.json({ error: 'Nome do empreendimento não pode ser vazio.' }, { status: 400 });
    }

    let resolvedProjectType = existing.projectType;
    if (projectType !== undefined && projectType !== null && String(projectType).trim() !== '') {
      const pt = String(projectType).trim().toUpperCase();
      if (!VALID_PROJECT_TYPES.includes(pt)) {
        return NextResponse.json(
          { error: `Tipo de projeto inválido. Valores aceitos: ${VALID_PROJECT_TYPES.join(', ')}.` },
          { status: 400 }
        );
      }
      resolvedProjectType = pt;
    }

    let resolvedTotalTowers = existing.totalTowers;
    if (totalTowers !== undefined) {
      if (totalTowers === null || String(totalTowers).trim() === '') {
        resolvedTotalTowers = null;
      } else {
        const vTowers = validateNonNegativeInt(totalTowers, 'Quantidade de torres/quadras');
        if (vTowers.error) return NextResponse.json({ error: vTowers.error }, { status: 400 });
        resolvedTotalTowers = vTowers.value;
      }
    }

    let resolvedTotalUnits = existing.totalUnits;
    if (totalUnits !== undefined) {
      if (totalUnits === null || String(totalUnits).trim() === '') {
        resolvedTotalUnits = null;
      } else {
        const vUnits = validateNonNegativeInt(totalUnits, 'Total estimado de unidades');
        if (vUnits.error) return NextResponse.json({ error: vUnits.error }, { status: 400 });
        resolvedTotalUnits = vUnits.value;
      }
    }

    let resolvedDeliveryMonth = existing.deliveryMonth;
    if (deliveryMonth !== undefined) {
      if (deliveryMonth === null || String(deliveryMonth).trim() === '') {
        resolvedDeliveryMonth = null;
      } else {
        const m = parseInt(String(deliveryMonth), 10);
        if (isNaN(m) || m < 1 || m > 12) {
          return NextResponse.json({ error: 'Mês de entrega inválido (1 a 12).' }, { status: 400 });
        }
        resolvedDeliveryMonth = m;
      }
    }

    let resolvedDeliveryYear = existing.deliveryYear;
    if (deliveryYear !== undefined) {
      if (deliveryYear === null || String(deliveryYear).trim() === '') {
        resolvedDeliveryYear = null;
      } else {
        const y = parseInt(String(deliveryYear), 10);
        if (isNaN(y) || y < 1990 || y > 2100) {
          return NextResponse.json({ error: 'Ano de entrega inválido.' }, { status: 400 });
        }
        resolvedDeliveryYear = y;
      }
    }

    let resolvedDeliveryDate =
      deliveryDate !== undefined ? deliveryDate?.trim() || null : existing.deliveryDate;
    if (!resolvedDeliveryDate && resolvedDeliveryYear) {
      resolvedDeliveryDate = resolvedDeliveryMonth
        ? `${String(resolvedDeliveryMonth).padStart(2, '0')}/${resolvedDeliveryYear}`
        : `${resolvedDeliveryYear}`;
    }

    let resolvedBuildingId = existing.buildingId;
    if (buildingId !== undefined) {
      if (buildingId === null || String(buildingId).trim() === '') {
        resolvedBuildingId = null;
      } else {
        const building = await prisma.building.findUnique({ where: { id: String(buildingId).trim() } });
        if (!building) {
          return NextResponse.json({ error: 'Edifício da base cartográfica não encontrado.' }, { status: 404 });
        }
        resolvedBuildingId = building.id;
      }
    }

    const resolvedStatus =
      status !== undefined || publicationStatus !== undefined
        ? normalizeDevelopmentStatusInput(status ?? existing.status, publicationStatus)
        : existing.status;

    // Atualiza fotos se fornecidas
    if (images && Array.isArray(images)) {
      await prisma.developmentImage.deleteMany({
        where: { developmentId: id },
      });

      const normalizedImages = images
        .map((img: any, index: number) => {
          const url = typeof img === 'string' ? img.trim() : String(img?.url || '').trim();
          if (!url) return null;
          const isCover =
            typeof img === 'object' && img !== null && typeof img.isCover === 'boolean'
              ? img.isCover
              : index === 0;
          return {
            developmentId: id,
            url,
            isCover,
            order: index,
          };
        })
        .filter(Boolean) as { developmentId: string; url: string; isCover: boolean; order: number }[];

      if (normalizedImages.length > 0) {
        await prisma.developmentImage.createMany({
          data: normalizedImages,
        });
      }
    }

    // Valida e prepara tipologias com integridade relacional estrita (preserva IDs, links públicos e matches)
    const validatedTypologiesToProcess: { id?: string; data: any; isExisting: boolean }[] = [];
    if (typologies && Array.isArray(typologies)) {
      for (let i = 0; i < typologies.length; i++) {
        const t = typologies[i];
        const tipLabel = t.name?.trim() ? `Tipologia "${t.name.trim()}": ` : `Tipologia #${i + 1}: `;

        const vSuites = validateNonNegativeInt(t.suites, 'Suítes', { defaultValue: 0 });
        if (vSuites.error) return NextResponse.json({ error: `${tipLabel}${vSuites.error}` }, { status: 400 });

        const vOtherBedrooms = validateNonNegativeInt(t.otherBedrooms, 'Demais quartos');
        if (vOtherBedrooms.error) return NextResponse.json({ error: `${tipLabel}${vOtherBedrooms.error}` }, { status: 400 });

        const vBedrooms = validateNonNegativeInt(t.bedrooms, 'Total de quartos');
        if (vBedrooms.error) return NextResponse.json({ error: `${tipLabel}${vBedrooms.error}` }, { status: 400 });

        const vSocialBathrooms = validateNonNegativeInt(t.socialBathrooms, 'Banheiros sociais');
        if (vSocialBathrooms.error) return NextResponse.json({ error: `${tipLabel}${vSocialBathrooms.error}` }, { status: 400 });

        const vLavabos = validateNonNegativeInt(t.lavabos, 'Lavabos');
        if (vLavabos.error) return NextResponse.json({ error: `${tipLabel}${vLavabos.error}` }, { status: 400 });

        const vBathrooms = validateNonNegativeInt(t.bathrooms, 'Total de banheiros');
        if (vBathrooms.error) return NextResponse.json({ error: `${tipLabel}${vBathrooms.error}` }, { status: 400 });

        const vCovered = validateNonNegativeInt(t.coveredParkingSpaces, 'Vagas cobertas');
        if (vCovered.error) return NextResponse.json({ error: `${tipLabel}${vCovered.error}` }, { status: 400 });

        const vUncovered = validateNonNegativeInt(t.uncoveredParkingSpaces, 'Vagas descobertas');
        if (vUncovered.error) return NextResponse.json({ error: `${tipLabel}${vUncovered.error}` }, { status: 400 });

        const vParkingSpaces = validateNonNegativeInt(t.parkingSpaces, 'Total de vagas');
        if (vParkingSpaces.error) return NextResponse.json({ error: `${tipLabel}${vParkingSpaces.error}` }, { status: 400 });

        const vPrice = validateNonNegativeFloat(t.price, 'Valor', { isCurrencyString: true, defaultValue: 0 });
        if (vPrice.error) return NextResponse.json({ error: `${tipLabel}${vPrice.error}` }, { status: 400 });

        const vPrivateArea = validateNonNegativeFloat(t.privateArea, 'Área privativa');
        if (vPrivateArea.error) return NextResponse.json({ error: `${tipLabel}${vPrivateArea.error}` }, { status: 400 });

        const vBuiltArea = validateNonNegativeFloat(t.builtArea, 'Área construída');
        if (vBuiltArea.error) return NextResponse.json({ error: `${tipLabel}${vBuiltArea.error}` }, { status: 400 });

        const vTotalArea = validateNonNegativeFloat(t.totalArea, 'Área total');
        if (vTotalArea.error) return NextResponse.json({ error: `${tipLabel}${vTotalArea.error}` }, { status: 400 });

        const suites = vSuites.value ?? 0;
        const otherBedrooms = vOtherBedrooms.value;
        const bedrooms = otherBedrooms !== null
          ? suites + otherBedrooms
          : (vBedrooms.value !== null ? vBedrooms.value : suites);

        const socialBathrooms = vSocialBathrooms.value;
        const lavabos = vLavabos.value;
        let bathrooms = vBathrooms.value !== null ? vBathrooms.value : suites;
        if (socialBathrooms !== null || lavabos !== null) {
          bathrooms = suites + (socialBathrooms ?? 0) + (lavabos ?? 0);
        }

        const coveredParkingSpaces = vCovered.value;
        const uncoveredParkingSpaces = vUncovered.value;
        let parkingSpaces = vParkingSpaces.value !== null ? vParkingSpaces.value : 0;
        if (coveredParkingSpaces !== null || uncoveredParkingSpaces !== null) {
          parkingSpaces = (coveredParkingSpaces ?? 0) + (uncoveredParkingSpaces ?? 0);
        }

        const typologyData = {
          name: t.name?.trim() || 'Tipologia',
          propertyType: t.propertyType || 'Apartamento',
          price: vPrice.value ?? 0,
          privateArea: vPrivateArea.value,
          builtArea: vBuiltArea.value,
          totalArea: vTotalArea.value,
          bedrooms,
          suites,
          otherBedrooms,
          bathrooms,
          socialBathrooms,
          lavabos,
          parkingSpaces,
          coveredParkingSpaces,
          uncoveredParkingSpaces,
          status: t.status || 'Disponível',
          notes: t.notes?.trim() || null,
          acceptsExchange: t.acceptsExchange !== undefined ? Boolean(t.acceptsExchange) : null,
          exchangeNotes: t.exchangeNotes?.trim() || null,
          hasBarbecue: t.hasBarbecue !== undefined ? Boolean(t.hasBarbecue) : null,
          hasElevator: t.hasElevator !== undefined ? Boolean(t.hasElevator) : null,
          isPenthouse: t.isPenthouse !== undefined ? Boolean(t.isPenthouse) : null,
        };

        const isExistingTypology = Boolean(t.id && existing.typologies.some((et: any) => et.id === t.id));
        validatedTypologiesToProcess.push({
          id: t.id,
          data: typologyData,
          isExisting: isExistingTypology,
        });
      }

      const incomingIds = typologies
        .map((t: any) => t.id)
        .filter((tid: any) => typeof tid === 'string' && tid.trim() !== '') as string[];

      // 1. Remove apenas tipologias que foram retiradas do empreendimento
      await prisma.typology.deleteMany({
        where: {
          developmentId: id,
          id: { notIn: incomingIds },
        },
      });

      // 2. Atualiza existentes ou insere novas preservando campos e integridade
      for (const item of validatedTypologiesToProcess) {
        if (item.isExisting && item.id) {
          await prisma.typology.update({
            where: { id: item.id },
            data: item.data,
          });
        } else {
          await prisma.typology.create({
            data: {
              ...item.data,
              developmentId: id,
            },
          });
        }
      }
    }

    let resolvedCompanyId: string | null = existing.companyId;
    let resolvedDeveloper: string = existing.developer;

    if (companyId !== undefined) {
      if (companyId && typeof companyId === 'string' && companyId.trim()) {
        const company = await prisma.company.findUnique({
          where: { id: companyId.trim() },
        });
        if (!company) {
          return NextResponse.json({ error: 'Construtora informada não existe.' }, { status: 404 });
        }
        if (company.status !== 'ACTIVE' && company.id !== existing.companyId) {
          return NextResponse.json({ error: 'A construtora informada está inativa.' }, { status: 400 });
        }
        resolvedCompanyId = company.id;
        resolvedDeveloper = company.tradeName || company.name;
      } else {
        if (existing.companyId) {
          return NextResponse.json({ error: 'É obrigatório selecionar uma construtora cadastrada válida.' }, { status: 400 });
        }
      }
    } else if (developer !== undefined && developer.trim() && !existing.companyId) {
      resolvedDeveloper = developer.trim();
    }

    const parsedLat =
      latitude !== undefined
        ? latitude !== null && String(latitude).trim() !== ''
          ? parseFloat(String(latitude))
          : null
        : existing.latitude;
    const parsedLng =
      longitude !== undefined
        ? longitude !== null && String(longitude).trim() !== ''
          ? parseFloat(String(longitude))
          : null
        : existing.longitude;

    const updated = await prisma.development.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        developer: resolvedDeveloper,
        companyId: resolvedCompanyId,
        projectType: resolvedProjectType,
        totalTowers: resolvedTotalTowers,
        totalUnits: resolvedTotalUnits,
        stage: stage !== undefined ? stage.trim() : existing.stage,
        deliveryDate: resolvedDeliveryDate,
        deliveryYear: resolvedDeliveryYear,
        deliveryMonth: resolvedDeliveryMonth,
        indexCorrection: indexCorrection !== undefined ? indexCorrection?.trim() || null : existing.indexCorrection,
        status: resolvedStatus,
        description: description !== undefined ? description?.trim() || null : existing.description,
        internalNotes: internalNotes !== undefined ? internalNotes?.trim() || null : existing.internalNotes,
        address: address !== undefined ? address?.trim() || null : existing.address,
        number: number !== undefined ? number?.trim() || null : existing.number,
        complement: complement !== undefined ? complement?.trim() || null : existing.complement,
        neighborhood: neighborhood !== undefined ? neighborhood?.trim() || null : existing.neighborhood,
        city: city !== undefined ? city?.trim() || null : existing.city,
        state: state !== undefined ? (state?.trim() ? state.trim().toUpperCase() : null) : existing.state,
        zipcode: zipcode !== undefined ? zipcode?.trim() || null : existing.zipcode,
        latitude: parsedLat !== null && !isNaN(parsedLat) ? parsedLat : null,
        longitude: parsedLng !== null && !isNaN(parsedLng) ? parsedLng : null,
        buildingId: resolvedBuildingId,
        hasPool: hasPool !== undefined ? Boolean(hasPool) : existing.hasPool,
        hasGym: hasGym !== undefined ? Boolean(hasGym) : existing.hasGym,
        hasPartyHall: hasPartyHall !== undefined ? Boolean(hasPartyHall) : existing.hasPartyHall,
        hasPetSpace: hasPetSpace !== undefined ? Boolean(hasPetSpace) : existing.hasPetSpace,
        hasElevator: hasElevator !== undefined ? Boolean(hasElevator) : existing.hasElevator,
        hasDirectInstallments: hasDirectInstallments !== undefined ? Boolean(hasDirectInstallments) : existing.hasDirectInstallments,
      },
      include: {
        company: {
          select: DEVELOPMENT_COMPANY_SELECT,
        },
        building: { select: DEVELOPMENT_BUILDING_SELECT },
        images: {
          orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
        },
        typologies: {
          orderBy: { price: 'asc' },
        },
        blocks: {
          orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        },
      },
    });

    // Recalcula matches após atualização do empreendimento e tipologias
    await recalculateMatchesForDevelopment(updated.id);

    return NextResponse.json({
      success: true,
      development: {
        ...updated,
        publicationStatus: resolvePublicationStatus(updated.status),
      },
    });
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

    const termsCheck = await assertUserAcceptedTerms(user);
    if (!termsCheck.allowed) {
      return termsCheck.errorResponse!;
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Apenas administradores podem alterar empreendimentos de construtoras.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.development.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Empreendimento não encontrado.' }, { status: 404 });
    }

    const nextStatus =
      body.status !== undefined || body.publicationStatus !== undefined
        ? normalizeDevelopmentStatusInput(body.status ?? existing.status, body.publicationStatus)
        : existing.status;

    const updated = await prisma.development.update({
      where: { id },
      data: {
        status: nextStatus,
        latitude: body.latitude !== undefined ? (body.latitude ? parseFloat(String(body.latitude)) : null) : existing.latitude,
        longitude: body.longitude !== undefined ? (body.longitude ? parseFloat(String(body.longitude)) : null) : existing.longitude,
      },
    });

    // Recalcula matches após alteração de status do empreendimento
    await recalculateMatchesForDevelopment(updated.id);

    return NextResponse.json({
      success: true,
      development: {
        ...updated,
        publicationStatus: resolvePublicationStatus(updated.status),
      },
    });
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

    const termsCheck = await assertUserAcceptedTerms(user);
    if (!termsCheck.allowed) {
      return termsCheck.errorResponse!;
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Apenas administradores podem excluir empreendimentos de construtoras.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existing = await prisma.development.findUnique({ where: { id } });

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
