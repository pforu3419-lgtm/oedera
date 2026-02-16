import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  isHexColor,
  readUserThemePreference,
  type ThemeMode,
  type ForegroundMode,
  type UserThemePreference,
  writeUserThemePreference,
} from "@/lib/theme";
import { ArrowLeft, Palette } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function ThemeSettingsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: storeSettings } = trpc.storeSettings.get.useQuery(undefined, {
    enabled: !!user?.storeId,
  });

  const storeDefaultColor = (storeSettings?.primaryColor || "").trim();
  const storeDefaultMode = (storeSettings?.themeMode || "").trim() as ThemeMode | "";

  const initialPref = useMemo<UserThemePreference>(() => {
    return (
      readUserThemePreference() ?? {
        enabled: false,
        primaryColor: undefined,
        themeMode: undefined,
        foregroundMode: "auto",
      }
    );
  }, []);

  const [pref, setPref] = useState<UserThemePreference>(initialPref);

  const effectiveColor = pref.enabled
    ? (pref.primaryColor || "").trim()
    : isHexColor(storeDefaultColor)
      ? storeDefaultColor
      : "";

  const effectiveMode: ThemeMode =
    pref.enabled && pref.themeMode
      ? pref.themeMode
      : storeDefaultMode === "dark" || storeDefaultMode === "light"
        ? storeDefaultMode
        : "light";

  const save = () => {
    if (pref.enabled) {
      const c = (pref.primaryColor || "").trim();
      if (c && !isHexColor(c)) {
        toast.error("รูปแบบสีต้องเป็น #RRGGBB");
        return;
      }
    }
    writeUserThemePreference(pref);
    toast.success("บันทึกธีมส่วนตัวแล้ว");
  };

  const reset = () => {
    const cleared: UserThemePreference = { enabled: false };
    setPref(cleared);
    writeUserThemePreference(cleared);
    toast.message("กลับไปใช้ธีมร้าน/ค่าเริ่มต้นแล้ว");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setLocation("/")} className="shrink-0 gap-2">
            <ArrowLeft className="h-4 w-4" />
            ย้อนกลับ
          </Button>
          <div className="min-w-0">
            <h1 className="text-3xl font-bold truncate">ธีมสี</h1>
            <p className="text-muted-foreground">
              ตั้งค่า “ธีมส่วนตัว” ได้อิสระ (ไม่กระทบ logic POS) และยังมีธีมเริ่มต้นจากร้าน
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              ธีมส่วนตัว
            </CardTitle>
            <CardDescription>
              ถ้าเปิดใช้งาน จะ override สี/โหมดเฉพาะเครื่องนี้ (เก็บในเบราว์เซอร์)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="font-medium">เปิดใช้ธีมส่วนตัว</div>
                <div className="text-xs text-muted-foreground">
                  ปิด = ใช้ธีมร้าน (ถ้ามี) หรือค่าเริ่มต้นของระบบ
                </div>
              </div>
              <Button
                variant={pref.enabled ? "default" : "outline"}
                onClick={() => setPref((s) => ({ ...s, enabled: !s.enabled }))}
              >
                {pref.enabled ? "เปิดอยู่" : "ปิดอยู่"}
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">สีหลัก</Label>
                <Input
                  id="primaryColor"
                  value={pref.primaryColor ?? ""}
                  onChange={(e) => setPref((s) => ({ ...s, primaryColor: e.target.value }))}
                  placeholder={isHexColor(storeDefaultColor) ? storeDefaultColor : "#f97316"}
                  disabled={!pref.enabled}
                />
                <div className="flex items-center gap-3 pt-1">
                  <div
                    className="h-9 w-9 rounded border bg-white"
                    style={{ backgroundColor: isHexColor(effectiveColor) ? effectiveColor : "#f97316" }}
                    title={effectiveColor || "#f97316"}
                  />
                  <Input
                    type="color"
                    value={isHexColor(pref.primaryColor || "") ? (pref.primaryColor as string) : "#f97316"}
                    onChange={(e) => setPref((s) => ({ ...s, primaryColor: e.target.value }))}
                    className="h-9 w-14 p-1"
                    aria-label="เลือกสี"
                    disabled={!pref.enabled}
                  />
                  <span className="text-xs text-muted-foreground font-mono">
                    {effectiveColor || "#f97316"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  แนะนำใส่เป็น <span className="font-mono">#RRGGBB</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="themeMode">โหมด</Label>
                <Select
                  value={pref.themeMode ?? ""}
                  onValueChange={(v) =>
                    setPref((s) => ({ ...s, themeMode: (v || undefined) as ThemeMode | undefined }))
                  }
                  disabled={!pref.enabled}
                >
                  <SelectTrigger id="themeMode">
                    <SelectValue placeholder={effectiveMode} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  ถ้าไม่เลือก จะใช้ค่าเริ่มต้นจากร้าน/ระบบ
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>สีตัวหนังสือ/ไอคอน (บนพื้นหลังสีธีม)</Label>
              <div className="flex flex-wrap gap-2">
                {(["auto", "white", "black"] as const).map((mode) => {
                  const active = (pref.foregroundMode ?? "auto") === mode;
                  const label = mode === "auto" ? "ระบบจัดการให้" : mode === "white" ? "ขาว" : "ดำ";
                  return (
                    <Button
                      key={mode}
                      type="button"
                      variant={active ? "default" : "outline"}
                      onClick={() => setPref((s) => ({ ...s, foregroundMode: mode as ForegroundMode }))}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                เลือกได้ 3 แบบ: ระบบจัดการให้ / บังคับขาว / บังคับดำ
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="outline" onClick={reset}>
                ใช้ค่าเริ่มต้น
              </Button>
              <Button onClick={save}>บันทึก</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>ธีมที่ใช้งานอยู่ตอนนี้</CardTitle>
            <CardDescription>คำนวณจาก (ธีมส่วนตัว) → (ธีมร้าน) → (ค่าเริ่มต้น)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">โหมด</span>
              <span className="font-mono">{effectiveMode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">สีหลัก</span>
              <span className="font-mono">{isHexColor(effectiveColor) ? effectiveColor : "#f97316"}</span>
            </div>
            {!!user?.storeId && isHexColor(storeDefaultColor) && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">ค่าเริ่มต้นร้าน</span>
                <span className="font-mono">{storeDefaultColor}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

