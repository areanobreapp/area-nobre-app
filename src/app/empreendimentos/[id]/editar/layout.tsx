import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

// Bloco 6: somente ADMIN edita dados oficiais de empreendimentos.
export default async function EditarEmpreendimentoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect(`/empreendimentos/${id}`);
  return <>{children}</>;
}

