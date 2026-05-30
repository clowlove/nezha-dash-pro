export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  surfaceHover: string;
  card: string;
  cardBorder: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  sidebar: string;
  sidebarActive: string;
  header: string;
  input: string;
  inputBorder: string;
  inputFocus: string;
  button: string;
  buttonHover: string;
  buttonText: string;
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  ring: string;
  shadow: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  author: string;
  colors: ColorScheme;
  isDark: boolean;
  preview: string[];
}

export interface ThemeConfig {
  id: string;
  name: string;
  presetId?: string;
  colors: ColorScheme;
  isDark: boolean;
  customCss?: string;
  createdAt: string;
  updatedAt: string;
}
