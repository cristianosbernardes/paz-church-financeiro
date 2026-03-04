import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChurch } from '@/contexts/ChurchContext';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Eye, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Church } from '@/types/database';

const Membros = () => {
  const navigate = useNavigate();
  const { memberships, userRole } = useChurch();
  const [members, setMembers] = useState<any[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [churchId, setChurchId] = useState('');
  const [role, setRole] = useState('');
  const [conversionDate, setConversionDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Relatives state
  const [relatives, setRelatives] = useState<any[]>([]);
  const [newRelativeMemberId, setNewRelativeMemberId] = useState('');
  const [newRelativeName, setNewRelativeName] = useState('');
  const [newRelationship, setNewRelationship] = useState('Parente');

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
    setRole('');
    setConversionDate('');
    setRelatives([]);
    setDialogOpen(true);
  };

  const openEdit = async (m: any) => {
    setEditing(m);
    setName(m.full_name);
    setChurchId(m.church_id);
    setRole(m.role || '');
    setConversionDate(m.conversion_date || '');
    const { data } = await supabase
      .from('member_relatives')
      .select('*, relative:relative_member_id(full_name)')
      .eq('member_id', m.id);
    setRelatives(data || []);
    setDialogOpen(true);
  };

  const save = async () => {
    if (!name.trim() || !churchId) return;
    setSaving(true);
    const payload = {
      full_name: name.trim(),
      church_id: churchId,
      role: role || null,
      conversion_date: conversionDate || null,
    };
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

  const addRelative = async () => {
    if (!editing) return;
    if (!newRelativeMemberId && !newRelativeName.trim()) {
      toast.error('Selecione um membro ou digite um nome');
      return;
    }
    const payload: any = {
      member_id: editing.id,
      relationship: newRelationship,
    };
    if (newRelativeMemberId) {
      payload.relative_member_id = newRelativeMemberId;
    } else {
      payload.relative_name = newRelativeName.trim();
    }
    const { error } = await supabase.from('member_relatives').insert(payload);
    if (error) { toast.error('Erro: ' + error.message); return; }
    toast.success('Parente adicionado');
    setNewRelativeMemberId('');
    setNewRelativeName('');
    setNewRelationship('Parente');
    const { data } = await supabase
      .from('member_relatives')
      .select('*, relative:relative_member_id(full_name)')
      .eq('member_id', editing.id);
    setRelatives(data || []);
  };

  const removeRelative = async (id: string) => {
    await supabase.from('member_relatives').delete().eq('id', id);
    setRelatives(prev => prev.filter(r => r.id !== id));
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
                <TableHead>Cargo</TableHead>
                <TableHead>Conversão</TableHead>
                <TableHead className="w-28">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map(m => (
                <TableRow key={m.id}>
                  <TableCell>{m.full_name}</TableCell>
                  <TableCell className="text-xs">{m.churches?.name}</TableCell>
                  <TableCell className="text-xs">{m.role || '—'}</TableCell>
                  <TableCell className="text-xs">
                    {m.conversion_date
                      ? new Date(m.conversion_date + 'T12:00:00').toLocaleDateString('pt-BR')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/membros/${m.id}`)} title="Ver detalhes">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {canWrite && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(m)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(m.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Novo'} Membro</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Nome completo</label>
              <Input placeholder="Nome completo" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Igreja</label>
              <Select value={churchId} onValueChange={setChurchId}>
                <SelectTrigger><SelectValue placeholder="Selecione a igreja" /></SelectTrigger>
                <SelectContent>
                  {churches.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Cargo</label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue placeholder="Selecione o cargo" /></SelectTrigger>
                <SelectContent>
                  {roles.map(r => (
                    <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                  ))}
                  {roles.length === 0 && (
                    <SelectItem value="_" disabled>Cadastre cargos em Configurações</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Data de Conversão</label>
              <Input type="date" value={conversionDate} onChange={e => setConversionDate(e.target.value)} />
            </div>

            {/* Relatives section - only when editing */}
            {editing && (
              <div className="space-y-2 border-t pt-3">
                <label className="text-sm font-medium">Parentes</label>
                {relatives.map(r => (
                  <div key={r.id} className="flex items-center justify-between bg-muted rounded-md px-3 py-1.5 text-sm">
                    <span>
                      {r.relative?.full_name || r.relative_name || '—'}
                      <span className="text-muted-foreground ml-1">({r.relationship})</span>
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeRelative(r.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-2">
                  <Select value={newRelativeMemberId} onValueChange={v => { setNewRelativeMemberId(v); setNewRelativeName(''); }}>
                    <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Vincular membro" /></SelectTrigger>
                    <SelectContent>
                      {members.filter(m2 => m2.id !== editing.id).map(m2 => (
                        <SelectItem key={m2.id} value={m2.id}>{m2.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Ou digite um nome"
                    className="text-xs h-8"
                    value={newRelativeName}
                    onChange={e => { setNewRelativeName(e.target.value); setNewRelativeMemberId(''); }}
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Parentesco (ex: Esposo, Filho)"
                    className="text-xs h-8"
                    value={newRelationship}
                    onChange={e => setNewRelationship(e.target.value)}
                  />
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={addRelative}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar
                  </Button>
                </div>
              </div>
            )}

            <Button className="w-full" onClick={save} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
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
