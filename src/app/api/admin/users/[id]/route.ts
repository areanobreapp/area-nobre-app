import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: 'Acesso negado. Esta rota é restrita a administradores da Área Nobre.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { status, role } = body;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    // Regra de segurança: O administrador não pode se auto-desativar se for o único admin ativo
    if (admin.id === id && status === 'INACTIVE') {
      return NextResponse.json(
        { error: 'Você não pode desativar sua própria conta administrativa enquanto logado.' },
        { status: 400 }
      );
    }

    // Se estiver rebaixando para BROKER, garante que ainda resta outro ADMIN ativo
    if (admin.id === id && role === 'BROKER') {
      const otherAdmins = await prisma.user.count({
        where: {
          role: 'ADMIN',
          status: 'ACTIVE',
          id: { not: admin.id },
        },
      });
      if (otherAdmins === 0) {
        return NextResponse.json(
          { error: 'Não é possível remover seu papel de ADMIN pois você é o único administrador ativo do sistema.' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (status && (status === 'ACTIVE' || status === 'INACTIVE')) {
      updateData.status = status;
    }
    if (role && (role === 'BROKER' || role === 'ADMIN')) {
      updateData.role = role;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        profile: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Usuário atualizado com sucesso.',
      user: updated,
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário como admin:', error);
    return NextResponse.json({ error: 'Falha ao atualizar usuário.' }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: 'Acesso negado. Esta rota é restrita a administradores da Área Nobre.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        profile: true,
        properties: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            price: true,
            status: true,
            isPublic: true,
            publicId: true,
          },
        },
        searches: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            active: true,
            client: { select: { name: true } },
          },
        },
        _count: {
          select: {
            properties: true,
            searches: true,
            developments: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Erro ao buscar detalhes do usuário:', error);
    return NextResponse.json({ error: 'Falha ao buscar usuário.' }, { status: 500 });
  }
}
