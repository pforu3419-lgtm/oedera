import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Trash2 } from "lucide-react";
import { useLocation } from "wouter";

type Status = "pending" | "active" | "disabled" | "expired";
type Plan = "basic" | "premium";

function statusBadgeVariant(s: Status) {
  if (s === "active") return "default" as const;
  if (s === "pending") return "secondary" as const;
  return "destructive" as const;
}

function statusToSwitchChecked(s: Status): boolean {
  return s === "active";
}

function planLabel(p: Plan) {
  return p === "basic" ? "Basic (1 บัญชี)" : "Premium (หลายบัญชี)";
}

function toDateInputValue(d: any): string {
  if (!d) return "";
  const dd = d instanceof Date ? d : new Date(String(d));
  if (!Number.isFinite(dd.getTime())) return "";
  const yyyy = dd.getFullYear();
  const mm = String(dd.getMonth() + 1).padStart(2, "0");
  const day = String(dd.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${day}`;
}

export default function SuperAdminDashboard() {
  const { user, logout } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/super-admin/login" });
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [verified, setVerified] = useState(false);
  const [password, setPassword] = useState("");

  const verifyMutation = trpc.superAdmin.verifyPassword.useMutation();

  const storesQuery = trpc.superAdmin.stores.list.useQuery(undefined, {
    enabled: verified,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const updateMutation = trpc.superAdmin.stores.update.useMutation({
    onSuccess: async () => {
      await utils.superAdmin.stores.list.invalidate();
    },
  });
  const deleteMutation = trpc.superAdmin.stores.delete.useMutation({
    onSuccess: async () => {
      await utils.superAdmin.stores.list.invalidate();
    },
  });

  const stores = storesQuery.data ?? [];
  // IMPORTANT: ห้ามใช้ id เป็น key เพราะใน DB อาจมี id ซ้ำ (จะทำให้ state ไปผูกหลายแถวพร้อมกัน)
  const [expireDraft, setExpireDraft] = useState<Record<string, string>>({});

  const rows = useMemo(() => {
    return stores.map((s: any) => {
      const status = (s.computedStatus || s.subscriptionStatus || "active") as Status;
      const expiresAt = s.computedExpiresAt ?? s.expiresAt ?? null;
      return { ...s, status, expiresAt };
    });
  }, [stores]);

  const [deleteConfirm, setDeleteConfirm] = useState<Record<string, string>>({});

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <Card className="border shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle>Super Admin — Subscription Management</CardTitle>
            <div className="text-sm text-muted-foreground">
              จัดการร้านทั้งหมด: เปิดใช้งาน / ปิดใช้งาน / ตั้งวันหมดอายุ (ข้อมูลใน DB ไม่ถูกลบ)
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-xs text-muted-foreground">
              คุณกำลังล็อกอินเป็น: <span className="font-medium">{user?.email ?? "-"}</span> • role:{" "}
              <span className="font-medium">{(user as any)?.role ?? "-"}</span>
            </div>

            {!verified ? (
              <div className="max-w-md space-y-3 rounded-xl border bg-card p-4">
                <div className="font-medium">ยืนยันรหัสผ่านเพื่อเข้าแดชบอร์ด</div>
                <div className="text-sm text-muted-foreground">
                  ตั้งใจให้กรอกรหัสทุกครั้ง: ระบบจะไม่จำรหัส และถ้ารีเฟรชหน้านี้ต้องยืนยันใหม่
                </div>
                <div className="text-sm text-muted-foreground">
                  หมายเหตุ: ต้อง <span className="font-medium">Login</span> ให้สำเร็จก่อน แล้วค่อยยืนยันรหัสผ่านในหน้านี้
                </div>
                <div className="space-y-2">
                  <Label htmlFor="superadmin-password">รหัสผ่าน</Label>
                  <Input
                    id="superadmin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านของบัญชีนี้"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={async () => {
                      try {
                        await verifyMutation.mutateAsync({ password });
                        setPassword("");
                        setVerified(true);
                        toast.success("ยืนยันสำเร็จ");
                      } catch (e: any) {
                        const msg = String(e?.message || "");
                        if (msg.includes("Please login") || msg.includes("(10001)")) {
                          toast.error("Session หมดอายุ/ยังไม่ได้ Login กรุณาเข้าสู่ระบบผู้ดูแลใหม่");
                          setLocation("/super-admin/login");
                          return;
                        }
                        toast.error(msg || "ยืนยันไม่สำเร็จ");
                      }
                    }}
                    disabled={verifyMutation.isPending || password.length < 6}
                  >
                    {verifyMutation.isPending ? "กำลังยืนยัน..." : "ยืนยัน"}
                  </Button>
                  <Button variant="outline" onClick={() => logout()}>
                    Logout
                  </Button>
                </div>
              </div>
            ) : storesQuery.isLoading ? (
              <div className="text-muted-foreground">กำลังโหลดรายการร้าน...</div>
            ) : storesQuery.isError ? (
              <div className="space-y-3">
                <div className="font-medium text-destructive">
                  โหลดรายการร้านไม่สำเร็จ: {(storesQuery.error as any)?.message ?? "Unknown error"}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => storesQuery.refetch()}>
                    ลองใหม่
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setVerified(false);
                    }}
                  >
                    ยืนยันรหัสใหม่
                  </Button>
                  <Button onClick={() => logout()}>Logout</Button>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((s: any) => {
                    const storeCode = String(s.storeCode || "").trim();
                    const idLabel = String(s.id ?? "-");
                    const ownerIdLabel = String(s.ownerId ?? "-");
                    const draft = expireDraft[storeCode] ?? toDateInputValue(s.expiresAt);
                    const plan = (String(s.subscriptionPlan || "premium") as Plan) ?? "premium";
                    return (
                      <TableRow key={storeCode || `${idLabel}:${ownerIdLabel}`}>
                        <TableCell>
                          <div className="font-medium">{s.name}</div>
                          <div className="text-xs text-muted-foreground">
                            id: {idLabel} • ownerId: {ownerIdLabel} • code: {s.storeCode}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(s.status)}>{s.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-[200px]">
                            <Select
                              value={plan}
                              onValueChange={async (value) => {
                                try {
                                  await updateMutation.mutateAsync({
                                    storeCode,
                                    subscriptionPlan: value as Plan,
                                  });
                                  toast.success("อัปเดตแพ็กเกจแล้ว");
                                } catch (e: any) {
                                  toast.error(e?.message || "อัปเดตแพ็กเกจไม่สำเร็จ");
                                }
                              }}
                              disabled={updateMutation.isPending}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="เลือกแพ็กเกจ" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="basic">{planLabel("basic")}</SelectItem>
                                <SelectItem value="premium">{planLabel("premium")}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <Label className="sr-only" htmlFor={`exp-${storeCode}`}>
                              Expire date
                            </Label>
                            <Input
                              id={`exp-${storeCode}`}
                              type="date"
                              value={draft}
                              onChange={(e) =>
                                setExpireDraft((m) => ({ ...m, [storeCode]: e.target.value }))
                              }
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={statusToSwitchChecked(s.status)}
                                disabled={updateMutation.isPending}
                                onCheckedChange={async (checked) => {
                                  try {
                                    await updateMutation.mutateAsync({
                                      storeCode,
                                      subscriptionStatus: checked ? "active" : "disabled",
                                      disabledReason: checked ? null : "disabled by super admin",
                                    });
                                    toast.success(checked ? "เปิดใช้งานแล้ว" : "ปิดใช้งานแล้ว");
                                  } catch (e: any) {
                                    toast.error(e?.message || "ทำรายการไม่สำเร็จ");
                                  }
                                }}
                              />
                              <span className="text-sm text-muted-foreground">
                                {statusToSwitchChecked(s.status) ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                              </span>
                            </div>

                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={async () => {
                                try {
                                  const value = (expireDraft[storeCode] ?? "").trim();
                                  await updateMutation.mutateAsync({
                                    storeCode,
                                    expiresAt: value === "" ? null : value,
                                  });
                                  toast.success("ตั้งวันหมดอายุแล้ว");
                                } catch (e: any) {
                                  toast.error(e?.message || "ทำรายการไม่สำเร็จ");
                                }
                              }}
                              disabled={updateMutation.isPending}
                            >
                              บันทึกวันหมดอายุ
                            </Button>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={deleteMutation.isPending}
                                  title="ลบร้านและข้อมูลทั้งหมดในฐานข้อมูล (ถาวร)"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  ลบร้าน
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>ยืนยันการลบร้าน (ถาวร)</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    การลบนี้จะลบข้อมูลของร้านออกจากฐานข้อมูล และไม่สามารถกู้คืนได้
                                    <br />
                                    เพื่อยืนยัน ให้พิมพ์: <b>DELETE {storeCode}</b>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="space-y-2">
                                  <Label htmlFor={`delete-${storeCode}`}>พิมพ์ยืนยัน</Label>
                                  <Input
                                    id={`delete-${storeCode}`}
                                    value={deleteConfirm[storeCode] ?? ""}
                                    onChange={(e) =>
                                      setDeleteConfirm((m) => ({ ...m, [storeCode]: e.target.value }))
                                    }
                                    placeholder={`DELETE ${storeCode}`}
                                  />
                                </div>
                                <AlertDialogFooter>
                                  <AlertDialogCancel
                                    onClick={() =>
                                      setDeleteConfirm((m) => ({ ...m, [storeCode]: "" }))
                                    }
                                  >
                                    ยกเลิก
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-white hover:bg-destructive/90"
                                    onClick={async () => {
                                      try {
                                        const confirm = deleteConfirm[storeCode] ?? "";
                                        await deleteMutation.mutateAsync({ storeCode, confirm });
                                        setDeleteConfirm((m) => ({ ...m, [storeCode]: "" }));
                                        toast.success("ลบร้านแล้ว");
                                      } catch (e: any) {
                                        toast.error(e?.message || "ลบร้านไม่สำเร็จ");
                                      }
                                    }}
                                    disabled={
                                      deleteMutation.isPending ||
                                      (deleteConfirm[storeCode] ?? "").trim() !== `DELETE ${storeCode}`
                                    }
                                  >
                                    ลบถาวร
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

