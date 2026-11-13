import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

// Bloco 6: somente ADMIN cadastra empreendimentos de construtoras.
export default async function NovoEmpreendimentoLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/empreendimentos');
  return <>{children}</>;
}

