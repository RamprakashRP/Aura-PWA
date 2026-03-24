import React, { createContext, useContext, useEffect, useState } from 'react';

export type AuraType = 'Berserker Red' | 'Void Black' | 'Hunter Green' | 'Super Saiyan Gold' | 'Ultra Instinct Silver' | 'Demon Slayer Blue' | 'Hollow Purple';

interface ThemeContextType {
  aura: AuraType;
  setAura: (aura: AuraType) => void;
  getAuraColor: () => string;
  getAuraGlow: () => string;
}

const ThemeContext = createContext<ThemeContextType>({
  aura: 'Demon Slayer Blue',
  setAura: () => {},
  getAuraColor: () => '#38bdf8',
  getAuraGlow: () => '0 0 20px #38bdf880',
});

const AURA_PALETTE: Record<AuraType, { primary: string, glow: string }> = {
  'Berserker Red': { primary: '#FF0000', glow: '0 0 25px #FF4D4D' },
  'Void Black': { primary: '#1A1A1A', glow: '0 0 20px #4A4A4A' },
  'Hunter Green': { primary: '#00FF41', glow: '0 0 22px #39FF14' },
  'Super Saiyan Gold': { primary: '#FFD700', glow: '0 0 30px #FFFF00' },
  'Ultra Instinct Silver': { primary: '#E6E6FA', glow: '0 0 20px #ADD8E6' },
  'Demon Slayer Blue': { primary: '#38bdf8', glow: '0 0 20px #38bdf880' },
  'Hollow Purple': { primary: '#9333ea', glow: '0 0 20px #9333ea80' }
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [aura, setAura] = useState<AuraType>(() => {
    const saved = localStorage.getItem('aura_preference');
    return (saved as AuraType) || 'Demon Slayer Blue';
  });

  useEffect(() => {
    localStorage.setItem('aura_preference', aura);
    // Expose explicitly for Tailwind and generic inline styles
    document.documentElement.style.setProperty('--aura-color', AURA_PALETTE[aura].primary);
    document.documentElement.style.setProperty('--aura-glow', AURA_PALETTE[aura].glow);
    document.documentElement.style.setProperty('--color-brand-neon', AURA_PALETTE[aura].primary);
  }, [aura]);

  const getAuraColor = () => AURA_PALETTE[aura].primary;
  const getAuraGlow = () => AURA_PALETTE[aura].glow;

  return (
    <ThemeContext.Provider value={{ aura, setAura, getAuraColor, getAuraGlow }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
