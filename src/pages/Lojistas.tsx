import { Store } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { LojistasTab } from '@/components/lojistas/LojistasTab';

export default function Lojistas() {
  return (
    <PageLayout
      title="Lojistas"
      subtitle="Gerencie seus lojistas e parceiros B2B"
      icon={Store}
    >
      <LojistasTab />
    </PageLayout>
  );
}
