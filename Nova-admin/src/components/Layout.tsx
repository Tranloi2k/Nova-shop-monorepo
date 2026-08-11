import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard,
  ShoppingBag,
  FileText,
  Users,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Image,
} from 'lucide-react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const menuItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'Products', path: '/products', icon: ShoppingBag },
    { name: 'Posters', path: '/posters', icon: Image },
    { name: 'Orders', path: '/orders', icon: FileText },
    { name: 'Customers', path: '/customers', icon: Users },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.username?.substring(0, 2).toUpperCase() ?? 'AD';

  const navLinkClass = (isActive: boolean) =>
    `flex h-[46px] w-[46px] items-center justify-center rounded-[14px] transition-all duration-200 relative group ${
      isActive
        ? 'nova-nav-active'
        : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground'
    }`;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
      {/* Sidebar - Desktop */}
      <aside className="z-30 hidden h-full w-[78px] flex-none flex-col items-center gap-1.5 border-r border-border bg-white/[0.012] py-[22px] md:flex">
        <div className="mb-[18px]">
          <img
            src={theme === 'dark' ? '/nova-icon-white.png' : '/nova-icon.png'}
            alt="NOVA"
            className="h-7 w-7 object-contain select-none"
          />
        </div>

        <nav className="flex w-full flex-1 flex-col items-center gap-1.5">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                title={item.name}
                className={navLinkClass(isActive)}
              >
                <Icon size={20} strokeWidth={1.7} />
                <div className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={toggleTheme}
            className="flex h-[46px] w-[46px] items-center justify-center rounded-[14px] text-muted-foreground transition-all hover:bg-white/[0.04] hover:text-amber-400"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun size={20} strokeWidth={1.7} /> : <Moon size={20} strokeWidth={1.7} />}
          </button>

          {user && (
            <div className="relative z-50">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-400 font-display text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                title={user.username}
              >
                {initials}
              </button>

              {isUserMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                  <div className="absolute bottom-0 left-full z-50 ml-2 min-w-44 animate-in fade-in slide-in-from-left-2 rounded-xl border border-border bg-popover p-3 text-xs shadow-xl duration-150">
                    <p className="font-bold leading-none text-foreground">{user.username}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{user.role}</p>
                    <div className="mt-3 border-t border-border pt-2">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setShowLogoutConfirm(true);
                        }}
                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-transparent px-3 py-2 text-xs font-semibold text-red-500 transition-all hover:border-red-500/20 hover:bg-red-500/10"
                      >
                        <LogOut size={13} />
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="z-40 flex items-center justify-between border-b border-border bg-card/60 px-6 py-4 backdrop-blur-md md:hidden">
          <img
            src={theme === 'dark' ? '/nova-logo-white.png' : '/nova-logo.png'}
            alt="NOVA SHOP"
            className="h-5 w-auto object-contain select-none"
          />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto bg-background px-6 py-6 transition-colors duration-300 md:px-9 md:py-7 md:pb-11">
          {children}
        </main>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative z-50 flex h-full w-64 flex-col border-r border-border bg-background p-5">
            <div className="mb-8 flex items-center justify-between">
              <img
                src={theme === 'dark' ? '/nova-logo-white.png' : '/nova-logo.png'}
                alt="NOVA SHOP"
                className="h-5 w-auto object-contain"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleTheme}
                  className="rounded-xl border border-border bg-muted/40 p-2 text-muted-foreground hover:text-foreground"
                >
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-lg p-1 text-muted-foreground"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <nav className="flex-1 space-y-1">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                      isActive
                        ? 'border border-blue-500/20 bg-blue-500/10 text-blue-400'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <Icon size={18} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto border-t border-border pt-4">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setShowLogoutConfirm(true);
                }}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-red-500/10 hover:text-red-500"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm fade-in duration-200">
          <div className="glass-panel flex w-full max-w-sm animate-in flex-col items-center rounded-2xl border border-border bg-popover p-6 text-center text-popover-foreground shadow-2xl zoom-in-95 duration-200">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
              <LogOut size={22} className="ml-0.5" />
            </div>
            <h3 className="font-display text-base font-bold text-foreground">Sign Out</h3>
            <p className="mt-2 max-w-xs text-xs text-muted-foreground">
              Are you sure you want to sign out of the Admin panel? You will need to log back in to access dashboard data.
            </p>
            <div className="mt-6 flex w-full gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 cursor-pointer rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 cursor-pointer rounded-xl bg-red-500 px-4 py-2.5 text-xs font-bold text-white shadow-[0_4px_12px_rgba(239,68,68,0.2)] transition-all hover:bg-red-600"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
