import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateUniquePublicId, getPublicPropertyUrl } from '@/lib/public-sharing';
import { toPublicPropertyDTO } from '@/lib/public-property-dto';
import { canPropertyBePubliclyExposed, assertUserAcceptedTerms } from '@/lib/legal/service';

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

    if (user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Corretor inativo na plataforma.' }, { status: 403 });
    }

    const { id } = await params;
    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
        },
        user: {
          include: { profile: true },
        },
        responsibleBroker: {
          include: { profile: true },
        },
      },
    });

    if (!property) {
      return NextResponse.json({ error: 'Imóvel não encontrado.' }, { status: 404 });
    }

    const isOwner =
      user.role === 'ADMIN' ||
      property.userId === user.id ||
      property.responsibleBrokerId === user.id;

    const publicDTO = toPublicPropertyDTO(property, 'PROPERTY');

    // =========================================================================
    // Fluxo do Corretor Responsável / Proprietário / Admin
    // =========================================================================
    if (isOwner) {
      return NextResponse.json({
        isOwner: true,
        canShare: true,
        isPublic: property.isPublic,
        publicId: property.publicId,
        publicUrl: property.publicId ? getPublicPropertyUrl(property.publicId) : null,
        publicLocationPrecision: property.publicLocationPrecision || 'APPROXIMATE',
        publishedAt: property.publishedAt,
        publicDTO,
      });
    }

    // =========================================================================
    // Fluxo do Corretor Parceiro (Rede de Colaboração)
    // =========================================================================
    const ownerStatus = property.responsibleBroker?.status || property.user?.status;
    if (ownerStatus !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Imóvel indisponível para compartilhamento (corretor responsável inativo).' },
        { status: 403 }
      );
    }

    if (!property.isPublic) {
      return NextResponse.json(
        { error: 'Este imóvel não foi disponibilizado para compartilhamento na rede.' },
        { status: 403 }
      );
    }

    if (property.status !== 'Disponível') {
      return NextResponse.json(
        { error: 'Este imóvel não está comercialmente disponível para compartilhamento no momento.' },
        { status: 403 }
      );
    }

    const exposureCheck = await canPropertyBePubliclyExposed(property.id);
    if (!exposureCheck.allowed) {
      return NextResponse.json(
        { error: 'Imóvel indisponível para compartilhamento (autorização de divulgação suspensa ou ausente).' },
        { status: 403 }
      );
    }

    const share = await prisma.propertyShare.findUnique({
      where: {
        propertyId_brokerId: {
          propertyId: property.id,
          brokerId: user.id,
        },
      },
    });

    const partnerUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { profile: true },
    });
    const partnerOverride = partnerUser
      ? {
          name: partnerUser.name,
          email: partnerUser.email,
          ...(partnerUser.profile || {}),
        }
      : null;
    const partnerDTO = toPublicPropertyDTO(property, 'PROPERTY', partnerOverride);

    return NextResponse.json({
      isOwner: false,
      canShare: true,
      isPublic: property.isPublic,
      shareId: share?.id || null,
      publicId: share?.publicId || null,
      publicUrl: share?.publicId ? getPublicPropertyUrl(share.publicId) : null,
      isActive: share?.isActive ?? false,
      sharedAt: share?.createdAt || null,
      publicLocationPrecision: property.publicLocationPrecision || 'APPROXIMATE',
      publicDTO: partnerDTO,
    });
  } catch (err: any) {
    console.error('Erro ao consultar compartilhamento do imóvel:', err);
    return NextResponse.json({ error: 'Erro interno ao consultar compartilhamento.' }, { status: 500 });
  }
}

export async function POST(
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

    if (user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Corretor inativo na plataforma.' }, { status: 403 });
    }

    const { id } = await params;
    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
        },
        user: {
          include: { profile: true },
        },
        responsibleBroker: {
          include: { profile: true },
        },
      },
    });

    if (!property) {
      return NextResponse.json({ error: 'Imóvel não encontrado.' }, { status: 404 });
    }

    const isOwner =
      user.role === 'ADMIN' ||
      property.userId === user.id ||
      property.responsibleBrokerId === user.id;

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'publish';

    // =========================================================================
    // Fluxo do Corretor Responsável / Proprietário / Admin
    // =========================================================================
    if (isOwner) {
      if (action === 'publish') {
        const exposureCheck = await canPropertyBePubliclyExposed(property.id);
        if (!exposureCheck.allowed) {
          return NextResponse.json(
            {
              error: exposureCheck.reason || 'Este imóvel não pode ser publicado sem confirmação válida de autorização do proprietário.',
              authorizationRequired: true,
            },
            { status: 400 }
          );
        }

        let publicId = property.publicId;
        if (!publicId) {
          publicId = await generateUniquePublicId(prisma);
        }

        const validPrecisions = ['HIDDEN', 'APPROXIMATE', 'EXACT'];
        const precision = validPrecisions.includes(body.precision)
          ? body.precision
          : property.publicLocationPrecision || 'APPROXIMATE';

        const updated = await prisma.property.update({
          where: { id: property.id },
          data: {
            isPublic: true,
            publicId,
            publishedAt: property.publishedAt || new Date(),
            publicLocationPrecision: precision,
          },
          include: {
            images: {
              orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
            },
            user: {
              include: { profile: true },
            },
            responsibleBroker: {
              include: { profile: true },
            },
          },
        });

        return NextResponse.json({
          isOwner: true,
          isPublic: true,
          publicId: updated.publicId,
          publicUrl: getPublicPropertyUrl(updated.publicId!),
          publicLocationPrecision: updated.publicLocationPrecision,
          publishedAt: updated.publishedAt,
          publicDTO: toPublicPropertyDTO(updated, 'PROPERTY'),
          message: 'Imóvel publicado com sucesso para apresentação compartilhável.',
        });
      }

      if (action === 'revoke') {
        const updated = await prisma.property.update({
          where: { id: property.id },
          data: {
            isPublic: false,
          },
          include: {
            images: {
              orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
            },
            user: {
              include: { profile: true },
            },
            responsibleBroker: {
              include: { profile: true },
            },
          },
        });

        return NextResponse.json({
          isOwner: true,
          isPublic: false,
          publicId: updated.publicId,
          publicLocationPrecision: updated.publicLocationPrecision,
          publicDTO: toPublicPropertyDTO(updated, 'PROPERTY'),
          message: 'Link de apresentação desativado com sucesso.',
        });
      }

      if (action === 'update_precision') {
        const validPrecisions = ['HIDDEN', 'APPROXIMATE', 'EXACT'];
        if (!validPrecisions.includes(body.precision)) {
          return NextResponse.json({ error: 'Precisão de localização inválida.' }, { status: 400 });
        }

        const updated = await prisma.property.update({
          where: { id: property.id },
          data: {
            publicLocationPrecision: body.precision,
          },
          include: {
            images: {
              orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
            },
            user: {
              include: { profile: true },
            },
            responsibleBroker: {
              include: { profile: true },
            },
          },
        });

        return NextResponse.json({
          isOwner: true,
          success: true,
          publicLocationPrecision: updated.publicLocationPrecision,
          publicDTO: toPublicPropertyDTO(updated, 'PROPERTY'),
        });
      }

      return NextResponse.json({ error: 'Ação não reconhecida.' }, { status: 400 });
    }

    // =========================================================================
    // Fluxo do Corretor Parceiro (Rede de Colaboração)
    // =========================================================================
    // Bloqueia alteração da precisão da localização por corretores parceiros
    if (action === 'update_precision') {
      return NextResponse.json(
        { error: 'Apenas o corretor responsável pelo imóvel pode alterar a precisão de localização.' },
        { status: 403 }
      );
    }

    // Valida elegibilidade do imóvel para compartilhamento na rede
    const ownerStatus = property.responsibleBroker?.status || property.user?.status;
    if (ownerStatus !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Imóvel indisponível para compartilhamento (corretor responsável inativo).' },
        { status: 403 }
      );
    }

    if (!property.isPublic) {
      return NextResponse.json(
        { error: 'Este imóvel não foi disponibilizado para compartilhamento na rede.' },
        { status: 403 }
      );
    }

    if (property.status !== 'Disponível') {
      return NextResponse.json(
        { error: 'Este imóvel não está comercialmente disponível para compartilhamento no momento.' },
        { status: 403 }
      );
    }

    const exposureCheck = await canPropertyBePubliclyExposed(property.id);
    if (!exposureCheck.allowed) {
      return NextResponse.json(
        { error: 'Imóvel indisponível para compartilhamento (autorização de divulgação suspensa ou ausente).' },
        { status: 403 }
      );
    }

    const existingShare = await prisma.propertyShare.findUnique({
      where: {
        propertyId_brokerId: {
          propertyId: property.id,
          brokerId: user.id,
        },
      },
    });

    const partnerUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { profile: true },
    });
    const partnerOverride = partnerUser
      ? {
          name: partnerUser.name,
          email: partnerUser.email,
          ...(partnerUser.profile || {}),
        }
      : null;
    const partnerDTO = toPublicPropertyDTO(property, 'PROPERTY', partnerOverride);

    if (action === 'revoke') {
      if (!existingShare) {
        return NextResponse.json({
          isOwner: false,
          isPublic: property.isPublic,
          isActive: false,
          message: 'Nenhum compartilhamento individual encontrado para este corretor.',
        });
      }

      const updatedShare = await prisma.propertyShare.update({
        where: { id: existingShare.id },
        data: { isActive: false },
      });

      return NextResponse.json({
        isOwner: false,
        isPublic: property.isPublic,
        shareId: updatedShare.id,
        publicId: updatedShare.publicId,
        publicUrl: getPublicPropertyUrl(updatedShare.publicId),
        isActive: false,
        publicLocationPrecision: property.publicLocationPrecision || 'APPROXIMATE',
        publicDTO: partnerDTO,
        message: 'Seu link individual de apresentação foi desativado com sucesso.',
      });
    }

    if (action === 'publish' || action === 'share') {
      if (existingShare) {
        // Se já está ativo, retorna idempotente sem alterar publicId
        if (existingShare.isActive) {
          return NextResponse.json({
            isOwner: false,
            isPublic: property.isPublic,
            shareId: existingShare.id,
            publicId: existingShare.publicId,
            publicUrl: getPublicPropertyUrl(existingShare.publicId),
            isActive: true,
            publicLocationPrecision: property.publicLocationPrecision || 'APPROXIMATE',
            publicDTO: partnerDTO,
            message: 'Link individual de compartilhamento já está ativo.',
          });
        }

        // Se estava inativo, exige confirmação explícita de reativação
        if (!body.reactivate) {
          return NextResponse.json(
            {
              error: 'Este link individual foi desativado anteriormente. Envie action: "reactivate" ou reactivate: true para reativá-lo.',
              canReactivate: true,
              shareId: existingShare.id,
              publicId: existingShare.publicId,
            },
            { status: 409 }
          );
        }

        // Reativação autorizada via reactivate: true
        const reactivatedShare = await prisma.propertyShare.update({
          where: { id: existingShare.id },
          data: {
            isActive: true,
            ...(body.clientId ? { clientId: body.clientId } : {}),
          },
        });

        return NextResponse.json({
          isOwner: false,
          isPublic: property.isPublic,
          shareId: reactivatedShare.id,
          publicId: reactivatedShare.publicId,
          publicUrl: getPublicPropertyUrl(reactivatedShare.publicId),
          isActive: true,
          publicLocationPrecision: property.publicLocationPrecision || 'APPROXIMATE',
          publicDTO: partnerDTO,
          message: 'Link individual de apresentação reativado com sucesso.',
        });
      }

      // Criação de novo compartilhamento individual para o corretor parceiro
      const publicId = await generateUniquePublicId(prisma);
      const newShare = await prisma.propertyShare.create({
        data: {
          propertyId: property.id,
          brokerId: user.id,
          publicId,
          isActive: true,
          clientId: body.clientId || null,
        },
      });

      return NextResponse.json({
        isOwner: false,
        isPublic: property.isPublic,
        shareId: newShare.id,
        publicId: newShare.publicId,
        publicUrl: getPublicPropertyUrl(newShare.publicId),
        isActive: true,
        publicLocationPrecision: property.publicLocationPrecision || 'APPROXIMATE',
        publicDTO: partnerDTO,
        message: 'Link individual de apresentação gerado com sucesso.',
      });
    }

    if (action === 'reactivate') {
      if (!existingShare) {
        // Se ainda não existia, cria novo normalmente
        const publicId = await generateUniquePublicId(prisma);
        const newShare = await prisma.propertyShare.create({
          data: {
            propertyId: property.id,
            brokerId: user.id,
            publicId,
            isActive: true,
            clientId: body.clientId || null,
          },
        });

        return NextResponse.json({
          isOwner: false,
          isPublic: property.isPublic,
          shareId: newShare.id,
          publicId: newShare.publicId,
          publicUrl: getPublicPropertyUrl(newShare.publicId),
          isActive: true,
          publicLocationPrecision: property.publicLocationPrecision || 'APPROXIMATE',
          publicDTO: toPublicPropertyDTO(property, 'PROPERTY'),
          message: 'Link individual de apresentação gerado com sucesso.',
        });
      }

      const reactivatedShare = await prisma.propertyShare.update({
        where: { id: existingShare.id },
        data: {
          isActive: true,
          ...(body.clientId ? { clientId: body.clientId } : {}),
        },
      });

      return NextResponse.json({
        isOwner: false,
        isPublic: property.isPublic,
        shareId: reactivatedShare.id,
        publicId: reactivatedShare.publicId,
        publicUrl: getPublicPropertyUrl(reactivatedShare.publicId),
        isActive: true,
        publicLocationPrecision: property.publicLocationPrecision || 'APPROXIMATE',
        publicDTO: partnerDTO,
        message: 'Link individual de apresentação reativado com sucesso.',
      });
    }

    return NextResponse.json({ error: 'Ação não reconhecida.' }, { status: 400 });
  } catch (err: any) {
    console.error('Erro ao atualizar compartilhamento do imóvel:', err);
    return NextResponse.json({ error: 'Erro interno ao processar compartilhamento.' }, { status: 500 });
  }
}
