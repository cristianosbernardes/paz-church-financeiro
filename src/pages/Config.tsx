import React, { useState, useEffect } from 'react';
import { useChurch } from '@/contexts/ChurchContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Church, Category, AppRole } from '@/types/database';

const Config = () => {
  const { userRole, selectedChurchId, memberships } = useChurch();
  const { user } = useAuth();

  if (userRole !== 'ADMIN') {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Configurações</h1>
      <Tabs defaultValue="categories">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
          <TabsTrigger value="categories" className="text-xs sm:text-sm">Categorias</TabsTrigger>
          <TabsTrigger value="churches" className="text-xs sm:text-sm">Igrejas</TabsTrigger>
          <TabsTrigger value="roles" className="text-xs sm:text-sm">Cargos</TabsTrigger>
        </TabsList>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
        <TabsContent value="churches"><ChurchesTab /></TabsContent>
        <TabsContent value="roles"><RolesTab /></TabsContent>
      </Tabs>
    </div>
  );
};

// --- Categories Tab ---
const CategoriesTab = () => {
  const { selectedChurchId } = useChurch();
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<'INCOME' | 'EXPENSE' | 'BOTH'>('BOTH');

  const fetch = async () => {
    const { data } = await supabase.from('categories').select('*').eq('church_id', selectedChurchId).order('name');
    setCategories(data || []);
  };

  useEffect(() => { if (selectedChurchId) fetch(); }, [selectedChurchId]);

  const save = async () => {
    if (!name.trim()) return;
    const payload = { church_id: selectedChurchId, name: name.trim(), type };
    if (editing) {
      await supabase.from('categories').update(payload).eq('id', editing.id);
      toast.success('Categoria atualizada');
    } else {
      await supabase.from('categories').insert(payload);
      toast.success('Categoria criada');
    }
    setDialogOpen(false);
    fetch();
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const confirmDel = async () => {
    if (!deleteId) return;
    await supabase.from('categories').delete().eq('id', deleteId);
    toast.success('Excluída');
    setDeleteId(null);
    fetch();
  };

  return (
    <Card className="mt-4 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Categorias</CardTitle>
        <Button size="sm" onClick={() => { setEditing(null); setName(''); setType('BOTH'); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Nova
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map(c => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell className="text-xs">{c.type}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(c); setName(c.name); setType(c.type); setDialogOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Nova'} Categoria</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome" value={name} onChange={e => setName(e.target.value)} />
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="INCOME">Entrada</SelectItem>
                <SelectItem value="EXPENSE">Saída</SelectItem>
                <SelectItem value="BOTH">Ambos</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={save}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

// --- Churches Tab ---
const ChurchesTab = () => {
  const [churches, setChurches] = useState<Church[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetch = async () => {
    const { data } = await supabase.from('churches').select('*').order('name');
    setChurches(data || []);
  };

  useEffect(() => { fetch(); }, []);

  const save = async () => {
    if (!name.trim()) return;
    if (editId) {
      await supabase.from('churches').update({ name: name.trim() }).eq('id', editId);
      toast.success('Igreja atualizada');
    } else {
      await supabase.from('churches').insert({ name: name.trim() });
      toast.success('Igreja criada');
    }
    setDialogOpen(false);
    fetch();
  };

  const confirmDel = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('churches').delete().eq('id', deleteId);
    if (error) {
      toast.error('Erro ao excluir: ' + error.message);
    } else {
      toast.success('Igreja excluída');
    }
    setDeleteId(null);
    fetch();
  };

  return (
    <Card className="mt-4 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Igrejas</CardTitle>
        <Button size="sm" onClick={() => { setEditId(null); setName(''); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Nova
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {churches.map(c => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditId(c.id); setName(c.name); setDialogOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editId ? 'Editar' : 'Nova'} Igreja</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome da igreja" value={name} onChange={e => setName(e.target.value)} />
            <Button className="w-full" onClick={save}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir igreja</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta igreja? Todos os dados associados (membros, transações, categorias) poderão ser afetados. Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

// --- Roles Tab ---
const RolesTab = () => {
  const { selectedChurchId } = useChurch();
  const [roles, setRoles] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchRoles = async () => {
    const { data } = await supabase
      .from('member_roles')
      .select('*')
      .eq('church_id', selectedChurchId)
      .order('name');
    setRoles(data || []);
  };

  useEffect(() => { if (selectedChurchId) fetchRoles(); }, [selectedChurchId]);

  const save = async () => {
    if (!name.trim()) return;
    const payload = { church_id: selectedChurchId, name: name.trim() };
    if (editing) {
      const { error } = await supabase.from('member_roles').update({ name: name.trim() }).eq('id', editing.id);
      if (error) toast.error('Erro: ' + error.message);
      else toast.success('Cargo atualizado');
    } else {
      const { error } = await supabase.from('member_roles').insert(payload);
      if (error) toast.error('Erro: ' + error.message);
      else toast.success('Cargo criado');
    }
    setDialogOpen(false);
    fetchRoles();
  };

  const confirmDel = async () => {
    if (!deleteId) return;
    await supabase.from('member_roles').delete().eq('id', deleteId);
    toast.success('Cargo excluído');
    setDeleteId(null);
    fetchRoles();
  };

  return (
    <Card className="mt-4 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Cargos de Membros</CardTitle>
        <Button size="sm" onClick={() => { setEditing(null); setName(''); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Novo Cargo
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map(r => (
              <TableRow key={r.id}>
                <TableCell>{r.name}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(r); setName(r.name); setDialogOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Novo'} Cargo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome do cargo" value={name} onChange={e => setName(e.target.value)} />
            <Button className="w-full" onClick={save}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cargo</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este cargo? Membros com este cargo não serão excluídos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default Config;
