import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCompanyById } from '@/lib/company-service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { id } = await context.params;
    const company = await getCompanyById(id, user.role);
    if (!company) {
      return NextResponse.json({ error: 'Construtora não encontrada.' }, { status: 404 });
    }

    // Se o usuário não for ADMIN e a construtora estiver inativa, não exibe
    if (user.role !== 'ADMIN' && company.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Construtora indisponível.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, company }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao consultar construtora por ID:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao consultar construtora.' },
      { status: 500 }
    );
  }
}

