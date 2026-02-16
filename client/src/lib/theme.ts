export type ThemeMode = "light" | "dark";

export type UserThemePreference = {
  /** true = ใช้ธีมส่วนตัว, false = ใช้ธีมร้าน/ค่าเริ่มต้น */
  enabled: boolean;
  /** primaryColor แบบ #RRGGBB */
  primaryColor?: string;
  themeMode?: ThemeMode;
};

const USER_THEME_KEY = "ordera:userTheme";
export const THEME_CHANGED_EVENT = "ordera-theme-changed";

export function isHexColor(v: string): boolean {
  return /^#([0-9a-fA-F]{6})$/.test((v || "").trim());
}

export function readUserThemePreference(): UserThemePreference | null {
  try {
    const raw = localStorage.getItem(USER_THEME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserThemePreference>;
    if (typeof parsed !== "object" || parsed == null) return null;
    const enabled = Boolean(parsed.enabled);
    const primaryColor = typeof parsed.primaryColor === "string" ? parsed.primaryColor.trim() : undefined;
    const themeMode =
      parsed.themeMode === "light" || parsed.themeMode === "dark"
        ? parsed.themeMode
        : undefined;
    return {
      enabled,
      primaryColor: primaryColor && isHexColor(primaryColor) ? primaryColor : undefined,
      themeMode,
    };
  } catch {
    return null;
  }
}

export function writeUserThemePreference(pref: UserThemePreference | null) {
  if (!pref) {
    localStorage.removeItem(USER_THEME_KEY);
  } else {
    localStorage.setItem(USER_THEME_KEY, JSON.stringify(pref));
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(THEME_CHANGED_EVENT));
  }
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "").trim();
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (x: number) => x.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rn:
        h = ((gn - bn) / d) % 6;
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

/** ปรับความสว่างด้วย HSL (deltaL: -1..+1) */
export function shiftLightness(hex: string, deltaL: number) {
  if (!isHexColor(hex)) return hex;
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const nl = clamp01(l + deltaL);
  const out = hslToRgb(h, s, nl);
  return rgbToHex(out.r, out.g, out.b);
}

export type ThemeCssVars = {
  primary: string;
  primaryFg: string;
  product: string;
  ring: string;
  sidebar: string;
  sidebarAccent: string;
  sidebarBorder: string;
  sidebarRing: string;
  chart1: string;
};

export function deriveThemeVars(primaryColor: string): ThemeCssVars {
  const primary = primaryColor;
  const primaryFg = "#ffffff";
  // accent/border = เข้มลงนิดหน่อยเพื่อให้ hover/เส้นขอบชัด
  const sidebarAccent = shiftLightness(primary, -0.18);
  const sidebarBorder = shiftLightness(primary, -0.22);
  return {
    primary,
    primaryFg,
    product: primary,
    ring: primary,
    sidebar: primary,
    sidebarAccent,
    sidebarBorder,
    sidebarRing: primary,
    chart1: primary,
  };
}

const OVERRIDABLE_VARS = [
  "--primary",
  "--primary-foreground",
  "--product",
  "--ring",
  "--sidebar",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--sidebar-accent",
  "--sidebar-accent-foreground",
  "--sidebar-border",
  "--sidebar-ring",
  "--chart-1",
] as const;

/** Apply/clear inline CSS variables for theme colors */
export function applyThemePrimaryColor(primaryColor: string | null | undefined) {
  const root = document.documentElement;

  if (!primaryColor || !isHexColor(primaryColor)) {
    for (const k of OVERRIDABLE_VARS) root.style.removeProperty(k);
    return;
  }

  const v = deriveThemeVars(primaryColor);
  root.style.setProperty("--primary", v.primary);
  root.style.setProperty("--primary-foreground", v.primaryFg);
  root.style.setProperty("--product", v.product);
  root.style.setProperty("--ring", v.ring);
  root.style.setProperty("--sidebar", v.sidebar);
  root.style.setProperty("--sidebar-primary", v.primary);
  root.style.setProperty("--sidebar-primary-foreground", v.primaryFg);
  root.style.setProperty("--sidebar-accent", v.sidebarAccent);
  root.style.setProperty("--sidebar-accent-foreground", v.primaryFg);
  root.style.setProperty("--sidebar-border", v.sidebarBorder);
  root.style.setProperty("--sidebar-ring", v.sidebarRing);
  root.style.setProperty("--chart-1", v.chart1);
}

