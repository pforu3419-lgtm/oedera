import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { QRCodeCanvas } from "qrcode.react";
import { useEffect, useMemo, useState } from "react";
import { Copy, QrCode } from "lucide-react";

export default function MemberQrPage() {
  const { user } = useAuth();
  const storeId = user?.storeId ?? null;
  const orgId = user ? (user.organizationId ?? user.id) : null;

  const DEFAULT_BASE_URL =
    typeof window !== "undefined" ? window.location.origin : "";
  const [baseUrl, setBaseUrl] = useState<string>(() => {
    try {
      return localStorage.getItem("ordera:memberQrBaseUrl") || DEFAULT_BASE_URL;
    } catch {
      return DEFAULT_BASE_URL;
    }
  });
  const [touched, setTouched] = useState<boolean>(() => {
    try {
      return localStorage.getItem("ordera:memberQrBaseUrlTouched") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("ordera:memberQrBaseUrl", baseUrl);
    } catch {
      // ignore
    }
  }, [baseUrl]);

  useEffect(() => {
    try {
      localStorage.setItem("ordera:memberQrBaseUrlTouched", touched ? "1" : "0");
    } catch {
      // ignore
    }
  }, [touched]);

  // If we're currently on localhost, auto-suggest LAN IP so a phone can open it.
  // Only runs if user hasn't manually edited the field ("touched" === false).
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (touched) return;

      const origin = (DEFAULT_BASE_URL || "").trim();
      const current = (baseUrl || "").trim();
      const isLocal =
        current.toLowerCase().includes("://localhost") ||
        current.toLowerCase().includes("://127.0.0.1") ||
        current.toLowerCase().includes("://[::1]");
      // If already not localhost, no need to auto-suggest
      if (!isLocal) return;
      // If app itself is not running on localhost, don't override
      const isOriginLocalhost =
        origin.toLowerCase().includes("://localhost") ||
        origin.toLowerCase().includes("://127.0.0.1") ||
        origin.toLowerCase().includes("://[::1]");
      if (!isOriginLocalhost) return;

      try {
        const resp = await fetch("/api/public/lan-ip");
        if (!resp.ok) return;
        const data = (await resp.json()) as { ip?: string | null; port?: string | null };
        const ip = (data?.ip || "").trim();
        const port = (data?.port || window.location.port || "").trim();
        if (!ip) return;
        const suggested = `${window.location.protocol}//${ip}${port ? `:${port}` : ""}`;
        if (!cancelled) setBaseUrl(suggested);
      } catch {
        // ignore
      }
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [touched, baseUrl, DEFAULT_BASE_URL]);

  const isLocalhost = useMemo(() => {
    const v = (baseUrl || "").toLowerCase();
    return (
      v.includes("://localhost") ||
      v.includes("://127.0.0.1") ||
      v.includes("://[::1]")
    );
  }, [baseUrl]);

  const url = useMemo(() => {
    if (!storeId) return "";
    const b = (baseUrl || "").trim().replace(/\/+$/, "");
    const org = orgId ? `?org=${encodeURIComponent(String(orgId))}` : "";
    return `${b}/m/${storeId}${org}`;
  }, [storeId, orgId, baseUrl]);

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR สมัครสมาชิก
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              ให้ลูกค้าสแกนเพื่อสมัครสมาชิก (หน้าสาธารณะ ไม่ต้องล็อกอิน)
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!storeId ? (
              <div className="text-muted-foreground">ไม่พบ storeId (กรุณาเชื่อมต่อร้านก่อน)</div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Base URL สำหรับสร้าง QR</div>
                  <div className="text-sm text-muted-foreground">
                    ถ้าลูกค้าสแกนจากมือถือ <span className="font-medium">ห้ามใช้ localhost</span> ให้ใส่ IP/โดเมนที่มือถือเข้าถึงได้
                    (เช่น <span className="font-mono">http://192.168.1.10:3030</span>)
                  </div>
                  <Input
                    value={baseUrl}
                    onChange={(e) => {
                      setTouched(true);
                      setBaseUrl(e.target.value);
                    }}
                    placeholder="เช่น http://192.168.1.10:3030"
                  />
                  {isLocalhost && (
                    <div className="text-sm text-destructive">
                      ตอนนี้ Base URL เป็น localhost — ถ้าสแกนจากมือถือจะเข้าไม่ได้
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-xl border bg-white p-3">
                    <QRCodeCanvas value={url} size={240} includeMargin />
                  </div>
                  <div className="w-full flex gap-2">
                    <Input readOnly value={url} />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(url);
                          toast.success("คัดลอกลิงก์แล้ว");
                        } catch {
                          toast.error("คัดลอกไม่สำเร็จ");
                        }
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      คัดลอก
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    onClick={() => window.open(url, "_blank")}
                    disabled={!url}
                  >
                    ทดลองเปิดลิงก์
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  ลิงก์นี้ผูกกับ storeId: <span className="font-mono">{storeId}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

