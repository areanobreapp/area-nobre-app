import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, hashPassword, comparePassword } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        profile: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: fullUser,
    });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return NextResponse.json({ error: 'Falha ao buscar perfil.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      // Dados da Conta
      name,
      email,
      currentPassword,
      newPassword,

      // Identidade Profissional
      commercialName,
      phone,
      creci,
      tagline,
      bio,
      city,
      avatarUrl,
      logoUrl,
    } = body;

    const userUpdateData: any = {};

    // 1. Atualização do Nome Pessoal
    if (name && typeof name === 'string' && name.trim().length >= 3) {
      userUpdateData.name = name.trim();
    }

    // 2. Atualização de E-mail (com verificação de unicidade)
    if (email && typeof email === 'string') {
      const cleanEmail = email.toLowerCase().trim();
      if (cleanEmail !== user.email) {
        const existing = await prisma.user.findUnique({
          where: { email: cleanEmail },
        });
        if (existing) {
          return NextResponse.json(
            { error: 'Este e-mail já está sendo utilizado por outra conta.' },
            { status: 409 }
          );
        }
        userUpdateData.email = cleanEmail;
      }
    }

    // 3. Atualização de Senha
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Para alterar a senha, informe sua senha atual.' },
          { status: 400 }
        );
      }

      const currentUserInDb = await prisma.user.findUnique({
        where: { id: user.id },
      });

      if (!currentUserInDb) {
        return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
      }

      const isCurrentValid = await comparePassword(currentPassword, currentUserInDb.passwordHash);
      if (!isCurrentValid) {
        return NextResponse.json(
          { error: 'A senha atual informada está incorreta.' },
          { status: 400 }
        );
      }

      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return NextResponse.json(
          { error: 'A nova senha deve ter no mínimo 6 caracteres.' },
          { status: 400 }
        );
      }

      userUpdateData.passwordHash = await hashPassword(newPassword);
    }

    // Atualiza dados da conta se houver mudanças
    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: userUpdateData,
      });
    }

    // 4. Atualização da Identidade Profissional (BrokerProfile)
    const profile = await prisma.brokerProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        commercialName: commercialName?.trim() || null,
        phone: phone?.trim() || null,
        creci: creci?.trim() || null,
        tagline: tagline?.trim() || null,
        bio: bio?.trim() || null,
        city: city?.trim() || 'Criciúma - SC',
        avatarUrl: avatarUrl || null,
        logoUrl: logoUrl || null,
      },
      update: {
        commercialName: commercialName !== undefined ? (commercialName?.trim() || null) : undefined,
        phone: phone !== undefined ? (phone?.trim() || null) : undefined,
        creci: creci !== undefined ? (creci?.trim() || null) : undefined,
        tagline: tagline !== undefined ? (tagline?.trim() || null) : undefined,
        bio: bio !== undefined ? (bio?.trim() || null) : undefined,
        city: city !== undefined ? (city?.trim() || null) : undefined,
        avatarUrl: avatarUrl !== undefined ? (avatarUrl || null) : undefined,
        logoUrl: logoUrl !== undefined ? (logoUrl || null) : undefined,
      },
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        profile: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Perfil atualizado com sucesso.',
      user: updatedUser,
      profile,
    });
  } catch (error) {
    console.error('Erro ao salvar perfil:', error);
    return NextResponse.json({ error: 'Falha ao salvar dados do perfil.' }, { status: 500 });
  }
}
