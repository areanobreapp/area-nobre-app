import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { decideFacadeContribution } from '@/lib/building-facade-service';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { decision, notes } = body;

    if (!['APPROVE', 'REJECT'].includes(decision)) {
      return NextResponse.json(
        { error: 'Decisão inválida. Use APPROVE ou REJECT.' },
        { status: 400 }
      );
    }

    const result = await decideFacadeContribution({
      contributionId: id,
      adminId: user.id,
      decision,
      decisionNotes: notes,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao decidir contribuição de fotografia de fachada:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar decisão de fotografia.' },
      { status: 400 }
    );
  }
}

