import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useChurch, ALL_CHURCHES } from '@/contexts/ChurchContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { LayoutDashboard, FileText, List, Settings, LogOut, Church, Users, Menu, Lock } from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/relatorio', label: 'Relatório', icon: FileText },
  { to: '/transacoes', label: 'Transações', icon: List },
  { to: '/membros', label: 'Membros', icon: Users },
  { to: '/fechamento', label: 'Fechamento', icon: Lock },
  { to: '/config', label: 'Configurações', icon: Settings },
];

const SidebarContent: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
  const { signOut } = useAuth();
  const { memberships, selectedChurchId, setSelectedChurchId, userRole } = useChurch();
  const location = useLocation();
  const navigate = useNavigate();

  const visibleNav = navItems.filter(item => {
    if (item.to === '/config' && userRole !== 'ADMIN') return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="p-4 lg:p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-3">
          <Church className="h-5 w-5 lg:h-6 lg:w-6 text-sidebar-primary shrink-0" />
          <h1 className="text-base lg:text-lg font-bold font-['Space_Grotesk'] truncate">Igreja Finance</h1>
        </div>
        {memberships.length > 0 && (
          <Select value={selectedChurchId ?? ''} onValueChange={(v) => { setSelectedChurchId(v); }}>
            <SelectTrigger className="bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border text-xs">
              <SelectValue placeholder="Selecionar igreja" />
            </SelectTrigger>
            <SelectContent>
              {memberships.length > 1 && (
                <SelectItem value={ALL_CHURCHES}>📋 Todas as Igrejas</SelectItem>
              )}
              {memberships.map(m => (
                <SelectItem key={m.church_id} value={m.church_id}>
                  {m.churches?.name ?? m.church_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <nav className="flex-1 p-2 lg:p-3 space-y-1">
        {visibleNav.map(item => {
          const active = location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'hover:bg-sidebar-accent text-sidebar-foreground'
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 lg:p-3 border-t border-sidebar-border">
        {userRole && (
          <p className="text-xs text-sidebar-foreground/60 mb-2 px-3">
            Papel: <span className="font-semibold">{userRole}</span>
          </p>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent text-sm"
          onClick={() => { signOut(); navigate('/login'); onNavigate?.(); }}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  );
};

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedChurchId } = useChurch();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 lg:w-64 shrink-0 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile Header + Sheet */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b bg-sidebar text-sidebar-foreground">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px] bg-sidebar border-sidebar-border">
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <Church className="h-5 w-5 text-sidebar-primary" />
            <span className="font-bold text-sm font-['Space_Grotesk']">Igreja Finance</span>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-5 lg:p-6 max-w-7xl mx-auto">
            {!selectedChurchId ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
                <Church className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground" />
                <h2 className="text-lg sm:text-xl font-semibold text-center">Selecione uma igreja</h2>
                <p className="text-muted-foreground text-xs sm:text-sm text-center">Use o menu lateral para escolher a igreja.</p>
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
