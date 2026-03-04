import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChurch } from '@/contexts/ChurchContext';
import { supabase } from '@/lib/supabaseClient';
import { formatCentsToBRL } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Church, UserCheck, Users, Pencil } from 'lucide-react';

const MembroDetalhe = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRole } = useChurch();
  const [member, setMember] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [relatives, setRelatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      setLoading(true);
      const [memberRes, txRes, relRes] = await Promise.all([
        supabase.from('members').select('*, churches(name)').eq('id', id).single(),
        supabase.from('transactions').select('*, categories(name)').eq('member_id', id).order('date', { ascending: false }),
        supabase.from('member_relatives').select('*, relative:relative_member_id(full_name)').eq('member_id', id),
      ]);
      setMember(memberRes.data);
      setTransactions(txRes.data || []);
      setRelatives(relRes.data || []);
      setLoading(false);
    };
    fetchAll();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Membro não encontrado.</p>
        <Button variant="link" onClick={() => navigate('/membros')}>Voltar</Button>
      </div>
    );
  }

  const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount_cents, 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount_cents, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={() => navigate('/membros')}>
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold truncate">{member.full_name}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{member.churches?.name}</p>
        </div>
        <Button variant="outline" size="sm" className="text-xs sm:text-sm shrink-0" onClick={() => navigate(`/membros?edit=${member.id}`)}>
          <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" /> Editar
        </Button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cargo</p>
              <p className="font-semibold text-sm">{member.role || '—'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Conversão</p>
              <p className="font-semibold text-sm">
                {member.conversion_date
                  ? new Date(member.conversion_date + 'T12:00:00').toLocaleDateString('pt-BR')
                  : 'Não informada'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-income/10 flex items-center justify-center">
              <span className="text-income font-bold text-sm">↑</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Entradas</p>
              <p className="font-semibold text-sm text-income">{formatCentsToBRL(totalIncome)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-expense/10 flex items-center justify-center">
              <span className="text-expense font-bold text-sm">↓</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Saídas</p>
              <p className="font-semibold text-sm text-expense">{formatCentsToBRL(totalExpense)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Relatives */}
      {relatives.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Parentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {relatives.map(r => (
                <Badge key={r.id} variant="secondary" className="text-sm py-1 px-3">
                  {r.relative?.full_name || r.relative_name}
                  <span className="text-muted-foreground ml-1.5">({r.relationship})</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base">Histórico de Transações ({transactions.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[500px]">
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Descrição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhuma transação vinculada a este membro.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-sm">
                      {new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.type === 'INCOME' ? 'default' : 'destructive'} className="text-xs">
                        {t.type === 'INCOME' ? 'Entrada' : 'Saída'}
                      </Badge>
                    </TableCell>
                    <TableCell className={`font-semibold ${t.type === 'INCOME' ? 'text-income' : 'text-expense'}`}>
                      {formatCentsToBRL(t.amount_cents)}
                    </TableCell>
                    <TableCell className="text-sm">{t.categories?.name || '—'}</TableCell>
                    <TableCell className="max-w-[250px] truncate">{t.description}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default MembroDetalhe;
