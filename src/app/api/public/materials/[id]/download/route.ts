import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createMaterialStreamResponse } from '@/lib/material-storage';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const material = await prisma.commercialMaterial.findUnique({
      where: { id },
      include: {
        development: { select: { id: true, name: true, status: true } },
      },
    });

    if (!material) {
      return NextResponse.json({ error: 'Material comercial não encontrado.' }, { status: 404 });
    }

    // Validação estrita: somente materiais PÚBLICOS podem ser baixados sem autenticação
    if (material.visibility !== 'PUBLIC') {
      return NextResponse.json(
        { error: 'Este material não possui autorização para acesso público. Autenticação exigida.' },
        { status: 403 }
      );
    }

    if (!material.allowBrokerShare || !material.allowDownload) {
      return NextResponse.json(
        { error: 'O compartilhamento ou download deste material não foi autorizado.' },
        { status: 403 }
      );
    }

    if (material.development?.status === 'Inativo') {
      return NextResponse.json(
        { error: 'Empreendimento inativo ou não disponível.' },
        { status: 403 }
      );
    }

    return await createMaterialStreamResponse(material, 'attachment');
  } catch (err: any) {
    console.error('[API Public Material Download Error]:', err);
    return NextResponse.json({ error: 'Erro ao acessar material público.' }, { status: 500 });
  }
}
