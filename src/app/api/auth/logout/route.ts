import { NextResponse } from 'next/server';

const COOKIE_NAME = 'areanobre_session';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Sessão encerrada com sucesso.' });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
