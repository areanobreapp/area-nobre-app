import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generatePublicId, getPublicPropertyUrl } from '@/lib/public-sharing';
import { toPublicPropertyDTO } from '@/lib/public-property-dto';

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
    const property = await prisma.property.findFirst({
      where: {
        id,
        ...(user.role === 'ADMIN' ? {} : {
          OR: [{ userId: user.id }, { responsibleBrokerId: user.id }],
        }),
      },
      include: {
        images: {
          orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
        },
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: 'Imóvel não encontrado ou você não tem permissão para gerenciar seu compartilhamento.' },
        { status: 403 }
      );
    }

    const publicDTO = toPublicPropertyDTO(property, 'PROPERTY');

    return NextResponse.json({
      isPublic: property.isPublic,
      publicId: property.publicId,
      publicUrl: property.publicId ? getPublicPropertyUrl(property.publicId) : null,
      publicLocationPrecision: property.publicLocationPrecision || 'APPROXIMATE',
      publishedAt: property.publishedAt,
      publicDTO,
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

    const { id } = await params;
    const property = await prisma.property.findFirst({
      where: {
        id,
        ...(user.role === 'ADMIN' ? {} : {
          OR: [{ userId: user.id }, { responsibleBrokerId: user.id }],
        }),
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: 'Imóvel não encontrado ou você não tem permissão para gerenciar seu compartilhamento.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'publish';

    if (action === 'publish') {
      let publicId = property.publicId;
      if (!publicId) {
        // Gera um identificador único seguro
        let unique = false;
        while (!unique) {
          publicId = generatePublicId();
          const existing = await prisma.property.findUnique({ where: { publicId } });
          const existingTypo = await prisma.typology.findUnique({ where: { publicId } });
          if (!existing && !existingTypo) unique = true;
        }
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
        },
      });

      return NextResponse.json({
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
        },
      });

      return NextResponse.json({
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
        },
      });

      return NextResponse.json({
        success: true,
        publicLocationPrecision: updated.publicLocationPrecision,
        publicDTO: toPublicPropertyDTO(updated, 'PROPERTY'),
      });
    }

    return NextResponse.json({ error: 'Ação não reconhecida.' }, { status: 400 });
  } catch (err: any) {
    console.error('Erro ao atualizar compartilhamento do imóvel:', err);
    return NextResponse.json({ error: 'Erro interno ao processar compartilhamento.' }, { status: 500 });
  }
}
