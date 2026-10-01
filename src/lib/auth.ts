import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from './db';


export const COOKIE_NAME = 'areanobre_session';
const SECRET = process.env.AUTH_SECRET || 'area-nobre-secret-key-development-2026';

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  status: string;
  iat: number;
  exp: number;
}

// Assinatura HMAC SHA256 para manter o cookie inviolável sem bibliotecas pesadas
export function signPayload(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [data, signature] = parts;
    const expectedSignature = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }
    const payload: SessionPayload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function ensureDemoUser() {
  const demoEmail = 'demo@areanobre.local';
  let demoUser = await prisma.user.findUnique({
    where: { email: demoEmail },
    include: { profile: true },
  });

  if (!demoUser) {
    const passwordHash = await hashPassword('corretor123');
    demoUser = await prisma.user.create({
      data: {
        name: 'Daiane Corrêa',
        email: demoEmail,
        passwordHash,
        role: 'BROKER',
        status: 'ACTIVE',
        profile: {
          create: {
            commercialName: 'Daiane Corrêa Imóveis',
            phone: '48999887766',
            creci: 'CRECI-SC 48.912',
            tagline: 'Consultoria Imobiliária Exclusiva em Criciúma e Região',
            city: 'Criciúma - SC',
            avatarUrl: '/images/daiane-avatar.jpg',
          },
        },
      },
      include: { profile: true },
    });
  }
  return demoUser;
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);
    if (!sessionCookie?.value) return null;
    return verifyToken(sessionCookie.value);
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      profile: {
        select: {
          id: true,
          commercialName: true,
          phone: true,
          creci: true,
          tagline: true,
          bio: true,
          city: true,
          avatarUrl: true,
          logoUrl: true,
        },
      },
    },
  });

  // Fase 5.4: Usuário INACTIVE não pode continuar operando sessão autenticada
  if (!user || user.status !== 'ACTIVE') {
    return null;
  }

  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN' || user.status !== 'ACTIVE') {
    return null;
  }
  return user;
}
