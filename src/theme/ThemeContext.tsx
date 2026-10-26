import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ThemePrefs, FontScale, applyTheme, loadPrefs, savePrefs, resolveTheme, SYSTEM_THEME_ID, ThemeDef
} from './themes';

interface ThemeContextValue {
  prefs: ThemePrefs;
  active: ThemeDef;
  setTheme: (id: string) => void;
  setFontScale: (s: FontScale) => void;
  setReduceMotion: (v: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prefs, setPrefs] = useState<ThemePrefs>(() => loadPrefs());
  const [, forceTick] = useState(0);

  useEffect(() => {
    applyTheme(prefs);
    savePrefs(prefs);
  }, [prefs]);

  // Follow the OS setting live while "system" is selected
  useEffect(() => {
    if (prefs.themeId !== SYSTEM_THEME_ID || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      applyTheme(prefs);
      forceTick((n) => n + 1);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [prefs]);

  // Keep several open tabs in sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'civicflow_theme_prefs') setPrefs(loadPrefs());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setTheme = useCallback((themeId: string) => setPrefs((p) => ({ ...p, themeId })), []);
  const setFontScale = useCallback((fontScale: FontScale) => setPrefs((p) => ({ ...p, fontScale })), []);
  const setReduceMotion = useCallback((reduceMotion: boolean) => setPrefs((p) => ({ ...p, reduceMotion })), []);

  const value = useMemo<ThemeContextValue>(
    () => ({ prefs, active: resolveTheme(prefs.themeId), setTheme, setFontScale, setReduceMotion }),
    [prefs, setTheme, setFontScale, setReduceMotion]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
