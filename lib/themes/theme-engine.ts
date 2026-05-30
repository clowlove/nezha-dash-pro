import { ThemeConfig, ColorScheme, ThemePreset } from "./types";
import { themePresets, getPresetById } from "./presets";

const STORAGE_KEY = "nezha-theme";
const CUSTOM_THEMES_KEY = "nezha-custom-themes";

function colorSchemeToCSSVars(colors: ColorScheme): Record<string, string> {
  return {
    "--color-primary": colors.primary,
    "--color-secondary": colors.secondary,
    "--color-accent": colors.accent,
    "--color-background": colors.background,
    "--color-surface": colors.surface,
    "--color-surface-hover": colors.surfaceHover,
    "--color-card": colors.card,
    "--color-card-border": colors.cardBorder,
    "--color-text": colors.text,
    "--color-text-secondary": colors.textSecondary,
    "--color-text-muted": colors.textMuted,
    "--color-success": colors.success,
    "--color-warning": colors.warning,
    "--color-error": colors.error,
    "--color-info": colors.info,
    "--color-sidebar": colors.sidebar,
    "--color-sidebar-active": colors.sidebarActive,
    "--color-header": colors.header,
    "--color-input": colors.input,
    "--color-input-border": colors.inputBorder,
    "--color-input-focus": colors.inputFocus,
    "--color-button": colors.button,
    "--color-button-hover": colors.buttonHover,
    "--color-button-text": colors.buttonText,
    "--color-chart-1": colors.chart1,
    "--color-chart-2": colors.chart2,
    "--color-chart-3": colors.chart3,
    "--color-chart-4": colors.chart4,
    "--color-chart-5": colors.chart5,
    "--color-ring": colors.ring,
    "--shadow": colors.shadow,
  };
}

export function applyTheme(theme: ThemeConfig): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const vars = colorSchemeToCSSVars(theme.colors);

  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  root.classList.toggle("dark", theme.isDark);
  root.setAttribute("data-theme", theme.id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
}

export function getTheme(): ThemeConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function saveTheme(theme: ThemeConfig): void {
  if (typeof window === "undefined") return;
  const existing = getCustomThemes();
  const idx = existing.findIndex((t) => t.id === theme.id);
  if (idx >= 0) {
    existing[idx] = { ...theme, updatedAt: new Date().toISOString() };
  } else {
    existing.push({
      ...theme,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(existing));
  applyTheme(theme);
}

export function loadTheme(themeId: string): ThemeConfig | null {
  const preset = getPresetById(themeId);
  if (preset) {
    return {
      id: preset.id,
      name: preset.name,
      presetId: preset.id,
      colors: preset.colors,
      isDark: preset.isDark,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  const custom = getCustomThemes().find((t) => t.id === themeId);
  return custom ?? null;
}

export function listThemes(): ThemeConfig[] {
  return [
    ...themePresets.map((p) => ({
      id: p.id,
      name: p.name,
      presetId: p.id,
      colors: p.colors,
      isDark: p.isDark,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    ...getCustomThemes(),
  ];
}

function getCustomThemes(): ThemeConfig[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(CUSTOM_THEMES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function deleteTheme(themeId: string): boolean {
  if (typeof window === "undefined") return false;
  const existing = getCustomThemes();
  const filtered = existing.filter((t) => t.id !== themeId);
  if (filtered.length === existing.length) return false;
  localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(filtered));
  return true;
}

export function createCustomTheme(
  name: string,
  colors: ColorScheme,
  isDark: boolean
): ThemeConfig {
  return {
    id: `custom-${Date.now()}`,
    name,
    colors,
    isDark,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
