import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { decideLocationContribution } from '@/lib/building-location-service';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { decision, manualCoordinates, notes } = body;

    if (!['APPROVE', 'REJECT', 'MANUAL_OVERRIDE'].includes(decision)) {
      return NextResponse.json(
        { error: 'Decisão inválida. Use APPROVE, REJECT ou MANUAL_OVERRIDE.' },
        { status: 400 }
      );
    }

    const result = await decideLocationContribution({
      contributionId: id,
      adminId: user.id,
      decision,
      manualCoordinates,
      decisionNotes: notes,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao decidir contribuição de localização:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar decisão.' },
      { status: 400 }
    );
  }
}

