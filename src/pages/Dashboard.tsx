import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useChurch } from '@/contexts/ChurchContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { formatCentsToBRL, getCurrentYearMonth, MONTH_NAMES } from '@/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Wallet, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import type { Transaction, MonthlySummary } from '@/types/database';

const COLORS = ['hsl(220, 70%, 45%)', 'hsl(160, 60%, 40%)', 'hsl(40, 90%, 50%)', 'hsl(0, 72%, 51%)', 'hsl(280, 60%, 50%)', 'hsl(30, 80%, 50%)'];

const Dashboard = () => {
  const { selectedChurchId } = useChurch();
  const [searchParams, setSearchParams] = useSearchParams();
  const month = searchParams.get('month') || getCurrentYearMonth();
  const [year, monthNum] = month.split('-').map(Number);

  const [summary, setSummary] = useState<MonthlySummary>({ previousBalance: 0, totalIncome: 0, totalExpense: 0, currentBalance: 0 });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedChurchId) return;
    fetchData();
  }, [selectedChurchId, month]);

  const fetchData = async () => {
    setLoading(true);
    const startDate = `${month}-01`;
    const endDate = new Date(year, monthNum, 0).toISOString().split('T')[0];

    // Current month transactions
    const { data: txns } = await supabase
      .from('transactions')
      .select('*, categories(*)')
      .eq('church_id', selectedChurchId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');

    const currentTxns = txns || [];
    setTransactions(currentTxns);

    const totalIncome = currentTxns.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount_cents, 0);
    const totalExpense = currentTxns.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount_cents, 0);

    // Previous balance: all transactions before this month
    const { data: prevTxns } = await supabase
      .from('transactions')
      .select('type, amount_cents')
      .eq('church_id', selectedChurchId)
      .lt('date', startDate);

    const previousBalance = (prevTxns || []).reduce((s, t) => {
      return s + (t.type === 'INCOME' ? t.amount_cents : -t.amount_cents);
    }, 0);

    setSummary({
      previousBalance,
      totalIncome,
      totalExpense,
      currentBalance: previousBalance + totalIncome - totalExpense,
    });
    setLoading(false);
  };

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0');
    return { value: `${year}-${m}`, label: `${MONTH_NAMES[i]}/${year}` };
  });

  // Charts data
  const expenseByCategory = Object.values(
    transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => {
      const cat = t.categories?.name || 'Sem categoria';
      acc[cat] = acc[cat] || { name: cat, value: 0 };
      acc[cat].value += t.amount_cents / 100;
      return acc;
    }, {} as Record<string, { name: string; value: number }>)
  );

  const incomeByCategory = Object.values(
    transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => {
      const cat = t.categories?.name || 'Sem categoria';
      acc[cat] = acc[cat] || { name: cat, value: 0 };
      acc[cat].value += t.amount_cents / 100;
      return acc;
    }, {} as Record<string, { name: string; value: number }>)
  );

  // Daily balance evolution
  const dailyData: { day: string; saldo: number }[] = [];
  let runningBalance = summary.previousBalance / 100;
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = String(d).padStart(2, '0');
    const dayTxns = transactions.filter(t => parseInt(t.date.split('-')[2]) === d);
    dayTxns.forEach(t => {
      runningBalance += (t.type === 'INCOME' ? t.amount_cents : -t.amount_cents) / 100;
    });
    dailyData.push({ day: dayStr, saldo: runningBalance });
  }

  const cards = [
    { label: 'Saldo Anterior', value: summary.previousBalance, icon: Wallet, color: 'text-balance' },
    { label: 'Entradas', value: summary.totalIncome, icon: TrendingUp, color: 'text-income' },
    { label: 'Saídas', value: summary.totalExpense, icon: TrendingDown, color: 'text-expense' },
    { label: 'Saldo do Mês', value: summary.currentBalance, icon: DollarSign, color: summary.currentBalance < 0 ? 'text-destructive' : 'text-income' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Select value={month} onValueChange={(v) => setSearchParams({ month: v })}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map(c => (
              <Card key={c.label} className="shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{c.label}</span>
                    <c.icon className={`h-5 w-5 ${c.color}`} />
                  </div>
                  <p className={`text-2xl font-bold ${c.color}`}>{formatCentsToBRL(c.value)}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Line chart - balance evolution */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Evolução do Saldo</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                    <Line type="monotone" dataKey="saldo" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pie chart - expenses by category */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Saídas por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                {expenseByCategory.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-10">Sem saídas no período</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {expenseByCategory.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Bar chart - income by category */}
            <Card className="shadow-sm lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Entradas por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                {incomeByCategory.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-10">Sem entradas no período</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={incomeByCategory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                      <Bar dataKey="value" fill="hsl(var(--income))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
