import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword, signPayload, COOKIE_NAME } from '@/lib/auth';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, email, password, confirmPassword, phone, creci, commercialName } = body;

    // 1. Validações de presença e formato
    if (!name || typeof name !== 'string' || name.trim().length < 3) {
      return NextResponse.json(
        { error: 'Por favor, informe seu nome completo (mínimo 3 caracteres).' },
        { status: 400 }
      );
    }

    const cleanEmail = (email || '').toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: 'Por favor, informe um endereço de e-mail válido.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve conter no mínimo 6 caracteres.' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'A senha e a confirmação de senha não coincidem.' },
        { status: 400 }
      );
    }

    // 2. Verifica unicidade do e-mail
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Já existe uma conta cadastrada com este endereço de e-mail.' },
        { status: 409 }
      );
    }

    // 3. Criação segura do usuário: role SEMPRE BROKER, status ACTIVE
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        role: 'BROKER', // Regra da Fase 5.4: nenhum usuário pode escolher ADMIN
        status: 'ACTIVE',
        profile: {
          create: {
            commercialName: commercialName?.trim() || `${name.trim()} Imóveis`,
            phone: phone?.trim() || null,
            creci: creci?.trim() || null,
            city: 'Criciúma - SC',
          },
        },
      },
      include: {
        profile: true,
      },
    });

    // 4. Criação da sessão imediata
    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      iat: Date.now(),
      exp: Date.now() + ONE_WEEK_MS,
    };

    const token = signPayload(payload);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        profile: user.profile,
      },
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('Erro no cadastro de corretor:', error);
    return NextResponse.json(
      { error: 'Falha ao realizar cadastro. Tente novamente mais tarde.' },
      { status: 500 }
    );
  }
}
