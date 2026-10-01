import { NextRequest, NextResponse } from 'next/server';
import { getGeoProvider, GeoBaseProvider } from '@/lib/geo';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { address, limit = 5, components } = body;

    if (!address || typeof address !== 'string' || !address.trim()) {
      return NextResponse.json(
        { error: 'Endereço é obrigatório para geocodificação.' },
        { status: 400 }
      );
    }

    const provider = getGeoProvider();
    const results = await provider.forwardGeocode(address.trim(), {
      limit: Number(limit),
      components: typeof components === 'object' && components !== null ? components : undefined,
    });

    const geobase = new GeoBaseProvider();
    const hasLiveGeoBaseKey = geobase.hasApiKey();

    return NextResponse.json({
      success: true,
      query: address.trim(),
      results,
      meta: {
        hasLiveGeoBaseKey,
        provider: results[0]?.source === 'geobase' ? 'GeoBase Mapas' : 'Fallback (Nominatim/Território)',
      },
    });
  } catch (error: any) {
    console.error('Erro na rota /api/geo/geocode:', error);
    return NextResponse.json(
      {
        error: 'Não foi possível geolocalizar o endereço no momento.',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
