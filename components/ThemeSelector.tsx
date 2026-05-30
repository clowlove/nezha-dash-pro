"use client";

import React, { useState, useEffect } from "react";
import { ThemeConfig } from "@/lib/themes/types";
import { applyTheme, listThemes, loadTheme, saveTheme } from "@/lib/themes/theme-engine";

interface ThemeSelectorProps {
  onThemeChange?: (theme: ThemeConfig) => void;
}

export function ThemeSelector({ onThemeChange }: ThemeSelectorProps) {
  const [themes, setThemes] = useState<ThemeConfig[]>([]);
  const [activeThemeId, setActiveThemeId] = useState<string>("");

  useEffect(() => {
    const allThemes = listThemes();
    setThemes(allThemes);
    const stored = localStorage.getItem("nezha-theme");
    if (stored) {
      try {
        const current: ThemeConfig = JSON.parse(stored);
        setActiveThemeId(current.id);
      } catch {
        setActiveThemeId("dark-pro");
      }
    } else {
      setActiveThemeId("dark-pro");
    }
  }, []);

  const handleSelectTheme = (themeId: string) => {
    const theme = loadTheme(themeId);
    if (theme) {
      applyTheme(theme);
      setActiveThemeId(themeId);
      onThemeChange?.(theme);
    }
  };

  const isLightTheme = (theme: ThemeConfig) => !theme.isDark;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text">Theme</h3>
        <span className="text-sm text-text-muted">
          {themes.length} themes available
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {themes.map((theme) => {
          const isActive = theme.id === activeThemeId;
          return (
            <button
              key={theme.id}
              onClick={() => handleSelectTheme(theme.id)}
              className={`group relative rounded-xl border-2 p-3 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring ${
                isActive
                  ? "border-primary shadow-lg"
                  : "border-card-border hover:border-text-muted"
              }`}
              style={{ backgroundColor: theme.colors.surface }}
              aria-label={`Select ${theme.name} theme`}
            >
              {isActive && (
                <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <svg className="w-3 h-3 text-button-text" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}

              <div className="flex gap-1 mb-2">
                {[theme.colors.primary, theme.colors.secondary, theme.colors.accent, theme.colors.success, theme.colors.error].map((color, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-full border border-black/10"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              <div
                className="h-8 rounded-md mb-2 flex items-center justify-center text-xs font-medium"
                style={{
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  border: `1px solid ${theme.colors.cardBorder}`,
                }}
              >
                Aa Bb
              </div>

              <p
                className="text-xs font-medium truncate"
                style={{ color: theme.colors.text }}
              >
                {theme.name}
              </p>
              <p
                className="text-[10px] truncate mt-0.5"
                style={{ color: theme.colors.textMuted }}
              >
                {theme.isDark ? "Dark" : "Light"}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
