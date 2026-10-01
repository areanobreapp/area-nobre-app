import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { comparePassword, ensureDemoUser, signPayload, COOKIE_NAME } from '@/lib/auth';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

async function handleLogin(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let email = '';
    let password = '';
    let isDemo = false;
    let isNativeForm = false;

    if (req.method === 'GET') {
      const url = new URL(req.url);
      isDemo = url.searchParams.get('demo') === '1';
      isNativeForm = true;
    } else if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      email = body.email || '';
      password = body.password || '';
      isDemo = Boolean(body.isDemo);
    } else {
      isNativeForm = true;
      const formData = await req.formData().catch(() => new FormData());
      email = (formData.get('email') as string) || '';
      password = (formData.get('password') as string) || '';
      isDemo = formData.get('isDemo') === 'true';
    }

    let user;

    if (isDemo) {
      if (process.env.NODE_ENV === 'production') {
        if (isNativeForm) {
          return NextResponse.redirect(new URL('/login?error=demo_desativado', req.url), 303);
        }
        return NextResponse.json(
          { error: 'Acesso de demonstração indisponível em produção.' },
          { status: 403 }
        );
      }
      user = await ensureDemoUser();
    } else {
      const cleanEmail = email.toLowerCase().trim();
      if (!cleanEmail || !password) {
        if (isNativeForm) {
          return NextResponse.redirect(new URL('/login?error=campos_obrigatorios', req.url), 303);
        }
        return NextResponse.json(
          { error: 'Por favor, informe e-mail e senha.' },
          { status: 400 }
        );
      }

      user = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (!user) {
        if (isNativeForm) {
          return NextResponse.redirect(new URL('/login?error=credenciais_invalidas', req.url), 303);
        }
        return NextResponse.json(
          { error: 'Credenciais inválidas. Verifique seu e-mail e senha.' },
          { status: 401 }
        );
      }

      // Validação de conta inativa (Fase 5.4)
      if (user.status !== 'ACTIVE') {
        if (isNativeForm) {
          return NextResponse.redirect(new URL('/login?error=conta_inativa', req.url), 303);
        }
        return NextResponse.json(
          { error: 'Sua conta está desativada. Entre em contato com o suporte ou administrador.' },
          { status: 403 }
        );
      }

      const isPasswordValid = await comparePassword(password, user.passwordHash);
      if (!isPasswordValid) {
        if (isNativeForm) {
          return NextResponse.redirect(new URL('/login?error=senha_incorreta', req.url), 303);
        }
        return NextResponse.json(
          { error: 'Credenciais inválidas. Verifique seu e-mail e senha.' },
          { status: 401 }
        );
      }
    }

    // Se o usuário estiver inativo mesmo no demo
    if (user.status !== 'ACTIVE') {
      if (isNativeForm) {
        return NextResponse.redirect(new URL('/login?error=conta_inativa', req.url), 303);
      }
      return NextResponse.json(
        { error: 'Conta inativa.' },
        { status: 403 }
      );
    }

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

    const isProduction = process.env.NODE_ENV === 'production';

    if (isNativeForm) {
      const redirectResponse = NextResponse.redirect(new URL('/', req.url), 303);
      redirectResponse.cookies.set({
        name: COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });
      return redirectResponse;
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('Erro na rota de login:', error);
    if (req.method === 'GET' || req.headers.get('content-type')?.includes('form')) {
      return NextResponse.redirect(new URL('/login?error=erro_servidor', req.url), 303);
    }
    return NextResponse.json(
      { error: 'Erro interno ao realizar autenticação.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return handleLogin(req);
}

export async function GET(req: NextRequest) {
  return handleLogin(req);
}
