/**
 * CivicFlow theme engine.
 *
 * A theme = an accent palette (+ secondary palette) and a light/dark surface set.
 * Everything is applied through CSS variables on <html>, so switching is instant
 * and no component needs to know which theme is active:
 *   - Tailwind's blue / indigo / brand / primary ramps read --accent-* / --accent2-*
 *   - dark surfaces are mapped in theme.css using --surface / --bg / --border / --text*
 */

export type RampName =
  | 'blue' | 'indigo' | 'emerald' | 'violet' | 'rose' | 'amber' | 'cyan' | 'teal' | 'slate';

export const RAMPS: Record<RampName, string[]> = {
  //            50        100       200       300       400       500       600       700       800       900       950
  blue:    ['eff6ff', 'dbeafe', 'bfdbfe', '93c5fd', '60a5fa', '3b82f6', '2563eb', '1d4ed8', '1e40af', '1e3a8a', '172554'],
  indigo:  ['eef2ff', 'e0e7ff', 'c7d2fe', 'a5b4fc', '818cf8', '6366f1', '4f46e5', '4338ca', '3730a3', '312e81', '1e1b4b'],
  emerald: ['ecfdf5', 'd1fae5', 'a7f3d0', '6ee7b7', '34d399', '10b981', '059669', '047857', '065f46', '064e3b', '022c22'],
  violet:  ['f5f3ff', 'ede9fe', 'ddd6fe', 'c4b5fd', 'a78bfa', '8b5cf6', '7c3aed', '6d28d9', '5b21b6', '4c1d95', '2e1065'],
  rose:    ['fff1f2', 'ffe4e6', 'fecdd3', 'fda4af', 'fb7185', 'f43f5e', 'e11d48', 'be123c', '9f1239', '881337', '4c0519'],
  amber:   ['fffbeb', 'fef3c7', 'fde68a', 'fcd34d', 'fbbf24', 'f59e0b', 'd97706', 'b45309', '92400e', '78350f', '451a03'],
  cyan:    ['ecfeff', 'cffafe', 'a5f3fc', '67e8f9', '22d3ee', '06b6d4', '0891b2', '0e7490', '155e75', '164e63', '083344'],
  teal:    ['f0fdfa', 'ccfbf1', '99f6e4', '5eead4', '2dd4bf', '14b8a6', '0d9488', '0f766e', '115e59', '134e4a', '042f2e'],
  slate:   ['f8fafc', 'f1f5f9', 'e2e8f0', 'cbd5e1', '94a3b8', '64748b', '475569', '334155', '1e293b', '0f172a', '020617']
};

export const RAMP_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

export interface Surface {
  bg: string;
  surface: string;
  surface2: string;
  hover: string;
  border: string;
  text: string;
  textMuted: string;
  textDim: string;
}

export interface ThemeDef {
  id: string;
  name: string;
  description: string;
  mode: 'light' | 'dark';
  accent: RampName;
  accent2: RampName;
  surface?: Surface; // dark themes only
}

const midnight: Surface = {
  bg: '#0b1220', surface: '#111a2e', surface2: '#16213a', hover: '#1b2846',
  border: '#24324f', text: '#e6ecf7', textMuted: '#aab6cf', textDim: '#7d8aa6'
};
const forest: Surface = {
  bg: '#07140f', surface: '#0d1f18', surface2: '#112a20', hover: '#163628',
  border: '#1f3d30', text: '#e4f3ec', textMuted: '#a6c4b6', textDim: '#76978a'
};
const aurora: Surface = {
  bg: '#0e0b1a', surface: '#161229', surface2: '#1d1838', hover: '#251f47',
  border: '#31295a', text: '#ece8fa', textMuted: '#b8b0d8', textDim: '#8a82ad'
};
const obsidian: Surface = {
  bg: '#0a0a0b', surface: '#131315', surface2: '#1a1a1d', hover: '#222226',
  border: '#2c2c31', text: '#ededee', textMuted: '#b0b0b6', textDim: '#80808a'
};

export const THEMES: ThemeDef[] = [
  { id: 'royal',    name: 'ملكي',          description: 'الأزرق الرسمي الافتراضي', mode: 'light', accent: 'blue',    accent2: 'indigo' },
  { id: 'emerald',  name: 'زمرّدي',        description: 'أخضر هادئ ومريح للعين',   mode: 'light', accent: 'emerald', accent2: 'teal' },
  { id: 'sunset',   name: 'غروب',          description: 'دفء الكهرماني والوردي',    mode: 'light', accent: 'amber',   accent2: 'rose' },
  { id: 'violet',   name: 'بنفسجي',        description: 'أناقة بنفسجية عصرية',      mode: 'light', accent: 'violet',  accent2: 'indigo' },
  { id: 'ocean',    name: 'محيط',          description: 'تدرجات سماوية منعشة',      mode: 'light', accent: 'cyan',    accent2: 'blue' },
  { id: 'rose',     name: 'وردي',          description: 'لمسة وردية ناعمة',         mode: 'light', accent: 'rose',    accent2: 'violet' },
  { id: 'graphite', name: 'رمادي فحمي',    description: 'مظهر رسمي محايد',          mode: 'light', accent: 'slate',   accent2: 'blue' },
  { id: 'midnight', name: 'منتصف الليل',   description: 'داكن بأزرق عميق',          mode: 'dark',  accent: 'blue',    accent2: 'indigo',  surface: midnight },
  { id: 'forest',   name: 'غابة ليلية',    description: 'داكن بأخضر زمرّدي',        mode: 'dark',  accent: 'emerald', accent2: 'teal',    surface: forest },
  { id: 'aurora',   name: 'شفق',           description: 'داكن ببنفسجي متوهج',       mode: 'dark',  accent: 'violet',  accent2: 'cyan',    surface: aurora },
  { id: 'obsidian', name: 'سبج',           description: 'أسود عميق لشاشات OLED',    mode: 'dark',  accent: 'cyan',    accent2: 'blue',    surface: obsidian }
];

export const SYSTEM_THEME_ID = 'system';
export type FontScale = 'sm' | 'md' | 'lg';
export const FONT_SIZES: Record<FontScale, string> = { sm: '14px', md: '16px', lg: '18px' };

export interface ThemePrefs {
  themeId: string; // a THEMES id or 'system'
  fontScale: FontScale;
  reduceMotion: boolean;
}

export const DEFAULT_PREFS: ThemePrefs = { themeId: 'royal', fontScale: 'md', reduceMotion: false };
export const STORAGE_KEY = 'civicflow_theme_prefs';

export const loadPrefs = (): ThemePrefs => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const p = JSON.parse(raw);
    const validTheme = p.themeId === SYSTEM_THEME_ID || THEMES.some((t) => t.id === p.themeId);
    return {
      themeId: validTheme ? p.themeId : DEFAULT_PREFS.themeId,
      fontScale: ['sm', 'md', 'lg'].includes(p.fontScale) ? p.fontScale : 'md',
      reduceMotion: !!p.reduceMotion
    };
  } catch {
    return DEFAULT_PREFS;
  }
};

export const savePrefs = (prefs: ThemePrefs) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* storage unavailable (private mode) - theme still applies for this session */
  }
};

const prefersDark = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

export const resolveTheme = (themeId: string): ThemeDef => {
  if (themeId === SYSTEM_THEME_ID) {
    return THEMES.find((t) => t.id === (prefersDark() ? 'midnight' : 'royal'))!;
  }
  return THEMES.find((t) => t.id === themeId) || THEMES[0];
};

const rgb = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

export const applyTheme = (prefs: ThemePrefs) => {
  const theme = resolveTheme(prefs.themeId);
  const root = document.documentElement;

  RAMP_STEPS.forEach((step, i) => {
    root.style.setProperty(`--accent-${step}`, rgb(RAMPS[theme.accent][i]));
    root.style.setProperty(`--accent2-${step}`, rgb(RAMPS[theme.accent2][i]));
  });

  const s = theme.surface;
  const vars: Record<string, string | undefined> = {
    '--bg': s?.bg, '--surface': s?.surface, '--surface-2': s?.surface2, '--hover': s?.hover,
    '--border': s?.border, '--text': s?.text, '--text-muted': s?.textMuted, '--text-dim': s?.textDim
  };
  Object.entries(vars).forEach(([k, v]) => (v ? root.style.setProperty(k, v) : root.style.removeProperty(k)));

  root.dataset.mode = theme.mode;
  root.dataset.theme = theme.id;
  root.classList.toggle('dark', theme.mode === 'dark'); // keeps existing dark: utilities working
  root.style.colorScheme = theme.mode;
  root.style.fontSize = FONT_SIZES[prefs.fontScale];
  root.classList.toggle('reduce-motion', prefs.reduceMotion);

  const meta = document.querySelector('meta[name="theme-color"]');
  const color = s?.surface || `#${RAMPS[theme.accent][6]}`;
  if (meta) meta.setAttribute('content', color);
};
