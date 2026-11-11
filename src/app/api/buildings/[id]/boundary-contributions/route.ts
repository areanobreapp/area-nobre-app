import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { processBoundaryContribution } from '@/lib/building-boundary-service';
import { prisma } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id: buildingId } = await params;
    const body = await req.json();
    const boundary = body.boundary || body.boundaryGeoJson;
    const boundaryArea = body.boundaryArea ?? body.approximateAreaM2;
    const isRevisionProposal = body.isRevisionProposal !== undefined
      ? Boolean(body.isRevisionProposal)
      : body.contributionType === 'PROPOSED_REVISION';
    const justification = body.justification;

    if (!boundary || typeof boundary !== 'string') {
      return NextResponse.json({ error: 'Polígono de delimitação do terreno é obrigatório.' }, { status: 400 });
    }

    const result = await processBoundaryContribution({
      buildingId,
      brokerId: user.id,
      boundary,
      boundaryArea: boundaryArea ? parseFloat(String(boundaryArea)) : null,
      isRevisionProposal,
      justification: justification ? String(justification).trim() : null,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Erro ao processar contribuição de terreno:', error);
    return NextResponse.json({ error: error?.message || 'Falha ao processar delimitação do terreno.' }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { id: buildingId } = await params;
    try {
      const contributions = await (prisma as any).buildingBoundaryContribution.findMany({
        where: { buildingId },
        orderBy: { createdAt: 'desc' },
        include: {
          broker: { select: { id: true, name: true, email: true } },
        },
      });
      return NextResponse.json({ contributions });
    } catch {
      // Se a tabela ainda não estiver criada no banco físico
      return NextResponse.json({ contributions: [] });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Falha ao buscar histórico.' }, { status: 500 });
  }
}
