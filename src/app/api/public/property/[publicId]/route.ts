import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { toPublicPropertyDTO } from '@/lib/public-property-dto';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ publicId: string }> }
) {
  try {
    const { publicId } = await context.params;

    if (!publicId || typeof publicId !== 'string') {
      return NextResponse.json(
        { isAvailable: false, error: 'Identificador inválido.' },
        { status: 400, headers: { 'X-Robots-Tag': 'noindex, nofollow' } }
      );
    }

    // 1. Tenta encontrar como Property isolado
    const property = await prisma.property.findUnique({
      where: { publicId },
      include: {
        images: {
          orderBy: [{ isCover: 'desc' }, { order: 'asc' }],
        },
      },
    });

    if (property) {
      if (!property.isPublic) {
        return NextResponse.json(
          {
            isAvailable: false,
            message: 'Este imóvel não está mais disponível para visualização.',
          },
          { status: 200, headers: { 'X-Robots-Tag': 'noindex, nofollow' } }
        );
      }

      const dto = toPublicPropertyDTO(property, 'PROPERTY');
      return NextResponse.json(
        { isAvailable: true, property: dto },
        {
          headers: {
            'X-Robots-Tag': 'noindex, nofollow',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    // 2. Tenta encontrar como Typology de Empreendimento
    const typology = await prisma.typology.findUnique({
      where: { publicId },
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

    if (typology) {
      if (!typology.isPublic) {
        return NextResponse.json(
          {
            isAvailable: false,
            message: 'Este imóvel não está mais disponível para visualização.',
          },
          { status: 200, headers: { 'X-Robots-Tag': 'noindex, nofollow' } }
        );
      }

      const dto = toPublicPropertyDTO(typology, 'TYPOLOGY');
      return NextResponse.json(
        { isAvailable: true, property: dto },
        {
          headers: {
            'X-Robots-Tag': 'noindex, nofollow',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      );
    }

    // Não encontrado em nenhuma tabela
    return NextResponse.json(
      {
        isAvailable: false,
        message: 'Este imóvel não está mais disponível para visualização.',
      },
      { status: 404, headers: { 'X-Robots-Tag': 'noindex, nofollow' } }
    );
  } catch (err: any) {
    console.error('Erro na consulta pública do imóvel:', err);
    return NextResponse.json(
      { isAvailable: false, error: 'Erro interno ao consultar o anúncio.' },
      { status: 500, headers: { 'X-Robots-Tag': 'noindex, nofollow' } }
    );
  }
}
