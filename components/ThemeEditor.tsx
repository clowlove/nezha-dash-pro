"use client";

import React, { useState } from "react";
import { ColorScheme, ThemeConfig } from "@/lib/themes/types";
import { saveTheme, createCustomTheme } from "@/lib/themes/theme-engine";

interface ThemeEditorProps {
  baseTheme?: ThemeConfig;
  onSave?: (theme: ThemeConfig) => void;
}

const COLOR_FIELDS: { key: keyof ColorScheme; label: string }[] = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "accent", label: "Accent" },
  { key: "background", label: "Background" },
  { key: "surface", label: "Surface" },
  { key: "text", label: "Text" },
  { key: "textSecondary", label: "Text Secondary" },
  { key: "success", label: "Success" },
  { key: "warning", label: "Warning" },
  { key: "error", label: "Error" },
  { key: "info", label: "Info" },
  { key: "sidebar", label: "Sidebar" },
  { key: "card", label: "Card" },
  { key: "cardBorder", label: "Card Border" },
  { key: "button", label: "Button" },
  { key: "buttonHover", label: "Button Hover" },
  { key: "buttonText", label: "Button Text" },
  { key: "input", label: "Input" },
  { key: "inputBorder", label: "Input Border" },
];

export function ThemeEditor({ baseTheme, onSave }: ThemeEditorProps) {
  const [themeName, setThemeName] = useState(baseTheme?.name ?? "My Custom Theme");
  const [isDark, setIsDark] = useState(baseTheme?.isDark ?? true);
  const [colors, setColors] = useState<ColorScheme>(
    baseTheme?.colors ?? {
      primary: "#3b82f6",
      secondary: "#8b5cf6",
      accent: "#06b6d4",
      background: "#0f172a",
      surface: "#1e293b",
      surfaceHover: "#334155",
      card: "#1e293b",
      cardBorder: "#334155",
      text: "#f8fafc",
      textSecondary: "#94a3b8",
      textMuted: "#64748b",
      success: "#22c55e",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#3b82f6",
      sidebar: "#0f172a",
      sidebarActive: "#1e40af",
      header: "#1e293b",
      input: "#0f172a",
      inputBorder: "#334155",
      inputFocus: "#3b82f6",
      button: "#3b82f6",
      buttonHover: "#2563eb",
      buttonText: "#ffffff",
      chart1: "#3b82f6",
      chart2: "#8b5cf6",
      chart3: "#06b6d4",
      chart4: "#22c55e",
      chart5: "#f59e0b",
      ring: "#3b82f680",
      shadow: "0 4px 6px -1px #00000033",
    }
  );

  const handleColorChange = (key: keyof ColorScheme, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const theme = createCustomTheme(themeName, colors, isDark);
    saveTheme(theme);
    onSave?.(theme);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Theme Name
          </label>
          <input
            type="text"
            value={themeName}
            onChange={(e) => setThemeName(e.target.value)}
            className="w-full rounded-lg border border-input-border bg-input px-3 py-2 text-text focus:border-input-focus focus:ring-2 focus:ring-ring focus:outline-none"
            placeholder="My Custom Theme"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-text-secondary">
            Color Mode
          </label>
          <button
            onClick={() => setIsDark(!isDark)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isDark ? "bg-primary" : "bg-text-muted"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isDark ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span className="text-sm text-text-muted">
            {isDark ? "Dark" : "Light"}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-text">Colors</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {COLOR_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <input
                type="color"
                value={colors[key] as string}
                onChange={(e) => handleColorChange(key, e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border border-card-border"
              />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-text-secondary">{label}</span>
                <input
                  type="text"
                  value={colors[key] as string}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="w-full text-xs bg-transparent border-b border-card-border text-text-muted focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-lg bg-button text-button-text hover:bg-button-hover transition-colors font-medium"
        >
          Save Theme
        </button>
      </div>
    </div>
  );
}
