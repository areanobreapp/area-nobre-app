import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { processFacadeContribution } from '@/lib/building-facade-service';
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
    const imageUrl = body.imageUrl;
    const isSubstitutionProposal = body.isSubstitutionProposal !== undefined
      ? Boolean(body.isSubstitutionProposal)
      : body.contributionType === 'PROPOSED_SUBSTITUTION';
    const justification = body.justification;

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json({ error: 'URL da fotografia da fachada é obrigatória.' }, { status: 400 });
    }

    const result = await processFacadeContribution({
      buildingId,
      brokerId: user.id,
      imageUrl: imageUrl.trim(),
      isSubstitutionProposal,
      justification: justification ? String(justification).trim() : null,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Erro ao processar contribuição de fachada:', error);
    return NextResponse.json({ error: error?.message || 'Falha ao processar fotografia da fachada.' }, { status: 500 });
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
      const contributions = await (prisma as any).buildingImageContribution.findMany({
        where: { buildingId },
        orderBy: { createdAt: 'desc' },
        include: {
          broker: { select: { id: true, name: true, email: true } },
        },
      });
      return NextResponse.json({ contributions });
    } catch {
      return NextResponse.json({ contributions: [] });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Falha ao buscar histórico de fachadas.' }, { status: 500 });
  }
}
