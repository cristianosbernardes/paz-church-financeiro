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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>
      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="churches">Igrejas</TabsTrigger>
          <TabsTrigger value="members">Membros</TabsTrigger>
        </TabsList>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
        <TabsContent value="churches"><ChurchesTab /></TabsContent>
        <TabsContent value="members"><MembersTab /></TabsContent>
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
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditId(c.id); setName(c.name); setDialogOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
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
    </Card>
  );
};

// --- Members Tab ---
const MembersTab = () => {
  const { memberships } = useChurch();
  const [members, setMembers] = useState<any[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [churchId, setChurchId] = useState('');
  const [role, setRole] = useState('Membro');
  const [saving, setSaving] = useState(false);

  const userChurchIds = memberships.map(m => m.church_id);

  const fetchData = async () => {
    const [membersRes, churchesRes] = await Promise.all([
      supabase.from('members').select('*, churches(name)').in('church_id', userChurchIds).order('full_name'),
      supabase.from('churches').select('*').in('id', userChurchIds).order('name'),
    ]);
    setMembers(membersRes.data || []);
    setChurches(churchesRes.data || []);
  };

  useEffect(() => { if (userChurchIds.length) fetchData(); }, [memberships]);

  const openNew = () => {
    setEditing(null);
    setName('');
    setChurchId(userChurchIds[0] || '');
    setRole('Membro');
    setDialogOpen(true);
  };

  const openEdit = (m: any) => {
    setEditing(m);
    setName(m.full_name);
    setChurchId(m.church_id);
    setRole(m.role || 'Membro');
    setDialogOpen(true);
  };

  const save = async () => {
    if (!name.trim() || !churchId) return;
    setSaving(true);
    const payload = { full_name: name.trim(), church_id: churchId, role };
    if (editing) {
      const { error } = await supabase.from('members').update(payload).eq('id', editing.id);
      if (error) { toast.error('Erro ao atualizar: ' + error.message); }
      else { toast.success('Membro atualizado'); }
    } else {
      const { error } = await supabase.from('members').insert(payload);
      if (error) { toast.error('Erro ao criar: ' + error.message); }
      else { toast.success('Membro adicionado'); }
    }
    setSaving(false);
    setDialogOpen(false);
    fetchData();
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const confirmDel = async () => {
    if (!deleteId) return;
    await supabase.from('members').delete().eq('id', deleteId);
    toast.success('Membro excluído');
    setDeleteId(null);
    fetchData();
  };

  return (
    <Card className="mt-4 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Membros</CardTitle>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Novo Membro
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Igreja</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map(m => (
              <TableRow key={m.id}>
                <TableCell>{m.full_name}</TableCell>
                <TableCell className="text-xs">{m.churches?.name}</TableCell>
                <TableCell className="text-xs">{m.role || 'Membro'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(m)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(m.id)}>
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
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Novo'} Membro</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome completo" value={name} onChange={e => setName(e.target.value)} />
            <Select value={churchId} onValueChange={setChurchId}>
              <SelectTrigger><SelectValue placeholder="Selecione a igreja" /></SelectTrigger>
              <SelectContent>
                {churches.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Membro">Membro</SelectItem>
                <SelectItem value="Líder">Líder</SelectItem>
                <SelectItem value="Pastor">Pastor</SelectItem>
                <SelectItem value="Diácono">Diácono</SelectItem>
                <SelectItem value="Tesoureiro">Tesoureiro</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={save} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default Config;
