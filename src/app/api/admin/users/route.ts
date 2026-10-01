import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: 'Acesso negado. Esta rota é restrita a administradores da Área Nobre.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const role = searchParams.get('role');
    const status = searchParams.get('status');

    const where: any = {};

    if (role && role !== 'Todos') {
      where.role = role;
    }

    if (status && status !== 'Todos') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { profile: { commercialName: { contains: search } } },
        { profile: { creci: { contains: search } } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        profile: true,
        _count: {
          select: {
            properties: true,
            searches: true,
            developments: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      users,
      total: users.length,
    });
  } catch (error) {
    console.error('Erro na listagem administrativa de usuários:', error);
    return NextResponse.json({ error: 'Falha ao buscar usuários.' }, { status: 500 });
  }
}
