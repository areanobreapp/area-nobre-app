import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import SearchForm from '@/components/SearchForm';

export default async function EditarBuscaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await params;

  const search = await prisma.search.findFirst({
    where: { id, userId: user.id },
    include: {
      client: true,
    },
  });

  if (!search) {
    redirect('/buscas');
  }

  return <SearchForm initialData={search} isEditing={true} />;
}
