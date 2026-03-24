import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { LayoutDashboard, Receipt, Upload, Settings, LogOut, Activity } from 'lucide-react';
import { useTheme, type AuraType } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const navItems = [
  { p: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { p: '/transactions', icon: Receipt, label: 'Ledger' },
  { p: '/upload', icon: Upload, label: 'Awaken' },
  { p: '/settings', icon: Settings, label: 'System' },
];

const ANIME_PLACEHOLDER = "https://api.dicebear.com/7.x/avataaars/svg?seed=AuraMonarch&backgroundColor=transparent";

const Layout = () => {
  const { user } = useAuth();
  const { aura, setAura, getAuraColor, getAuraGlow } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [orbOpen, setOrbOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

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
      className="absolute bottom-full mb-4 left-0 md:left-4 w-64 p-4 glass rounded-2xl border z-[60] shadow-2xl backdrop-blur-3xl bg-[#0a0f1a]/95 transform origin-bottom-left"
      style={{ borderColor: getAuraColor(), boxShadow: `0 10px 40px ${getAuraColor()}40` }}
    >
      <div className="pb-3 border-b border-slate-800 mb-3">
        <p className="text-sm font-bold text-white truncate">{user?.user_metadata?.full_name || 'Monarch'}</p>
        <p className="text-xs text-slate-500 font-mono tracking-tighter truncate">{user?.email}</p>
        <div className="mt-2 inline-block px-2 py-0.5 rounded text-[10px] uppercase tracking-widest font-bold" style={{ backgroundColor: `${getAuraColor()}20`, color: getAuraColor(), border: `1px solid ${getAuraColor()}40` }}>
          Financial Rank: S
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
          Aura Resonance
        </label>
        <select 
          value={aura}
          onChange={(e) => {
            setAura(e.target.value as AuraType);
          }}
          className="w-full bg-[#020617] border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none transition-colors appearance-none"
          style={{ borderColor: getAuraColor() }}
        >
          <option value="Berserker Red">Berserker Red</option>
          <option value="Void Black">Void Black</option>
          <option value="Hunter Green">Hunter Green</option>
          <option value="Super Saiyan Gold">Super Saiyan Gold</option>
          <option value="Ultra Instinct Silver">Ultra Instinct Silver</option>
          <option value="Demon Slayer Blue">Demon Slayer Blue</option>
          <option value="Hollow Purple">Hollow Purple</option>
        </select>
      </div>

      <div className="space-y-1 mt-4 pt-4 border-t border-slate-800">
        <button 
          onClick={() => { setOrbOpen(false); navigate('/settings'); }}
          className="w-full text-left px-2 py-1.5 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors flex items-center gap-2"
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
    <div className="flex h-screen bg-[#020617] overflow-hidden relative">
      <div className="absolute inset-0 z-0 bg-grid-slate-900/[0.04] bg-[size:20px_20px]"></div>

      {/* Desktop Retractable Sidebar */}
      <motion.aside 
        initial={{ width: 64 }}
        animate={{ width: isSidebarHovered ? 240 : 64, borderRightColor: getAuraColor() }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => {
          setIsSidebarHovered(false);
          setOrbOpen(false); // Close orb if mouse leaves sidebar entirely
        }}
        className="hidden md:flex flex-col h-full relative z-50 backdrop-blur-xl bg-[#0a0f1a]/80 shadow-[0_0_15px_rgba(0,0,0,0.5)] border-r whitespace-nowrap overflow-visible"
        style={{ boxShadow: `inset -2px 0 15px ${getAuraColor()}15` }}
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-center h-20">
          <motion.div animate={{ rotate: isSidebarHovered ? 0 : 360 }} transition={{ duration: 1 }}>
            <Activity size={24} style={{ color: getAuraColor() }} className="animate-pulse flex-shrink-0" />
          </motion.div>
          
          <AnimatePresence>
            {isSidebarHovered && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="ml-3 overflow-hidden"
              >
                <h1 className="text-xl font-black tracking-tighter text-white uppercase">Aura</h1>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="flex-1 px-2 py-6 space-y-4">
          {navItems.map((item) => (
            <NavLink
              key={item.p}
              to={item.p}
              className={({ isActive }) =>
                `group relative flex items-center justify-center md:justify-start px-2 py-3 rounded-lg transition-all duration-300 ${
                  isActive ? 'text-white' : 'text-slate-500 hover:text-white'
                }`
              }
              style={({ isActive }) => isActive ? { color: getAuraColor() } : {}}
            >
              {({ isActive }) => (
                <>
                  {/* Neon Indicator (Vertical Bar) */}
                  {isActive && (
                    <motion.div 
                      layoutId="sidebar-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 rounded-r-md"
                      style={{ backgroundColor: getAuraColor(), boxShadow: `0 0 10px ${getAuraColor()}, 0 0 20px ${getAuraColor()}` }}
                    />
                  )}
                  
                  <motion.div whileHover={{ scale: 1.15 }} className="w-6 flex justify-center ml-1 z-10">
                    <item.icon size={22} className={isActive ? 'drop-shadow-[0_0_8px_currentColor]' : ''} />
                  </motion.div>

                  <AnimatePresence>
                    {isSidebarHovered && (
                      <motion.span 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="ml-4 font-bold uppercase tracking-widest text-xs z-10 overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {/* Active background tint */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-lg opacity-10" style={{ backgroundColor: getAuraColor() }}></div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Profile Orb (Desktop Bottom) */}
        <div className="p-3 border-t border-slate-800 relative flex items-center justify-center">
           <AnimatePresence>
              {orbOpen && <OrbContextMenu />}
           </AnimatePresence>
           
           <button 
             onClick={() => setOrbOpen(!orbOpen)}
             className="w-full flex items-center justify-center md:justify-start p-1 rounded-full transition-all group"
           >
             <motion.div 
               animate={{ boxShadow: orbOpen ? getAuraGlow() : `0 0 10px ${getAuraColor()}40` }}
               whileHover={{ scale: 1.1 }}
               className="relative w-10 h-10 flex-shrink-0 rounded-full border-2 p-0.5"
               style={{ borderColor: getAuraColor() }}
             >
               <img src={getAvatar()} alt="Profile" className="w-full h-full rounded-full object-cover" />
             </motion.div>
             
             <AnimatePresence>
               {isSidebarHovered && (
                 <motion.div 
                   initial={{ opacity: 0, x: -10 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -10 }}
                   className="ml-3 text-left overflow-hidden flex-1"
                 >
                    <p className="text-[10px] font-bold text-white uppercase tracking-widest truncate">{user?.user_metadata?.full_name || 'Operative'}</p>
                 </motion.div>
               )}
             </AnimatePresence>
           </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 h-full overflow-y-auto w-full relative z-10 p-4 md:p-8 pb-32 md:pb-8">
         <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="h-full max-w-7xl mx-auto"
            >
               <Outlet />
            </motion.div>
         </AnimatePresence>
      </main>

      {/* Mobile Floating Island Dock */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm">
         {/* Context menu for mobile rendered absolutely positioned above the dock */}
         <AnimatePresence>
           {orbOpen && (
             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-64 z-[60]">
               <OrbContextMenu />
             </div>
           )}
         </AnimatePresence>

         <motion.div 
           animate={{ borderColor: getAuraColor(), boxShadow: `0 10px 30px ${getAuraColor()}30` }}
           className="glass backdrop-blur-2xl bg-[#0a0f1a]/80 border rounded-full flex justify-between items-center px-6 py-3"
         >
           {navItems.map((item) => (
              <NavLink
                key={item.p}
                to={item.p}
                className={({ isActive }) =>
                  `relative p-2 rounded-full transition-all duration-300 ${
                    isActive ? 'text-white' : 'text-slate-500'
                  }`
                }
                style={({ isActive }) => isActive ? { color: getAuraColor() } : {}}
              >
                {({ isActive }) => (
                  <>
                    <motion.div whileHover={{ scale: 1.15 }}>
                      <item.icon size={22} className={isActive ? 'drop-shadow-[0_0_8px_currentColor] z-10 relative' : 'z-10 relative'} />
                    </motion.div>
                    
                    {/* Glowing Dot Indicator for Mobile */}
                    {isActive && (
                      <motion.div 
                        layoutId="mobile-indicator"
                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: getAuraColor(), boxShadow: `0 0 10px ${getAuraColor()}, 0 0 20px ${getAuraColor()}` }}
                      />
                    )}
                  </>
                )}
              </NavLink>
           ))}
           
           <div className="w-px h-8 bg-slate-800 mx-1"></div>
           
           {/* Mobile Profile Orb */}
           <button 
             onClick={() => setOrbOpen(!orbOpen)}
             className="relative w-8 h-8 rounded-full border-2 p-0.5 transition-transform active:scale-95"
             style={{ borderColor: getAuraColor(), boxShadow: orbOpen ? getAuraGlow() : "none" }}
           >
             <img src={getAvatar()} alt="Profile" className="w-full h-full rounded-full object-cover" />
           </button>
         </motion.div>
      </div>

    </div>
  );
};

export default Layout;
