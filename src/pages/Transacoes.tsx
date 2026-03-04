import React, { useState, useEffect } from 'react';
import { useChurch, ALL_CHURCHES } from '@/contexts/ChurchContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { formatCentsToBRL, parseBRLToCents } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Pencil, Trash2, Upload, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import type { Transaction, Category, TransactionType } from '@/types/database';

const Transacoes = () => {
  const { selectedChurchId, activeChurchIds, userRole, memberships } = useChurch();
  const { user } = useAuth();
  const canEdit = userRole === 'ADMIN' || userRole === 'TESOURARIA';

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  // Form state
  const [formType, setFormType] = useState<TransactionType>('INCOME');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formChurchId, setFormChurchId] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeChurchIds.length === 0) return;
    fetchAll();
  }, [selectedChurchId, activeChurchIds.length]);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: txns }, { data: cats }] = await Promise.all([
      supabase.from('transactions').select('*, categories(*)').in('church_id', activeChurchIds).order('date', { ascending: false }).limit(200),
      supabase.from('categories').select('*').in('church_id', activeChurchIds).order('name'),
    ]);
    setTransactions(txns || []);
    setCategories(cats || []);
    setLoading(false);
  };

  const openNew = (type: TransactionType) => {
    setEditing(null);
    setFormType(type);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormAmount('');
    setFormDescription('');
    setFormCategoryId('');
    setFormChurchId(selectedChurchId === ALL_CHURCHES ? '' : selectedChurchId || '');
    setFormFile(null);
    setDialogOpen(true);
  };

  const openEdit = (t: Transaction) => {
    setEditing(t);
    setFormType(t.type);
    setFormDate(t.date);
    setFormAmount((t.amount_cents / 100).toFixed(2).replace('.', ','));
    setFormDescription(t.description);
    setFormCategoryId(t.category_id || '');
    setFormChurchId(t.church_id);
    setFormFile(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formAmount || !formDescription || !formDate) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    setSaving(true);

    let receipt_url = editing?.receipt_url ?? null;

    // Upload receipt if provided
    if (formFile && formChurchId) {
      const ext = formFile.name.split('.').pop();
      const path = `${formChurchId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('receipts').upload(path, formFile);
      if (!error) {
        const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path);
        receipt_url = urlData.publicUrl;
      }
    }

    const amount_cents = parseBRLToCents(formAmount);
    const payload = {
      church_id: formChurchId,
      type: formType,
      date: formDate,
      amount_cents,
      description: formDescription,
      category_id: formCategoryId || null,
      receipt_url,
      created_by: user!.id,
    };

    if (editing) {
      const { error } = await supabase.from('transactions').update(payload).eq('id', editing.id);
      if (error) toast.error(error.message);
      else toast.success('Transação atualizada');
    } else {
      const { error } = await supabase.from('transactions').insert(payload);
      if (error) toast.error(error.message);
      else toast.success('Transação criada');
    }

    setSaving(false);
    setDialogOpen(false);
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir esta transação?')) return;
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Excluída'); fetchAll(); }
  };

  const filteredCategories = categories.filter(c => 
    (c.type === formType || c.type === 'BOTH') && 
    (!formChurchId || c.church_id === formChurchId)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Transações</h1>
        {canEdit && (
          <div className="flex gap-2">
            <Button onClick={() => openNew('INCOME')} className="bg-income hover:bg-income/90 text-income-foreground">
              <TrendingUp className="h-4 w-4 mr-1" /> Nova Entrada
            </Button>
            <Button onClick={() => openNew('EXPENSE')} className="bg-expense hover:bg-expense/90 text-expense-foreground">
              <TrendingDown className="h-4 w-4 mr-1" /> Nova Saída
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Comprov.</TableHead>
                  {canEdit && <TableHead className="w-20">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">Nenhuma transação encontrada</TableCell></TableRow>
                ) : transactions.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-sm">{new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        t.type === 'INCOME' ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'
                      }`}>
                        {t.type === 'INCOME' ? 'Entrada' : 'Saída'}
                      </span>
                    </TableCell>
                    <TableCell className={`font-semibold ${t.type === 'INCOME' ? 'text-income' : 'text-expense'}`}>
                      {formatCentsToBRL(t.amount_cents)}
                    </TableCell>
                    <TableCell className="text-sm">{t.categories?.name || '—'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{t.description}</TableCell>
                    <TableCell>
                      {t.receipt_url ? (
                        <a href={t.receipt_url} target="_blank" rel="noopener" className="text-primary text-xs underline">Ver</a>
                      ) : '—'}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog for create/edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar' : 'Nova'} {formType === 'INCOME' ? 'Entrada' : 'Saída'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Igreja</label>
              <Select value={formChurchId} onValueChange={setFormChurchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar igreja" />
                </SelectTrigger>
                <SelectContent>
                  {memberships.map(m => (
                    <SelectItem key={m.church_id} value={m.church_id}>
                      {m.churches?.name ?? m.church_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Data</label>
              <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Valor (R$)</label>
              <Input
                placeholder="0,00"
                value={formAmount}
                onChange={e => setFormAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Descrição</label>
              <Input
                placeholder="Descrição da transação"
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Categoria</label>
              <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Comprovante (opcional)</label>
              <Input type="file" accept="image/*,.pdf" onChange={e => setFormFile(e.target.files?.[0] || null)} />
            </div>
            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Transacoes;
