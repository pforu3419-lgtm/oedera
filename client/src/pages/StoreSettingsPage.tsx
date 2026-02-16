import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Store, Palette } from "lucide-react";
import { useLocation } from "wouter";
import {
  readUserThemePreference,
  type ForegroundMode,
  type UserThemePreference,
  writeUserThemePreference,
} from "@/lib/theme";

type ThemeMode = "light" | "dark";

export default function StoreSettingsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const SYSTEM_DEFAULT_ORANGE = "#ea580c";
  const MAX_LOGO_URL_LEN = 200000;
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [userThemePref, setUserThemePref] = useState<UserThemePreference>(() => {
    return (
      readUserThemePreference() ?? {
        enabled: false,
        foregroundMode: "auto",
      }
    );
  });

  const enabled = !!user?.storeId;
  const { data, isLoading, refetch } = trpc.storeSettings.get.useQuery(undefined, {
    enabled,
  });
  const updateMutation = trpc.storeSettings.update.useMutation({
    onSuccess: async () => {
      toast.success("บันทึกตั้งค่าร้านสำเร็จ");
      await refetch();
    },
    onError: (e) => toast.error(e.message || "บันทึกไม่สำเร็จ"),
  });

  const initial = useMemo(() => {
    return {
      storeName: data?.storeName ?? "",
      logoUrl: data?.logoUrl ?? "",
      primaryColor: data?.primaryColor ?? "#f97316",
      address: data?.address ?? "",
      phone: data?.phone ?? "",
      themeMode: (data?.themeMode ?? "light") as ThemeMode,
    };
  }, [data]);

  const [form, setForm] = useState(initial);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  const logoPreview = (form.logoUrl || "").trim() || "/ordera-logo-white.svg";
  const primary = (form.primaryColor || "").trim() || "#f97316";
  const previewStoreName = (form.storeName || "").trim() || "ชื่อร้าน";

  const uploadLogoFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("กรุณาเลือกไฟล์รูปภาพ (PNG/JPG/WebP)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("ไฟล์ใหญ่เกินไป (สูงสุด 10MB)");
      return;
    }

    try {
      setUploadingLogo(true);
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        throw new Error(json?.error || `Upload failed (${res.status})`);
      }
      const url = (json?.url || "").trim();
      if (!url) throw new Error("อัปโหลดไม่สำเร็จ (ไม่ได้รับ URL)");
      if (url.length > MAX_LOGO_URL_LEN) {
        // มักเป็น data URL (base64) ที่ยาวมาก
        throw new Error("รูปใหญ่เกินไป กรุณาใช้รูปไฟล์เล็กลง หรือใช้ลิงก์รูป (URL)");
      }
      setForm((s) => ({ ...s, logoUrl: url }));
      toast.success("อัปโหลดโลโก้สำเร็จ");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/settings")}
            className="shrink-0 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            ย้อนกลับ
          </Button>
          <div className="min-w-0">
            <h1 className="text-3xl font-bold truncate">ตั้งค่าร้าน</h1>
            <p className="text-muted-foreground">
              ตั้งค่าชื่อร้าน โลโก้ ที่อยู่ เบอร์โทร และโหมดธีม (ไม่กระทบ logic POS เดิม)
            </p>
          </div>
        </div>

        {!enabled ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                ยังไม่ได้เชื่อมต่อร้าน
              </CardTitle>
              <CardDescription>กรุณาเชื่อมต่อร้านก่อน จึงจะตั้งค่าร้านได้</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setLocation("/signup-store")}>สมัครร้าน</Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลร้าน</CardTitle>
              <CardDescription>
                Store ID: <span className="font-mono">{user?.storeId ?? "-"}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading ? (
                <div className="text-muted-foreground">กำลังโหลด...</div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="storeName">ชื่อร้าน</Label>
                      <Input
                        id="storeName"
                        value={form.storeName}
                        onChange={(e) => setForm((s) => ({ ...s, storeName: e.target.value }))}
                        placeholder="เช่น ร้านของฉัน"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">เบอร์โทร</Label>
                      <Input
                        id="phone"
                        value={form.phone}
                        onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                        placeholder="เช่น 08x-xxx-xxxx"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">ที่อยู่</Label>
                    <Input
                      id="address"
                      value={form.address}
                      onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
                      placeholder="ที่อยู่ร้าน"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="logoUrl">โลโก้</Label>
                      <div className="flex flex-col gap-2">
                        <Input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          disabled={uploadingLogo}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            void uploadLogoFile(f);
                            // reset input so same file can be re-selected
                            e.currentTarget.value = "";
                          }}
                        />
                        <div className="text-xs text-muted-foreground">
                          เลือกไฟล์ PNG/JPG/WebP ได้ (ระบบจะอัปโหลดและใส่ให้เป็นรูปเลย)
                        </div>
                      </div>
                      <Label htmlFor="logoUrl" className="mt-2 block">
                        หรือใส่ลิงก์รูป (URL / data URL)
                      </Label>
                      <Input
                        id="logoUrl"
                        value={form.logoUrl}
                        onChange={(e) => setForm((s) => ({ ...s, logoUrl: e.target.value }))}
                        placeholder="เช่น https://... หรือ data:image/png;base64,..."
                        disabled={uploadingLogo}
                      />
                      <div className="mt-3 rounded-lg border bg-sidebar p-4">
                        <div className="text-xs text-sidebar-foreground/80 mb-2">พรีวิวโลโก้</div>
                        <img
                          src={logoPreview}
                          alt="Store logo preview"
                          className="h-12 w-12 rounded bg-white object-contain"
                          onError={(e) => {
                            e.currentTarget.src = "/ordera-logo-white.svg";
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="themeMode">โหมดธีม</Label>
                      <Select
                        value={form.themeMode}
                        onValueChange={(v) => setForm((s) => ({ ...s, themeMode: v as ThemeMode }))}
                      >
                        <SelectTrigger id="themeMode">
                          <SelectValue placeholder="เลือกโหมด" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        หมายเหตุ: เก็บค่าไว้ระดับร้าน (ยังไม่ผูกกับการเปลี่ยนธีมทั้งระบบ เพื่อไม่กระทบระบบเดิม)
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="primaryColor">สีหลัก (primaryColor)</Label>
                      <Input
                        id="primaryColor"
                        value={form.primaryColor}
                        onChange={(e) => setForm((s) => ({ ...s, primaryColor: e.target.value }))}
                        placeholder="#f97316"
                      />
                      <div className="flex items-center gap-3 pt-1">
                        <div
                          className="h-9 w-9 rounded border bg-white"
                          style={{ backgroundColor: primary }}
                          title={primary}
                        />
                        <Input
                          type="color"
                          value={/^#([0-9a-fA-F]{6})$/.test(primary) ? primary : "#f97316"}
                          onChange={(e) => setForm((s) => ({ ...s, primaryColor: e.target.value }))}
                          className="h-9 w-14 p-1"
                          aria-label="เลือกสี"
                        />
                        <span className="text-xs text-muted-foreground font-mono">{primary}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ค่าเริ่มต้นคือ <span className="font-mono">#f97316</span> และระบบหลักยังคงโทนส้มเดิม (สีนี้ใช้สำหรับ “แบรนด์ร้าน/พรีวิว” เท่านั้น)
                      </p>
                    </div>
                  </div>

                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle>พรีวิว (ไม่กระทบ POS เดิม)</CardTitle>
                      <CardDescription>ดูสีและโลโก้ของร้านที่ตั้งค่าไว้</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-xl border bg-sidebar p-4 text-sidebar-foreground">
                        <div className="flex items-center gap-3">
                          <img
                            src={logoPreview}
                            alt="Preview logo"
                            className="h-10 w-10 rounded bg-white object-contain"
                            onError={(e) => {
                              e.currentTarget.src = "/ordera-logo-white.svg";
                            }}
                          />
                          <div className="min-w-0">
                            <div className="font-bold truncate" style={{ color: primary }}>
                              {previewStoreName}
                            </div>
                            <div className="text-xs text-sidebar-foreground/80 truncate">
                              สีแบรนด์ร้าน: <span className="font-mono">{primary}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Palette className="h-5 w-5" />
                        สีตัวหนังสือ/ไอคอน
                      </CardTitle>
                      <CardDescription>
                        ตั้งค่าความอ่านง่าย (มีผลกับเครื่องนี้เท่านั้น) เลือกได้ 3 แบบ: ระบบจัดการให้ / บังคับขาว / บังคับดำ
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {(["auto", "white", "black"] as const).map((mode) => {
                          const active = (userThemePref.foregroundMode ?? "auto") === mode;
                          const label =
                            mode === "auto" ? "ระบบจัดการให้" : mode === "white" ? "ขาว" : "ดำ";
                          return (
                            <Button
                              key={mode}
                              type="button"
                              variant={active ? "default" : "outline"}
                              onClick={() => {
                                const next: UserThemePreference = {
                                  ...userThemePref,
                                  enabled: Boolean(userThemePref.enabled),
                                  foregroundMode: mode as ForegroundMode,
                                };
                                setUserThemePref(next);
                                writeUserThemePreference(next);
                                toast.success("บันทึกสีตัวหนังสือ/ไอคอนแล้ว");
                              }}
                            >
                              {label}
                            </Button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        หมายเหตุ: ถ้าต้องการตั้งสีธีม (primary) และโหมด light/dark ให้ดูด้านบนในหน้านี้ได้เลย
                      </p>
                    </CardContent>
                  </Card>

                  <div className="flex flex-wrap gap-2 justify-end pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setForm(initial);
                        toast.message("รีเซ็ตฟอร์มเป็นค่าที่บันทึกล่าสุดแล้ว");
                      }}
                      disabled={updateMutation.isPending}
                    >
                      รีเซ็ตฟอร์ม
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        // คืนค่า “สีเดิมของระบบ” แล้วบันทึกทันที
                        const color = SYSTEM_DEFAULT_ORANGE;
                        setForm((s) => ({ ...s, primaryColor: color }));
                        updateMutation.mutate({
                          storeName: form.storeName.trim() || undefined,
                          logoUrl: form.logoUrl,
                          primaryColor: color,
                          address: form.address,
                          phone: form.phone,
                          themeMode: form.themeMode,
                        });
                      }}
                      disabled={updateMutation.isPending}
                      title={`คืนค่าสีเริ่มต้นระบบ (${SYSTEM_DEFAULT_ORANGE})`}
                    >
                      คืนค่าสีเดิม
                    </Button>
                    <Button
                      onClick={() => {
                        updateMutation.mutate({
                          storeName: form.storeName.trim() || undefined,
                          logoUrl: form.logoUrl,
                          primaryColor: primary,
                          address: form.address,
                          phone: form.phone,
                          themeMode: form.themeMode,
                        });
                      }}
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? "กำลังบันทึก..." : "บันทึก"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

