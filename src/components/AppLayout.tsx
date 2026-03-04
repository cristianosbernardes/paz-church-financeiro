import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useChurch, ALL_CHURCHES } from '@/contexts/ChurchContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, FileText, List, Settings, LogOut, Church } from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/relatorio', label: 'Relatório', icon: FileText },
  { to: '/transacoes', label: 'Transações', icon: List },
  { to: '/config', label: 'Configurações', icon: Settings },
];

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { signOut } = useAuth();
  const { memberships, selectedChurchId, setSelectedChurchId, selectedChurchName, userRole } = useChurch();
  const location = useLocation();
  const navigate = useNavigate();

  const visibleNav = navItems.filter(item => {
    if (item.to === '/config' && userRole !== 'ADMIN') return false;
    return true;
  });

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col shrink-0">
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2 mb-4">
            <Church className="h-6 w-6 text-sidebar-primary" />
            <h1 className="text-lg font-bold font-['Space_Grotesk']">Igreja Finance</h1>
          </div>
          {memberships.length > 0 && (
            <Select value={selectedChurchId ?? ''} onValueChange={(v) => { setSelectedChurchId(v); }}>
              <SelectTrigger className="bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border text-xs">
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
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {visibleNav.map(item => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'hover:bg-sidebar-accent text-sidebar-foreground'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          {userRole && (
            <p className="text-xs text-sidebar-foreground/60 mb-2 px-3">
              Papel: <span className="font-semibold">{userRole}</span>
            </p>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => { signOut(); navigate('/login'); }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {!selectedChurchId ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
              <Church className="h-16 w-16 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Selecione uma igreja</h2>
              <p className="text-muted-foreground text-sm">Use o dropdown na barra lateral para escolher a igreja.</p>
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
};
