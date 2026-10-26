import React, { useEffect, useRef, useState } from 'react';
import { Palette, Check, Monitor, Type, Zap } from 'lucide-react';
import { useTheme } from '../../theme/ThemeContext';
import { THEMES, RAMPS, SYSTEM_THEME_ID, FontScale, ThemeDef } from '../../theme/themes';

const Swatch: React.FC<{ theme: ThemeDef }> = ({ theme }) => {
  const dark = theme.mode === 'dark';
  const bg = dark ? theme.surface!.bg : '#f8fafc';
  const card = dark ? theme.surface!.surface : '#ffffff';
  const a = `#${RAMPS[theme.accent][6]}`;
  const b = `#${RAMPS[theme.accent2][5]}`;
  return (
    <div className="h-12 rounded-lg overflow-hidden border border-black/10 flex" style={{ background: bg }}>
      <div className="w-4" style={{ background: card }} />
      <div className="flex-1 p-1.5 flex flex-col gap-1">
        <div className="h-2 rounded-sm" style={{ background: a, width: '70%' }} />
        <div className="h-2 rounded-sm" style={{ background: b, width: '45%' }} />
        <div className="h-2 rounded-sm" style={{ background: card, width: '85%' }} />
      </div>
    </div>
  );
};

interface Props {
  /** floating = fixed corner button (public pages), inline = header button */
  variant?: 'inline' | 'floating';
}

export const ThemeSwitcher: React.FC<Props> = ({ variant = 'inline' }) => {
  const { prefs, active, setTheme, setFontScale, setReduceMotion } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const fonts: { id: FontScale; label: string }[] = [
    { id: 'sm', label: 'صغير' },
    { id: 'md', label: 'متوسط' },
    { id: 'lg', label: 'كبير' }
  ];

  const wrapper =
    variant === 'floating' ? 'fixed bottom-4 left-4 z-40 print:hidden' : 'relative print:hidden';
  const popover =
    variant === 'floating'
      ? 'absolute bottom-full left-0 mb-2'
      : 'absolute left-0 mt-2';

  return (
    <div className={wrapper} ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="المظهر والثيمات"
        aria-label="تغيير المظهر"
        aria-expanded={open}
        className={
          variant === 'floating'
            ? 'p-3 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition'
            : 'p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition'
        }
      >
        <Palette className="w-5 h-5" />
      </button>

      {open && (
        <div
          className={`${popover} w-[19rem] sm:w-[22rem] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50 text-right`}
          role="dialog"
          aria-label="اختيار الثيم"
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-sm text-slate-800">المظهر والثيمات</h4>
            <span className="text-[11px] text-slate-500">{active.name}</span>
          </div>

          <button
            onClick={() => setTheme(SYSTEM_THEME_ID)}
            className={`w-full flex items-center gap-2 px-3 py-2 mb-3 rounded-xl border text-xs font-semibold transition ${
              prefs.themeId === SYSTEM_THEME_ID
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span className="flex-1 text-right">تلقائي (حسب إعدادات الجهاز)</span>
            {prefs.themeId === SYSTEM_THEME_ID && <Check className="w-4 h-4" />}
          </button>

          <div className="grid grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-0.5">
            {THEMES.map((t) => {
              const selected = prefs.themeId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`text-right p-2 rounded-xl border-2 transition ${
                    selected ? 'border-blue-500 bg-blue-50' : 'border-transparent bg-slate-50 hover:border-slate-200'
                  }`}
                >
                  <Swatch theme={t} />
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs font-bold text-slate-800">{t.name}</span>
                    {selected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">{t.description}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
                <Type className="w-3.5 h-3.5" /> حجم الخط
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {fonts.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFontScale(f.id)}
                    className={`py-1.5 rounded-lg text-xs font-semibold border transition ${
                      prefs.fontScale === f.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> تقليل الحركة والانتقالات
              </span>
              <input
                type="checkbox"
                checked={prefs.reduceMotion}
                onChange={(e) => setReduceMotion(e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
