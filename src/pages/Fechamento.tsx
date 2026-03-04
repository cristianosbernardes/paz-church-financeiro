import React, { useState, useEffect } from 'react';
import { useChurch } from '@/contexts/ChurchContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { formatCentsToBRL, MONTH_NAMES } from '@/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface MonthlyClosing {
  id: string;
  church_id: string;
  year: number;
  month: number;
  closing_balance_cents: number;
  closed_by: string;
  closed_at: string;
}

const Fechamento = () => {
  const { selectedChurchId, userRole } = useChurch();
  const { user } = useAuth();
  const canClose = userRole === 'ADMIN';

  const [closings, setClosings] = useState<MonthlyClosing[]>([]);
  const [monthsData, setMonthsData] = useState<{ year: number; month: number; income: number; expense: number; balance: number; closed?: MonthlyClosing }[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState<{ type: 'close' | 'reopen'; year: number; month: number; balance: number } | null>(null);

  useEffect(() => {
    if (!selectedChurchId) return;
    fetchData();
  }, [selectedChurchId]);

  const fetchData = async () => {
    setLoading(true);

    // Get all closings for this church
    const { data: closingData } = await supabase
      .from('monthly_closing')
      .select('*')
      .eq('church_id', selectedChurchId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    setClosings(closingData || []);

    // Build last 12 months
    const now = new Date();
    const months: { year: number; month: number; income: number; expense: number; balance: number; closed?: MonthlyClosing }[] = [];

    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      const endDate = new Date(y, m, 0).toISOString().split('T')[0];

      const { data: txns } = await supabase
        .from('transactions')
        .select('type, amount_cents')
        .eq('church_id', selectedChurchId)
        .gte('date', startDate)
        .lte('date', endDate);

      const income = (txns || []).filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount_cents, 0);
      const expense = (txns || []).filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount_cents, 0);

      // Previous balance
      const { data: prevTxns } = await supabase
        .from('transactions')
        .select('type, amount_cents')
        .eq('church_id', selectedChurchId)
        .lt('date', startDate);

      const prevBalance = (prevTxns || []).reduce((s, t) => s + (t.type === 'INCOME' ? t.amount_cents : -t.amount_cents), 0);
      const balance = prevBalance + income - expense;

      const closing = (closingData || []).find(c => c.year === y && c.month === m);

      months.push({ year: y, month: m, income, expense, balance, closed: closing });
    }

    setMonthsData(months);
    setLoading(false);
  };

  const handleClose = async () => {
    if (!confirmAction || !user) return;
    const { year, month, balance } = confirmAction;

    if (confirmAction.type === 'close') {
      const { error } = await supabase.from('monthly_closing').insert({
        church_id: selectedChurchId,
        year,
        month,
        closing_balance_cents: balance,
        closed_by: user.id,
      });
      if (error) {
        toast.error('Erro ao fechar mês: ' + error.message);
      } else {
        toast.success(`${MONTH_NAMES[month - 1]}/${year} fechado com sucesso!`);
      }
    } else {
      const closing = closings.find(c => c.year === year && c.month === month);
      if (closing) {
        const { error } = await supabase.from('monthly_closing').delete().eq('id', closing.id);
        if (error) {
          toast.error('Erro ao reabrir mês: ' + error.message);
        } else {
          toast.success(`${MONTH_NAMES[month - 1]}/${year} reaberto!`);
        }
      }
    }

    setConfirmAction(null);
    fetchData();
  };

  const isCurrentMonth = (y: number, m: number) => {
    const now = new Date();
    return y === now.getFullYear() && m === now.getMonth() + 1;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">Fechamento Mensal</h1>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Controle de Fechamento
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Feche meses para impedir edições retroativas nas transações. Apenas administradores podem fechar ou reabrir meses.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês/Ano</TableHead>
                    <TableHead>Entradas</TableHead>
                    <TableHead>Saídas</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Status</TableHead>
                    {canClose && <TableHead className="w-32">Ação</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthsData.map(m => (
                    <TableRow key={`${m.year}-${m.month}`} className={m.closed ? 'bg-muted/30' : ''}>
                      <TableCell className="font-medium">
                        {MONTH_NAMES[m.month - 1]}/{m.year}
                      </TableCell>
                      <TableCell className="text-income font-semibold">{formatCentsToBRL(m.income)}</TableCell>
                      <TableCell className="text-expense font-semibold">{formatCentsToBRL(m.expense)}</TableCell>
                      <TableCell className={`font-bold ${m.balance < 0 ? 'text-destructive' : 'text-income'}`}>
                        {formatCentsToBRL(m.balance)}
                      </TableCell>
                      <TableCell>
                        {m.closed ? (
                          <Badge variant="default" className="bg-income/15 text-income border-income/30 gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Fechado
                          </Badge>
                        ) : isCurrentMonth(m.year, m.month) ? (
                          <Badge variant="secondary" className="gap-1">
                            <AlertTriangle className="h-3 w-3" /> Em andamento
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground gap-1">
                            <Unlock className="h-3 w-3" /> Aberto
                          </Badge>
                        )}
                      </TableCell>
                      {canClose && (
                        <TableCell>
                          {m.closed ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => setConfirmAction({ type: 'reopen', year: m.year, month: m.month, balance: m.balance })}
                            >
                              <Unlock className="h-3 w-3 mr-1" /> Reabrir
                            </Button>
                          ) : !isCurrentMonth(m.year, m.month) ? (
                            <Button
                              size="sm"
                              className="text-xs"
                              onClick={() => setConfirmAction({ type: 'close', year: m.year, month: m.month, balance: m.balance })}
                            >
                              <Lock className="h-3 w-3 mr-1" /> Fechar
                            </Button>
                          ) : null}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'close' ? 'Fechar mês' : 'Reabrir mês'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'close'
                ? `Tem certeza que deseja fechar ${confirmAction ? MONTH_NAMES[confirmAction.month - 1] + '/' + confirmAction.year : ''}? Transações deste mês não poderão ser editadas enquanto estiver fechado.`
                : `Deseja reabrir ${confirmAction ? MONTH_NAMES[confirmAction.month - 1] + '/' + confirmAction.year : ''}? Transações poderão ser editadas novamente.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose}>
              {confirmAction?.type === 'close' ? 'Fechar' : 'Reabrir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Fechamento;
