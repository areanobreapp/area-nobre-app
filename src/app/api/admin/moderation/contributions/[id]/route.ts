import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getContributionDetails, ModerationItemType } from '@/lib/building-moderation-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get('type') || 'LOCATION').toUpperCase() as ModerationItemType;

    if (!['LOCATION', 'BOUNDARY', 'FACADE'].includes(type)) {
      return NextResponse.json(
        { error: 'Parâmetro type inválido. Utilize LOCATION, BOUNDARY ou FACADE.' },
        { status: 400 }
      );
    }

    const details = await getContributionDetails(type, id);
    if (!details) {
      return NextResponse.json({ error: 'Contribuição não encontrada.' }, { status: 404 });
    }

    return NextResponse.json(details, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao consultar detalhe de contribuição:', error);
    return NextResponse.json(
      { error: 'Erro interno ao consultar detalhe da contribuição.' },
      { status: 500 }
    );
  }
}

