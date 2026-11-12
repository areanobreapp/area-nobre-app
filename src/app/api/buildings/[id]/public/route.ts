import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getPublicBuildingById } from '@/lib/building-public-service';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Identificador do edifício inválido.' }, { status: 400 });
    }

    // Identifica opcionalmente se o visitante é um corretor autenticado (para indicar isMine)
    const user = await getCurrentUser(req);

    const building = await getPublicBuildingById(id, {
      currentUserId: user?.id || null,
    });

    if (!building) {
      return NextResponse.json({ error: 'Edifício não encontrado ou inativo.' }, { status: 404 });
    }

    return NextResponse.json(
      { building },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('Erro na consulta pública do edifício:', error);
    return NextResponse.json(
      { error: 'Falha interna ao consultar dados públicos do edifício.' },
      { status: 500 }
    );
  }
}

