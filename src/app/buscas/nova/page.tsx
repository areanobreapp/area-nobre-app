import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import SearchForm from '@/components/SearchForm';

export default async function NovaBuscaPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return <SearchForm />;
}
