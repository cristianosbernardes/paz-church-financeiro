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

  const del = async (id: string) => {
    if (!confirm('Excluir categoria?')) return;
    await supabase.from('categories').delete().eq('id', id);
    toast.success('Excluída');
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
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => del(c.id)}>
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
  const { selectedChurchId } = useChurch();
  const [members, setMembers] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole>('LEITOR');
  const [adding, setAdding] = useState(false);

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('memberships')
      .select('*, profiles(full_name)')
      .eq('church_id', selectedChurchId)
      .order('created_at');
    setMembers(data || []);
  };

  useEffect(() => { if (selectedChurchId) fetchMembers(); }, [selectedChurchId]);

  const addMember = async () => {
    if (!email.trim() || !selectedChurchId) return;
    setAdding(true);
    try {
      // Find user by email via profiles (match full_name which is set to email on signup)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name')
        .or(`full_name.eq.${email.trim()}`)
        .maybeSingle();

      if (!profile) {
        toast.error('Usuário não encontrado. Verifique se o e-mail está cadastrado.');
        setAdding(false);
        return;
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from('memberships')
        .select('id')
        .eq('church_id', selectedChurchId)
        .eq('user_id', profile.id)
        .maybeSingle();

      if (existing) {
        toast.error('Este usuário já é membro desta igreja.');
        setAdding(false);
        return;
      }

      const { error } = await supabase.from('memberships').insert({
        church_id: selectedChurchId,
        user_id: profile.id,
        role,
      });

      if (error) {
        toast.error('Erro ao adicionar membro: ' + error.message);
      } else {
        toast.success('Membro adicionado com sucesso!');
        setDialogOpen(false);
        setEmail('');
        setRole('LEITOR');
        fetchMembers();
      }
    } catch (err) {
      toast.error('Erro inesperado ao adicionar membro.');
    }
    setAdding(false);
  };

  const updateRole = async (id: string, newRole: AppRole) => {
    await supabase.from('memberships').update({ role: newRole }).eq('id', id);
    toast.success('Papel atualizado');
    fetchMembers();
  };

  const remove = async (id: string) => {
    if (!confirm('Remover membro?')) return;
    await supabase.from('memberships').delete().eq('id', id);
    toast.success('Removido');
    fetchMembers();
  };

  return (
    <Card className="mt-4 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Membros desta Igreja</CardTitle>
        <Button size="sm" onClick={() => { setEmail(''); setRole('LEITOR'); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map(m => (
              <TableRow key={m.id}>
                <TableCell>{m.profiles?.full_name || m.user_id}</TableCell>
                <TableCell>
                  <Select value={m.role} onValueChange={(v: AppRole) => updateRole(m.id, v)}>
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="TESOURARIA">Tesouraria</SelectItem>
                      <SelectItem value="LEITOR">Leitor</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(m.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Adicionar Membro</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="E-mail do usuário" value={email} onChange={e => setEmail(e.target.value)} />
            <Select value={role} onValueChange={(v: AppRole) => setRole(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="TESOURARIA">Tesouraria</SelectItem>
                <SelectItem value="LEITOR">Leitor</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={addMember} disabled={adding}>
              {adding ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default Config;
