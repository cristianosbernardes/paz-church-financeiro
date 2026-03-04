import React, { useState, useEffect } from 'react';
import { useChurch } from '@/contexts/ChurchContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Church } from '@/types/database';

const Membros = () => {
  const { memberships, userRole } = useChurch();
  const [members, setMembers] = useState<any[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [churchId, setChurchId] = useState('');
  const [role, setRole] = useState('Membro');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const userChurchIds = memberships.map(m => m.church_id);
  const canWrite = userRole === 'ADMIN' || userRole === 'TESOURARIA';

  const fetchData = async () => {
    const [membersRes, churchesRes, rolesRes] = await Promise.all([
      supabase.from('members').select('*, churches(name)').in('church_id', userChurchIds).order('full_name'),
      supabase.from('churches').select('*').in('id', userChurchIds).order('name'),
      supabase.from('member_roles').select('*').in('church_id', userChurchIds).order('name'),
    ]);
    setMembers(membersRes.data || []);
    setChurches(churchesRes.data || []);
    setRoles(rolesRes.data || []);
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

  const confirmDel = async () => {
    if (!deleteId) return;
    await supabase.from('members').delete().eq('id', deleteId);
    toast.success('Membro excluído');
    setDeleteId(null);
    fetchData();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Membros</h1>
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Lista de Membros</CardTitle>
          {canWrite && (
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" /> Novo Membro
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Igreja</TableHead>
                <TableHead>Papel</TableHead>
                {canWrite && <TableHead className="w-20">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map(m => (
                <TableRow key={m.id}>
                  <TableCell>{m.full_name}</TableCell>
                  <TableCell className="text-xs">{m.churches?.name}</TableCell>
                  <TableCell className="text-xs">{m.role || 'Membro'}</TableCell>
                  {canWrite && (
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
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
              <SelectTrigger><SelectValue placeholder="Selecione o cargo" /></SelectTrigger>
              <SelectContent>
                {roles.map(r => (
                  <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                ))}
                {roles.length === 0 && (
                  <SelectItem value="Membro" disabled>Cadastre cargos em Configurações</SelectItem>
                )}
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={save} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir membro</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este membro? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Membros;
