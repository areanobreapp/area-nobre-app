import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { listCompanies } from '@/lib/company-service';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const city = searchParams.get('city') || undefined;
    const state = searchParams.get('state') || undefined;
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '15', 10)));

    // Usuários em geral e corretores só veem construtoras ATIVAS para vínculos
    const result = await listCompanies(
      {
        search,
        status: 'ACTIVE',
        city,
        state,
        limit,
      },
      user.role
    );

    return NextResponse.json(
      {
        success: true,
        companies: result.companies.map((c) => ({
          id: c.id,
          name: c.name,
          tradeName: c.tradeName,
          cnpj: c.cnpj,
          city: c.city,
          state: c.state,
          status: c.status,
          logoUrl: c.logoUrl,
        })),
        total: result.total,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Erro ao listar construtoras para seleção:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao consultar construtoras.' },
      { status: 500 }
    );
  }
}

