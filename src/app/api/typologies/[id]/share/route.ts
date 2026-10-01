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
    const typology = await prisma.typology.findFirst({
      where: {
        id,
        development: {
          ...(user.role === 'ADMIN' ? {} : {
            OR: [{ userId: user.id }, { responsibleBrokerId: user.id }],
          }),
        },
      },
      include: {
        development: {
          include: {
            images: {
              orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
            },
          },
        },
      },
    });

    if (!typology) {
      return NextResponse.json({ error: 'Tipologia não encontrada.' }, { status: 404 });
    }

    const publicDTO = toPublicPropertyDTO(typology, 'TYPOLOGY');

    return NextResponse.json({
      isPublic: typology.isPublic,
      publicId: typology.publicId,
      publicUrl: typology.publicId ? getPublicPropertyUrl(typology.publicId) : null,
      publicLocationPrecision: typology.publicLocationPrecision || 'APPROXIMATE',
      publishedAt: typology.publishedAt,
      publicDTO,
    });
  } catch (err: any) {
    console.error('Erro ao consultar compartilhamento da tipologia:', err);
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
    const typology = await prisma.typology.findFirst({
      where: {
        id,
        development: {
          ...(user.role === 'ADMIN' ? {} : {
            OR: [{ userId: user.id }, { responsibleBrokerId: user.id }],
          }),
        },
      },
    });

    if (!typology) {
      return NextResponse.json({ error: 'Tipologia não encontrada.' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'publish';

    if (action === 'publish') {
      let publicId = typology.publicId;
      if (!publicId) {
        let unique = false;
        while (!unique) {
          publicId = generatePublicId();
          const existingProp = await prisma.property.findUnique({ where: { publicId } });
          const existingTypo = await prisma.typology.findUnique({ where: { publicId } });
          if (!existingProp && !existingTypo) unique = true;
        }
      }

      const validPrecisions = ['HIDDEN', 'APPROXIMATE', 'EXACT'];
      const precision = validPrecisions.includes(body.precision)
        ? body.precision
        : typology.publicLocationPrecision || 'APPROXIMATE';

      const updated = await prisma.typology.update({
        where: { id: typology.id },
        data: {
          isPublic: true,
          publicId,
          publishedAt: typology.publishedAt || new Date(),
          publicLocationPrecision: precision,
        },
        include: {
          development: {
            include: {
              images: {
                orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
              },
            },
          },
        },
      });

      return NextResponse.json({
        isPublic: true,
        publicId: updated.publicId,
        publicUrl: getPublicPropertyUrl(updated.publicId!),
        publicLocationPrecision: updated.publicLocationPrecision,
        publishedAt: updated.publishedAt,
        publicDTO: toPublicPropertyDTO(updated, 'TYPOLOGY'),
        message: 'Tipologia publicada com sucesso para apresentação compartilhável.',
      });
    }

    if (action === 'revoke') {
      const updated = await prisma.typology.update({
        where: { id: typology.id },
        data: {
          isPublic: false,
        },
        include: {
          development: {
            include: {
              images: {
                orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
              },
            },
          },
        },
      });

      return NextResponse.json({
        isPublic: false,
        publicId: updated.publicId,
        publicLocationPrecision: updated.publicLocationPrecision,
        publicDTO: toPublicPropertyDTO(updated, 'TYPOLOGY'),
        message: 'Link de apresentação desativado com sucesso.',
      });
    }

    if (action === 'update_precision') {
      const validPrecisions = ['HIDDEN', 'APPROXIMATE', 'EXACT'];
      if (!validPrecisions.includes(body.precision)) {
        return NextResponse.json({ error: 'Precisão de localização inválida.' }, { status: 400 });
      }

      const updated = await prisma.typology.update({
        where: { id: typology.id },
        data: {
          publicLocationPrecision: body.precision,
        },
        include: {
          development: {
            include: {
              images: {
                orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
              },
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        publicLocationPrecision: updated.publicLocationPrecision,
        publicDTO: toPublicPropertyDTO(updated, 'TYPOLOGY'),
      });
    }

    return NextResponse.json({ error: 'Ação não reconhecida.' }, { status: 400 });
  } catch (err: any) {
    console.error('Erro ao atualizar compartilhamento da tipologia:', err);
    return NextResponse.json({ error: 'Erro interno ao processar compartilhamento.' }, { status: 500 });
  }
}
