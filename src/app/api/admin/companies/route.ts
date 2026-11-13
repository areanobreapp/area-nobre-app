import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createCompany, listCompanies } from '@/lib/company-service';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const city = searchParams.get('city') || undefined;
    const state = searchParams.get('state') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await listCompanies({ search, status, city, state, page, limit }, user.role);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao listar construtoras:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao consultar construtoras.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores.' }, { status: 403 });
    }

    const body = await req.json();
    const company = await createCompany(body, user.id);
    return NextResponse.json({ success: true, company }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao cadastrar construtora:', error);
    const status = error.code === 'CONFLICT' ? 409 : 400;
    return NextResponse.json(
      { error: error.message || 'Erro ao processar cadastro de construtora.' },
      { status }
    );
  }
}

