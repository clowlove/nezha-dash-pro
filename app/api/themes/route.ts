import { NextRequest, NextResponse } from "next/server";
import { themePresets } from "@/lib/themes/presets";
import { ThemeConfig, ColorScheme } from "@/lib/themes/types";

// GET /api/themes - List all preset themes
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const preset = themePresets.find((t) => t.id === id);
    if (!preset) {
      return NextResponse.json(
        { error: `Theme "${id}" not found` },
        { status: 404 }
      );
    }
    return NextResponse.json({
      id: preset.id,
      name: preset.name,
      description: preset.description,
      author: preset.author,
      isDark: preset.isDark,
      colors: preset.colors,
      preview: preset.preview,
    });
  }

  const themes = themePresets.map((preset) => ({
    id: preset.id,
    name: preset.name,
    description: preset.description,
    author: preset.author,
    isDark: preset.isDark,
    colors: preset.colors,
    preview: preset.preview,
  }));

  return NextResponse.json({ themes, count: themes.length });
}

// POST /api/themes - Create/validate a custom theme
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, colors, isDark } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Theme name is required" },
        { status: 400 }
      );
    }

    if (!colors || typeof colors !== "object") {
      return NextResponse.json(
        { error: "Theme colors object is required" },
        { status: 400 }
      );
    }

    const requiredColors: (keyof ColorScheme)[] = [
      "primary",
      "background",
      "surface",
      "text",
      "success",
      "warning",
      "error",
      "button",
      "buttonText",
    ];

    const missing = requiredColors.filter((key) => !colors[key]);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required colors: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    const hexColorRegex = /^#[0-9a-fA-F]{3,8}$/;
    const invalidColors = Object.entries(colors)
      .filter(([, val]) => typeof val === "string" && !hexColorRegex.test(val as string))
      .map(([key]) => key);

    if (invalidColors.length > 0) {
      return NextResponse.json(
        { error: `Invalid hex colors: ${invalidColors.join(", ")}` },
        { status: 400 }
      );
    }

    const customTheme: ThemeConfig = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      colors: colors as ColorScheme,
      isDark: Boolean(isDark),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(
      { theme: customTheme, message: "Theme created successfully" },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }
}
