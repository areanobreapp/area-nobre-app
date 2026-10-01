import { NextRequest, NextResponse } from 'next/server';
import { getGeoProvider } from '@/lib/geo';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cep: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { cep } = await params;
    const cleanCep = (cep || '').replace(/\D/g, '');

    if (cleanCep.length !== 8) {
      return NextResponse.json(
        { error: 'CEP inválido. Deve conter 8 dígitos.' },
        { status: 400 }
      );
    }

    const provider = getGeoProvider();
    const result = await provider.lookupCep?.(cleanCep);

    if (!result) {
      return NextResponse.json(
        { error: 'CEP não encontrado.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Erro na rota /api/geo/cep:', error);
    return NextResponse.json(
      { error: 'Falha ao consultar o CEP.' },
      { status: 500 }
    );
  }
}
