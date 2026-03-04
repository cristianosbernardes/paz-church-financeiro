import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useChurch } from '@/contexts/ChurchContext';
import { supabase } from '@/lib/supabaseClient';
import { formatCentsToBRL, getCurrentYearMonth, MONTH_NAMES, getMonthLabel } from '@/lib/formatters';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileText } from 'lucide-react';
import type { Transaction, MonthlySummary } from '@/types/database';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Relatorio = () => {
  const { selectedChurchId, selectedChurchName } = useChurch();
  const [searchParams, setSearchParams] = useSearchParams();
  const month = searchParams.get('month') || getCurrentYearMonth();
  const [year, monthNum] = month.split('-').map(Number);

  const [summary, setSummary] = useState<MonthlySummary>({ previousBalance: 0, totalIncome: 0, totalExpense: 0, currentBalance: 0 });
  const [incomes, setIncomes] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedChurchId) return;
    fetchData();
  }, [selectedChurchId, month]);

  const fetchData = async () => {
    setLoading(true);
    const startDate = `${month}-01`;
    const endDate = new Date(year, monthNum, 0).toISOString().split('T')[0];

    const { data: txns } = await supabase
      .from('transactions')
      .select('*, categories(*)')
      .eq('church_id', selectedChurchId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');

    const all = txns || [];
    setIncomes(all.filter(t => t.type === 'INCOME'));
    setExpenses(all.filter(t => t.type === 'EXPENSE'));

    const totalIncome = all.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount_cents, 0);
    const totalExpense = all.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount_cents, 0);

    const { data: prevTxns } = await supabase
      .from('transactions')
      .select('type, amount_cents')
      .eq('church_id', selectedChurchId)
      .lt('date', startDate);

    const previousBalance = (prevTxns || []).reduce((s, t) => s + (t.type === 'INCOME' ? t.amount_cents : -t.amount_cents), 0);

    setSummary({ previousBalance, totalIncome, totalExpense, currentBalance: previousBalance + totalIncome - totalExpense });
    setLoading(false);
  };

  const monthLabel = getMonthLabel(year, monthNum);

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0');
    return { value: `${year}-${m}`, label: `${MONTH_NAMES[i]}/${year}` };
  });

  const extractDay = (date: string) => parseInt(date.split('-')[2]);

  const exportCSV = () => {
    let csv = `RELATÓRIO DETALHADO - ${monthLabel}\n`;
    csv += `${selectedChurchName}\n\n`;
    csv += `Saldo Mês Anterior;${formatCentsToBRL(summary.previousBalance)}\n`;
    csv += `Entrada do Mês;${formatCentsToBRL(summary.totalIncome)}\n`;
    csv += `Total Saída;${formatCentsToBRL(summary.totalExpense)}\n`;
    csv += `Saldo do Mês;${formatCentsToBRL(summary.currentBalance)}\n\n`;
    csv += `ENTRADAS\nDia;Valor;Descrição\n`;
    incomes.forEach(t => { csv += `${extractDay(t.date)};${formatCentsToBRL(t.amount_cents)};${t.description}\n`; });
    csv += `\nSAÍDAS\nDia;Valor;Descrição\n`;
    expenses.forEach(t => { csv += `${extractDay(t.date)};${formatCentsToBRL(t.amount_cents)};${t.description}\n`; });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-${month}.csv`;
    a.click();
  };

  const exportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text(`RELATÓRIO DETALHADO - ${monthLabel}`, 14, 20);
    doc.setFontSize(11);
    doc.text(selectedChurchName, 14, 28);

    doc.setFontSize(10);
    const summaryData = [
      ['Saldo Mês Anterior', formatCentsToBRL(summary.previousBalance)],
      ['Entrada do Mês', formatCentsToBRL(summary.totalIncome)],
      ['Total Saída', formatCentsToBRL(summary.totalExpense)],
      ['Saldo do Mês', formatCentsToBRL(summary.currentBalance)],
    ];

    autoTable(doc, {
      startY: 34,
      head: [['Resumo', 'Valor']],
      body: summaryData,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 65, 122] },
      margin: { left: 14, right: 14 },
    });

    const afterSummary = (doc as any).lastAutoTable.finalY + 8;

    // Entradas table (left half)
    autoTable(doc, {
      startY: afterSummary,
      head: [['Dia', 'Valor', 'Descrição']],
      body: incomes.map(t => [extractDay(t.date), formatCentsToBRL(t.amount_cents), t.description]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 139, 84] },
      margin: { left: 14, right: 110 },
      tableWidth: 85,
    });

    // Saídas table (right half)
    autoTable(doc, {
      startY: afterSummary,
      head: [['Dia', 'Valor', 'Descrição']],
      body: expenses.map(t => [extractDay(t.date), formatCentsToBRL(t.amount_cents), t.description]),
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [194, 65, 60] },
      margin: { left: 110, right: 14 },
      tableWidth: 85,
    });

    doc.save(`relatorio-${month}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Relatório Mensal</h1>
        <div className="flex items-center gap-3">
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
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <FileText className="h-4 w-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="bg-primary text-primary-foreground rounded-lg p-6 text-center">
            <h2 className="text-xl font-bold">RELATÓRIO DETALHADO - {monthLabel.toUpperCase()}</h2>
            <p className="text-sm opacity-80 mt-1">{selectedChurchName}</p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-card rounded-lg p-4 border text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Saldo Mês Anterior</p>
              <p className="text-lg font-bold text-balance mt-1">{formatCentsToBRL(summary.previousBalance)}</p>
            </div>
            <div className="bg-card rounded-lg p-4 border text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Entrada do Mês</p>
              <p className="text-lg font-bold text-income mt-1">{formatCentsToBRL(summary.totalIncome)}</p>
            </div>
            <div className="bg-card rounded-lg p-4 border text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Saída</p>
              <p className="text-lg font-bold text-expense mt-1">{formatCentsToBRL(summary.totalExpense)}</p>
            </div>
            <div className="bg-card rounded-lg p-4 border text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Saldo do Mês</p>
              <p className={`text-lg font-bold mt-1 ${summary.currentBalance < 0 ? 'text-destructive' : 'text-income'}`}>
                {formatCentsToBRL(summary.currentBalance)}
              </p>
            </div>
          </div>

          {/* Side by side tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Entradas */}
            <div className="bg-card rounded-lg border overflow-hidden">
              <div className="bg-income text-income-foreground px-4 py-3">
                <h3 className="font-bold text-sm uppercase tracking-wider">Entradas</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Dia</TableHead>
                    <TableHead className="w-28">Valor</TableHead>
                    <TableHead>Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomes.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Nenhuma entrada</TableCell></TableRow>
                  ) : incomes.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono">{extractDay(t.date)}</TableCell>
                      <TableCell className="font-semibold text-income">{formatCentsToBRL(t.amount_cents)}</TableCell>
                      <TableCell>{t.description}</TableCell>
                    </TableRow>
                  ))}
                  {incomes.length > 0 && (
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell></TableCell>
                      <TableCell className="text-income">{formatCentsToBRL(summary.totalIncome)}</TableCell>
                      <TableCell>Total</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Saídas */}
            <div className="bg-card rounded-lg border overflow-hidden">
              <div className="bg-expense text-expense-foreground px-4 py-3">
                <h3 className="font-bold text-sm uppercase tracking-wider">Saídas</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Dia</TableHead>
                    <TableHead className="w-28">Valor</TableHead>
                    <TableHead>Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Nenhuma saída</TableCell></TableRow>
                  ) : expenses.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono">{extractDay(t.date)}</TableCell>
                      <TableCell className="font-semibold text-expense">{formatCentsToBRL(t.amount_cents)}</TableCell>
                      <TableCell>{t.description}</TableCell>
                    </TableRow>
                  ))}
                  {expenses.length > 0 && (
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell></TableCell>
                      <TableCell className="text-expense">{formatCentsToBRL(summary.totalExpense)}</TableCell>
                      <TableCell>Total</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Relatorio;
