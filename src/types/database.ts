export interface Church {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  created_at: string;
}

export type AppRole = 'ADMIN' | 'TESOURARIA' | 'LEITOR';

export interface Membership {
  id: string;
  user_id: string;
  church_id: string;
  role: AppRole;
  created_at: string;
  churches?: Church;
}

export interface Category {
  id: string;
  church_id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE' | 'BOTH';
  created_at: string;
}

export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Transaction {
  id: string;
  church_id: string;
  date: string;
  type: TransactionType;
  amount_cents: number;
  description: string;
  category_id: string | null;
  created_by: string;
  receipt_url: string | null;
  created_at: string;
  categories?: Category;
}

export interface MonthlySummary {
  previousBalance: number;
  totalIncome: number;
  totalExpense: number;
  currentBalance: number;
}
