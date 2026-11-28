import { createContext, useContext } from 'react';

/**
 * Diisi oleh CenterFinanceShell ketika admin pusat memilih homebase.
 * Komponen finance membacanya untuk mengunci homebase_id dan menyembunyikan
 * dropdown pilih homebase — tanpa mengubah perilaku untuk admin keuangan.
 */
export const FinanceScopeContext = createContext(null);

export const useFinanceScope = () => useContext(FinanceScopeContext);
