import { CalendarDays, Tags, WalletCards } from 'lucide-react';

import { MuseCard, PageTabs } from '../../../components/ui/muse';
import ExpenseCategoryTab from './components/ExpenseCategoryTab';
import ExpenseDailyTab from './components/ExpenseDailyTab';
import ExpenseHonorariumTab from './components/ExpenseHonorariumTab';

// Halaman multi-bagian (CLAUDE.md §4 pola 2): tab aktif di `?tab=`.
const items = [
  {
    key: 'kategori',
    label: 'Kategori',
    icon: <Tags />,
    description: 'Master kategori pengeluaran yang juga menjadi pos pengeluaran di RAPBS.',
    render: () => (
      <MuseCard>
        <ExpenseCategoryTab />
      </MuseCard>
    ),
  },
  {
    key: 'harian',
    label: 'Harian',
    icon: <CalendarDays />,
    render: () => <ExpenseDailyTab />,
  },
  {
    key: 'honorarium',
    label: 'Honorarium',
    icon: <WalletCards />,
    render: () => <ExpenseHonorariumTab />,
  },
];

const Expense = () => (
  <PageTabs
    title='Pengeluaran'
    description='Kelola kategori, pengeluaran harian, dan pembayaran honorarium satuan.'
    items={items}
  />
);

export default Expense;
