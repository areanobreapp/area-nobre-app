import { NextRequest, NextResponse } from 'next/server';
import { getGeoProvider } from '@/lib/geo';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { lat, lng } = body;

    if (lat === undefined || lng === undefined || isNaN(Number(lat)) || isNaN(Number(lng))) {
      return NextResponse.json(
        { error: 'Latitude e Longitude válidas são obrigatórias.' },
        { status: 400 }
      );
    }

    const provider = getGeoProvider();
    const result = await provider.reverseGeocode(Number(lat), Number(lng));

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('Erro na rota /api/geo/reverse:', error);
    return NextResponse.json(
      {
        error: 'Não foi possível obter o endereço para as coordenadas informadas.',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
