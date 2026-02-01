import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Loader2, AlertTriangle, Plus, History, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface StockAdjustment {
  productId: number;
  quantity: string;
  type: "in" | "out" | "adjustment";
  reason: string;
}

export default function Inventory() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [adjustment, setAdjustment] = useState<StockAdjustment>({
    productId: 0,
    quantity: "",
    type: "in",
    reason: "",
  });

  // Queries
  const inventoryQuery = trpc.inventory.list.useQuery({ search: searchTerm });
  const historyQuery = trpc.inventory.getMovementHistory.useQuery(
    { productId: selectedProductId! },
    { enabled: !!selectedProductId }
  );

  // Mutations
  const utils = trpc.useUtils();
  const adjustStockMutation = trpc.inventory.adjustStock.useMutation({
    onSuccess: async (result, variables) => {
      await utils.inventory.list.invalidate();
      if (typeof result?.newQuantity === "number" && variables.productId != null) {
        utils.inventory.list.setData(
          { search: searchTerm },
          (prev: any[] | undefined) => {
            if (!Array.isArray(prev)) return prev;
            return prev.map((item: any) =>
              String(item?.productId) === String(variables.productId)
                ? { ...item, quantity: result.newQuantity }
                : item
            );
          }
        );
      }
    },
  });

  const inventory = inventoryQuery.data || [];
  const lowStockItems = inventory.filter(
    (item: any) => parseInt(item.quantity) <= (item.minThreshold || 10)
  );

  const handleOpenAdjustDialog = (productId: number | string) => {
    const normalizedProductId = Number(productId);
    setSelectedProductId(normalizedProductId);
    setAdjustment({
      productId: normalizedProductId,
      quantity: "",
      type: "in",
      reason: "สั่งซื้อเข้า",
    });
    setIsAdjustDialogOpen(true);
  };

  const handleOpenHistoryDialog = (productId: number | string) => {
    setSelectedProductId(Number(productId));
    setIsHistoryDialogOpen(true);
  };

  const handleAdjustStock = async () => {
    const quantity = Number(adjustment.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("กรุณากรอกจำนวนที่ถูกต้อง");
      return;
    }

    if (!adjustment.reason.trim()) {
      toast.error("กรุณากรอกเหตุผล");
      return;
    }

    try {
      const productId = Number(adjustment.productId);
      if (!Number.isInteger(productId) || productId <= 0) {
        toast.error("รหัสสินค้าไม่ถูกต้อง");
        return;
      }
      await adjustStockMutation.mutateAsync({
        productId,
        quantity,
        type: adjustment.type,
        reason: adjustment.reason,
      });
      await utils.inventory.list.invalidate();
      await inventoryQuery.refetch();
      setIsAdjustDialogOpen(false);
      toast.success("ปรับปรุงสต๊อกสำเร็จ");
    } catch (error: any) {
      const msg = error?.message || error?.data?.message || "เกิดข้อผิดพลาดในการปรับปรุงสต๊อก";
      toast.error(msg);
    }
  };

  const getProductName = (productId: number | null | undefined) => {
    if (productId == null) return "ไม่พบสินค้า";
    const item = inventory.find((i: any) => {
      if (i?.productId == null) return false;
      return i.productId.toString() === productId.toString();
    });
    return item?.productName || "ไม่พบสินค้า";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/")}
            className="shrink-0 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            ย้อนกลับ
          </Button>
          <div>
            <h1 className="text-3xl font-bold">จัดการสต๊อกสินค้า</h1>
            <p className="text-muted-foreground">ตรวจสอบและปรับปรุงสต๊อกสินค้าคงคลัง</p>
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              มีสินค้า {lowStockItems.length} รายการที่ใกล้หมด กรุณาสั่งซื้อเพิ่มเติม
            </AlertDescription>
          </Alert>
        )}

        {/* Search */}
        <Input
          placeholder="ค้นหาสินค้า..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {/* Low Stock Items */}
        {lowStockItems.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-orange-900">
                ⚠️ สินค้าที่ใกล้หมด ({lowStockItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {lowStockItems.map((item: any) => (
                  <div
                    key={item.productId}
                    className="p-3 bg-white rounded border border-orange-200"
                  >
                    <p className="font-semibold text-sm">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      SKU: {item.sku}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          คงคลัง: <span className="font-bold text-orange-600">{item.quantity}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ขั้นต่ำ: {item.minThreshold || 10}
                        </p>
                      </div>
                      <Button
                        variant="add"
                        size="sm"
                        onClick={() => handleOpenAdjustDialog(item.productId)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        เพิ่ม
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inventory Table */}
        <Card>
          <CardHeader>
            <CardTitle>รายการสต๊อกสินค้า ({inventory.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {inventoryQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : inventory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                ไม่มีข้อมูลสต๊อก
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">SKU</th>
                      <th className="text-left py-3 px-4">ชื่อสินค้า</th>
                      <th className="text-right py-3 px-4">คงคลัง</th>
                      <th className="text-right py-3 px-4">ขั้นต่ำ</th>
                      <th className="text-center py-3 px-4">สถานะ</th>
                      <th className="text-left py-3 px-4">ราคา</th>
                      <th className="text-left py-3 px-4">การกระทำ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item: any) => {
                      const isLowStock = item.quantity <= (item.minThreshold || 10);
                      return (
                        <tr
                          key={item.productId}
                          className={`border-b hover:bg-muted/50 ${
                            isLowStock ? "bg-orange-50" : ""
                          }`}
                        >
                          <td className="py-3 px-4 text-xs font-mono">
                            {item.sku}
                          </td>
                          <td className="py-3 px-4 font-medium">
                            {item.productName}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold">
                            <span
                              className={
                                isLowStock ? "text-orange-600" : "text-green-600"
                              }
                            >
                              {item.quantity}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {item.minThreshold || 10}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`text-xs font-semibold px-2 py-1 rounded ${
                                isLowStock
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {isLowStock ? "⚠️ ใกล้หมด" : "✓ ปกติ"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            ฿{parseFloat(item.price || "0").toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-2 items-center">
                              <Button
                                size="sm"
                                variant={isLowStock ? "add" : "default"}
                                onClick={() =>
                                  handleOpenAdjustDialog(item.productId)
                                }
                                title="เพิ่ม/ปรับสต๊อก"
                                className={isLowStock ? "font-semibold" : ""}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                เพิ่มสต็อก
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleOpenHistoryDialog(item.productId)
                                }
                                title="ประวัติการเคลื่อนไหว"
                              >
                                <History className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stock Adjustment Dialog */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ปรับปรุงสต๊อก - {getProductName(adjustment.productId)}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">ประเภท</label>
              <select
                value={adjustment.type}
                onChange={(e) =>
                  setAdjustment({
                    ...adjustment,
                    type: e.target.value as "in" | "out" | "adjustment",
                  })
                }
                className="w-full px-3 py-2 border rounded text-sm mt-1"
              >
                <option value="in">เข้าสินค้า (สั่งซื้อ/คืน)</option>
                <option value="out">ออกสินค้า (ขาย/สูญหาย)</option>
                <option value="adjustment">ปรับปรุง (ตรวจนับ)</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">จำนวน</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {[10, 20, 50, 100].map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setAdjustment({
                        ...adjustment,
                        quantity: String((Number(adjustment.quantity) || 0) + n),
                      })
                    }
                  >
                    +{n}
                  </Button>
                ))}
              </div>
              <Input
                type="number"
                min="1"
                value={adjustment.quantity}
                onChange={(e) =>
                  setAdjustment({
                    ...adjustment,
                    quantity: e.target.value,
                  })
                }
                placeholder="0"
                className="mt-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">เหตุผล</label>
              <textarea
                value={adjustment.reason}
                onChange={(e) =>
                  setAdjustment({ ...adjustment, reason: e.target.value })
                }
                placeholder="เช่น สั่งซื้อจากผู้ขาย, ตรวจนับสต๊อก"
                className="w-full px-3 py-2 border rounded text-sm min-h-20 mt-1"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsAdjustDialogOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleAdjustStock}
                disabled={adjustStockMutation.isPending}
              >
                {adjustStockMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  "บันทึก"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock Movement History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>ประวัติการเคลื่อนไหว - {getProductName(selectedProductId!)}</DialogTitle>
          </DialogHeader>

          <div>
            {historyQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : !historyQuery.data || historyQuery.data.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                ไม่มีประวัติการเคลื่อนไหว
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {historyQuery.data.map((movement: any, index: number) => (
                  <div
                    key={index}
                    className="p-3 border rounded bg-muted/30"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm">
                          {movement.type === "in"
                            ? "📥 เข้าสินค้า"
                            : movement.type === "out"
                              ? "📤 ออกสินค้า"
                              : "🔄 ปรับปรุง"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {movement.reason}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-bold ${
                            movement.type === "in"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {movement.type === "in" ? "+" : "-"}
                          {movement.quantity}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(movement.createdAt).toLocaleString("th-TH")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
