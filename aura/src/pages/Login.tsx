import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock, Sparkles, User, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Animation states
  const [rank, setRank] = useState<'E' | 'S'>('E');
  const [showAwakening, setShowAwakening] = useState(false);

  const triggerAwakening = () => {
    setRank('S');
    setShowAwakening(true);
    // After 3 seconds of animation, navigate to the dashboard
    setTimeout(() => {
      navigate('/');
    }, 4000);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // First try to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      if (signInError.message.includes('Invalid login credentials')) {
        // Auto-signup logic if user doesn't exist to make testing easy
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) {
          setError(signUpError.message);
          setLoading(false);
          return;
        } else {
          triggerAwakening();
        }
      } else {
        setError(signInError.message);
        setLoading(false);
      }
    } else {
      triggerAwakening();
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    
    // Note: The actual redirect handles the session, but if there's an immediate error we catch it.
    if (error) {
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Gate Energy */}
      <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
        <div className="w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] rounded-full bg-blue-600 blur-[120px] mix-blend-screen animate-pulse"></div>
      </div>

      <AnimatePresence>
        {showAwakening && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ delay: 0.5, type: 'spring', bounce: 0.5 }}
              className="px-8 py-6 rounded-xl border border-blue-500/50 bg-[#0a0f1a] shadow-[0_0_50px_rgba(59,130,246,0.3)] text-center max-w-lg mx-4"
            >
              <h2 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 mb-4 tracking-widest uppercase flex items-center justify-center gap-3">
                <Sparkles className="text-blue-400" />
                SYSTEM NOTIFICATION
                <Sparkles className="text-blue-400" />
              </h2>
              <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 transition={{ delay: 1.5, duration: 1 }}
                 className="text-lg text-slate-300 font-mono typing-effect"
              >
                [SYSTEM: You have been chosen as the Monarch of Finance.]
              </motion.div>
              
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 2.5, duration: 1 }}
                className="h-1 bg-blue-500 mt-6 shadow-[0_0_10px_#3b82f6]"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md relative z-10"
      >
        {/* The Gate UI */}
        <div className="glass p-8 rounded-2xl border-2 border-blue-500/30 bg-[#0a0f1a]/80 backdrop-blur-xl shadow-[0_0_40px_rgba(59,130,246,0.15)] relative overflow-hidden">
          
          {/* Top Rank Badge */}
          <div className="absolute top-0 right-0">
            <motion.div 
              animate={rank === 'S' ? { backgroundColor: '#FFD700', color: '#000', boxShadow: '0 0 20px rgba(255,215,0,0.5)' } : { backgroundColor: '#1e293b', color: '#64748b' }}
              className="px-6 py-2 rounded-bl-2xl font-black tracking-widest uppercase text-sm transition-all duration-500"
            >
              Rank: {rank}
            </motion.div>
          </div>

          <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>

          <div className="mb-10 mt-6 text-center">
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase flex items-center justify-center gap-2 mb-2">
              <Activity className="text-blue-500" size={32} />
              AURA <span className="text-blue-500">GATE</span>
            </h1>
            <p className="text-slate-400 font-mono text-sm tracking-widest uppercase">Select your entry method</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3 text-red-400 text-sm">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-6">
            <motion.button
              whileHover={{ boxShadow: "0 0 25px rgba(59,130,246,0.4)", backgroundColor: "rgba(59,130,246,0.1)", borderColor: "rgba(59,130,246,0.5)" }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGoogleLogin}
              className="w-full relative overflow-hidden group border border-slate-700 bg-white/5 rounded-xl py-3.5 px-4 flex items-center justify-center gap-3 transition-all"
            >
              {/* Google G Logo SVG Wrapper */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="font-bold text-white tracking-widest uppercase text-sm">Awaken via Google</span>
            </motion.button>

            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink-0 mx-4 text-slate-500 text-xs font-bold uppercase tracking-widest">Or initiate manual entry</span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-4">
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Hunter Email"
                    className="w-full bg-[#020617] border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>

                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Access Key"
                    className="w-full bg-[#020617] border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl uppercase tracking-widest transition-colors flex justify-center items-center shadow-[0_0_20px_rgba(37,99,235,0.3)] disabled:opacity-50"
              >
                {loading ? 'Initializing...' : 'Enter the Gate'}
              </motion.button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
