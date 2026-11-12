import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createDevelopment, listDevelopments } from '@/lib/development-service';

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
    const companyId = searchParams.get('companyId') || undefined;
    const stage = searchParams.get('stage') || undefined;
    const status = searchParams.get('status') || undefined;
    const city = searchParams.get('city') || undefined;
    const projectType = searchParams.get('projectType') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await listDevelopments(
      { search, companyId, stage, status, city, projectType, page, limit },
      user.role
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao listar empreendimentos:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno ao consultar empreendimentos.' },
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
    const development = await createDevelopment(body, user.id);
    return NextResponse.json({ success: true, development }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao cadastrar empreendimento:', error);
    const status = error.code === 'NOT_FOUND' ? 404 : 400;
    return NextResponse.json(
      { error: error.message || 'Erro ao processar cadastro de empreendimento.' },
      { status }
    );
  }
}

