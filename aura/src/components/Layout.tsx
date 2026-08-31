import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, 
  Receipt, 
  Upload, 
  Settings, 
  LogOut, 
  Flame, 
  Users
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

const navItems = [
  { p: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { p: '/transactions', icon: Receipt, label: 'Ledger' },
  { p: '/tabs', icon: Users, label: 'Tabs' },
  { p: '/vault', icon: Flame, label: 'Vault' },
  { p: '/upload', icon: Upload, label: 'Awaken' },
  { p: '/settings', icon: Settings, label: 'System' },
];

const ANIME_PLACEHOLDER = "https://api.dicebear.com/7.x/avataaars/svg?seed=AuraMonarch&backgroundColor=transparent";

export default function Layout() {
  const { user, loading } = useAuth();
  const { getAuraColor, getAuraGlow } = useTheme();
  const auraColor = getAuraColor();
  const navigate = useNavigate();
  const location = useLocation();
  const [orbOpen, setOrbOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  // Smooth scroll-driven visibility for mobile nav
  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastScrollY = useRef(0);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // Smooth fluid scroll detection: glides down on downward scroll, glides up instantly on upward scroll
  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    const currentY = e.currentTarget.scrollTop;
    const diff = currentY - lastScrollY.current;

    // Only trigger if scrolled a noticeable amount
    if (diff > 25 && currentY > 60) {
      setIsNavVisible(false);
    } else if (diff < -15 || currentY < 40) {
      setIsNavVisible(true);
    }
    lastScrollY.current = currentY;
  };

  useEffect(() => {
    setIsNavVisible(true);
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#000000]">
        <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: auraColor, borderTopColor: 'transparent' }}></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const getAvatar = () => {
    if (user?.user_metadata?.avatar_url) {
      return user.user_metadata.avatar_url;
    }
    return ANIME_PLACEHOLDER;
  };

  const OrbContextMenu = () => (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      className="absolute bottom-full mb-3 right-0 sm:left-0 w-60 p-4 glass rounded-2xl border z-[60] shadow-2xl backdrop-blur-3xl bg-[#080808]/95 transform origin-bottom-right"
      style={{ borderColor: auraColor, boxShadow: `0 10px 40px ${auraColor}40` }}
    >
      <div className="pb-3 border-b border-zinc-800 mb-3">
        <p className="text-sm font-bold text-white truncate">{user?.user_metadata?.full_name || 'Monarch'}</p>
        <p className="text-xs text-zinc-500 font-mono tracking-tighter truncate">{user?.email}</p>
        <div className="mt-2 inline-block px-2 py-0.5 rounded text-[10px] uppercase tracking-widest font-bold" style={{ backgroundColor: `${auraColor}20`, color: auraColor, border: `1px solid ${auraColor}40` }}>
          Financial Rank: S
        </div>
      </div>

      <div className="space-y-1 mt-4 pt-3 border-t border-zinc-800">
        <button 
          onClick={() => { setOrbOpen(false); navigate('/settings'); }}
          className="w-full text-left px-2 py-1.5 text-xs font-bold text-zinc-300 hover:text-white hover:bg-slate-800 rounded transition-colors flex items-center gap-2"
        >
           <Settings size={14} /> Account Settings
        </button>

        <motion.button 
          whileHover={{ textShadow: "0 0 10px #FF0000", color: "#FF4D4D", backgroundColor: "rgba(255,0,0,0.1)" }}
          onClick={handleLogout} 
          className="w-full text-left px-2 py-1.5 rounded text-xs font-bold text-[#FF0000] transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-2">
             <LogOut size={14} className="group-hover:animate-pulse" /> Logout
          </div>
        </motion.button>
      </div>
    </motion.div>
  );

  return (
    <div className="flex h-screen bg-[#000000] overflow-hidden relative">
      <div className="absolute inset-0 z-0 bg-grid-slate-900/[0.04] bg-[size:20px_20px]"></div>

      {/* Desktop Sidebar */}
      <motion.aside 
        animate={{ width: isSidebarHovered ? 240 : 80 }}
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className="hidden md:flex flex-col justify-between p-4 glass z-40 bg-[#080808]/70 border-r border-zinc-800/80 transition-all duration-300 relative"
      >
        <div className="space-y-8">
           {/* Logo Section */}
           <div className="flex items-center gap-3 px-2">
              <div 
                className="w-10 h-10 rounded-2xl flex items-center justify-center p-2 text-black font-black text-xl shadow-lg relative flex-shrink-0"
                style={{ 
                  background: `linear-gradient(135deg, ${auraColor}, #000000)`,
                  boxShadow: getAuraGlow() 
                }}
              >
                 <img src="/logo.png" alt="Aura" className="w-6 h-6 object-contain" />
              </div>
              {isSidebarHovered && (
                <motion.span 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="font-black text-lg tracking-widest text-white uppercase"
                >
                  Aura
                </motion.span>
              )}
           </div>

           {/* Navigation Links */}
           <nav className="space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.p}
                  to={item.p}
                  className={({ isActive }) =>
                    `flex items-center gap-4 px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                      isActive 
                        ? 'bg-zinc-900 border border-zinc-700/80 text-white shadow-xl' 
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900/40 border border-transparent'
                    }`
                  }
                  style={({ isActive }) => isActive ? { color: auraColor, borderColor: `${auraColor}30` } : {}}
                >
                  <item.icon size={20} className="flex-shrink-0" />
                  {isSidebarHovered && (
                    <motion.span 
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="truncate tracking-wide"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </NavLink>
              ))}
           </nav>
        </div>

        {/* Desktop Profile Orb */}
        <div className="relative">
           <AnimatePresence>
             {orbOpen && <OrbContextMenu />}
           </AnimatePresence>

           <button
             onClick={() => setOrbOpen(!orbOpen)}
             className="w-full flex items-center gap-3 p-2 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 hover:bg-zinc-900 transition-all cursor-pointer"
           >
              <img 
                src={getAvatar()} 
                alt="Profile" 
                className="w-9 h-9 rounded-xl object-cover border border-zinc-700 flex-shrink-0"
              />
              {isSidebarHovered && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-left truncate"
                >
                   <p className="text-xs font-bold text-white truncate">{user?.user_metadata?.full_name || 'Monarch'}</p>
                   <p className="text-[10px] text-zinc-500 font-mono truncate">{user?.email}</p>
                </motion.div>
              )}
           </button>
        </div>
      </motion.aside>

      {/* Main Content Area with Scroll Listener */}
      <main 
        ref={mainRef}
        onScroll={handleScroll}
        className="flex-1 h-full overflow-y-auto w-full relative z-10 p-4 md:p-8 pb-32 md:pb-8"
      >
         <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="h-full max-w-7xl mx-auto"
            >
               <Outlet />
            </motion.div>
         </AnimatePresence>
      </main>

      {/* Ultra-Clean, Silky-Smooth Mobile Navigation Dock */}
      <motion.div 
        animate={{ 
          y: isNavVisible ? 0 : 85,
          opacity: isNavVisible ? 1 : 0,
        }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-auto max-w-[94%]"
      >
        <div 
          className="glass backdrop-blur-2xl bg-[#080808]/90 border border-zinc-750 rounded-full flex items-center gap-1 sm:gap-2 px-3.5 py-1.5 shadow-2xl relative"
          style={{ borderColor: `${auraColor}60`, boxShadow: `0 10px 30px ${auraColor}25` }}
        >
          {/* Profile Menu Popup */}
          <AnimatePresence>
            {orbOpen && (
              <div className="absolute bottom-full right-0 mb-3 w-60 z-[60]">
                <OrbContextMenu />
              </div>
            )}
          </AnimatePresence>

          {/* Navigation Links */}
          {navItems.map((item) => (
            <NavLink
              key={item.p}
              to={item.p}
              className={({ isActive }) =>
                `relative p-2 rounded-full transition-all duration-200 ${
                  isActive ? 'text-white' : 'text-zinc-400 hover:text-white'
                }`
              }
              style={({ isActive }) => isActive ? { color: auraColor } : {}}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={19} className={isActive ? 'drop-shadow-[0_0_8px_currentColor]' : ''} />
                  {isActive && (
                    <motion.div 
                      layoutId="mobile-dot-indicator"
                      className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{ backgroundColor: auraColor, boxShadow: `0 0 6px ${auraColor}` }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}

          <div className="w-px h-5 bg-zinc-800 mx-1"></div>

          {/* Profile Orb */}
          <button 
            type="button"
            onClick={() => setOrbOpen(!orbOpen)}
            className="w-6 h-6 rounded-full border p-0.5 active:scale-90 transition-transform flex-shrink-0 cursor-pointer"
            style={{ borderColor: auraColor }}
          >
            <img 
              src={getAvatar()} 
              alt="Profile" 
              className="w-full h-full rounded-full object-cover"
            />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
