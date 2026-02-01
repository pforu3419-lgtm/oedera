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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Loader2, Plus, Edit2, Trash2, Upload, X, ArrowLeft, AlertTriangle, History, Package, Warehouse, List, Layers, Printer, ChevronRight, Barcode, Minus } from "lucide-react";
import { BarcodeDisplay } from "@/components/BarcodeDisplay";
import { BarcodePrintSheet } from "@/components/BarcodePrintSheet";
import { validateEAN13, normalizeEAN13Input } from "@/lib/barcode";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

interface ProductForm {
  id?: number;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId: number;
  price: string;
  cost: string;
  imageUrl?: string;
  status: "active" | "inactive";
}

interface StockAdjustment {
  productId: number;
  quantity: string;
  type: "in" | "out" | "adjustment";
  reason: string;
}

export default function ProductsAndInventory() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("products");
  
  // Products state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isCategoryManageOpen, setIsCategoryManageOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingProduct, setEditingProduct] = useState<ProductForm | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [showBarcodePrint, setShowBarcodePrint] = useState(false);
  const [productForBarcodePrint, setProductForBarcodePrint] = useState<{
    id: number;
    name: string;
    price: string;
    barcode: string | null;
  } | null>(null);
  const [barcodeSource, setBarcodeSource] = useState<"auto" | "manual">("auto");
  const [formData, setFormData] = useState<ProductForm>({
    sku: "",
    barcode: "",
    name: "",
    categoryId: 1,
    price: "",
    cost: "",
    status: "active",
  });

  // Inventory state
  const [inventorySearchTerm, setInventorySearchTerm] = useState("");
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
  const categoriesQuery = trpc.categories.list.useQuery();
  const productsQuery = trpc.products.list.useQuery(
    {
      ...(selectedCategory != null ? { categoryId: selectedCategory } : {}),
      search: searchTerm,
    },
    {
      refetchOnWindowFocus: true,
      refetchOnMount: true,
    }
  );
  const inventoryQuery = trpc.inventory.list.useQuery({ search: inventorySearchTerm });
  const historyQuery = trpc.inventory.getMovementHistory.useQuery(
    { productId: selectedProductId! },
    { enabled: !!selectedProductId }
  );

  // tRPC utils for invalidating queries
  const utils = trpc.useUtils();

  // Mutations
  const createProductMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      // Invalidate all queries that depend on products
      utils.products.list.invalidate();
      utils.inventory.list.invalidate();
    },
  });
  const updateProductMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      // Invalidate all queries that depend on products (including inventory which joins with products)
      utils.products.list.invalidate();
      utils.inventory.list.invalidate();
      // Also invalidate reports and other queries that might use product data
      utils.reports.salesByDateRange.invalidate();
    },
  });
  const deleteProductMutation = trpc.products.delete.useMutation({
    onSuccess: async () => {
      await utils.products.list.invalidate();
      await utils.inventory.list.invalidate();
    },
    onError: async () => {
      await productsQuery.refetch();
    },
  });
  const regenerateBarcodeMutation = trpc.products.regenerateBarcode.useMutation({
    onSuccess: (newBarcode) => {
      utils.products.list.invalidate();
      setFormData((prev) => ({ ...prev, barcode: newBarcode }));
      toast.success(`สร้างบาร์โค้ดใหม่: ${newBarcode}`);
    },
    onError: (err) => {
      toast.error(err.message || "สร้างบาร์โค้ดใหม่ไม่สำเร็จ");
    },
  });
  const fixDuplicateBarcodesMutation = trpc.products.fixDuplicateBarcodes.useMutation({
    onSuccess: ({ cleared, regenerated }) => {
      utils.products.list.invalidate();
      if (cleared === 0) toast.success("ไม่พบบาร์โค้ดซ้ำ");
      else toast.success(`แก้บาร์โค้ดซ้ำแล้ว: ล้าง ${cleared} รายการ, สร้างใหม่ ${regenerated} รายการ`);
    },
    onError: (err) => toast.error(err.message || "แก้บาร์โค้ดซ้ำไม่สำเร็จ"),
  });
  const duplicateProductIdsQuery = trpc.products.findDuplicateProductIds.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  const fixDuplicateProductIdsMutation = trpc.products.fixDuplicateProductIds.useMutation({
    onSuccess: ({ updated }) => {
      utils.products.list.invalidate();
      utils.inventory.list.invalidate();
      duplicateProductIdsQuery.refetch();
      toast.success(updated > 0 ? `แก้ product id ซ้ำแล้ว ${updated} รายการ — สต็อกจะไม่ลดทั้งสองตัวแล้ว` : "ไม่พบ product id ซ้ำ");
    },
    onError: (err) => toast.error(err.message || "แก้ product id ซ้ำไม่สำเร็จ"),
  });
  const createCategoryMutation = trpc.categories.create.useMutation({
    onSuccess: () => {
      utils.categories.list.invalidate();
    },
  });
  const updateCategoryMutation = trpc.categories.update.useMutation({
    onSuccess: () => {
      utils.categories.list.invalidate();
    },
  });
  const deleteCategoryMutation = trpc.categories.delete.useMutation({
    onSuccess: () => {
      utils.categories.list.invalidate();
    },
  });
  const fixDuplicateIdsMutation = trpc.categories.fixDuplicateIds.useMutation({
    onSuccess: (res) => {
      utils.categories.list.invalidate();
      utils.products.list.invalidate();
      toast.success(res.updated > 0 ? `แก้ไข id หมวดหมู่ที่ซ้ำแล้ว ${res.updated} รายการ` : "ไม่พบหมวดหมู่ที่ id ซ้ำ");
    },
    onError: (e) => {
      toast.error(e.message || "แก้ไขไม่สำเร็จ");
    },
  });
  const adjustStockMutation = trpc.inventory.adjustStock.useMutation({
    onSuccess: async () => {
      await utils.inventory.list.invalidate();
    },
  });

  const categories = categoriesQuery.data || [];
  // Products are now actually deleted from database, so no need to filter by status
  const products = productsQuery.data || [];
  const inventory = inventoryQuery.data || [];
  const lowStockItems = inventory.filter(
    (item: any) => parseInt(item.quantity) <= (item.minThreshold || 10)
  );

  // Products handlers
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenDialog = (product?: any) => {
    if (product) {
      setEditingProduct(product);
      const catIdx = categories.findIndex((c) => c.id === product.categoryId);
      setSelectedCategoryIndex(catIdx >= 0 ? catIdx : 0);
      setBarcodeSource(product.barcode?.trim() ? "manual" : "auto");
      setFormData({
        id: product.id,
        sku: product.sku,
        barcode: product.barcode ?? "",
        name: product.name,
        description: product.description,
        categoryId: product.categoryId,
        price: product.price,
        cost: product.cost,
        imageUrl: product.imageUrl || undefined,
        status: product.status,
      });
      setImagePreview(product.imageUrl || "");
      setImageFile(null); // Clear any previous file selection
    } else {
      setEditingProduct(null);
      setSelectedCategoryIndex(0);
      setBarcodeSource("auto");
      setFormData({
        sku: "",
        barcode: "",
        name: "",
        categoryId: categories[0]?.id ?? 1,
        price: "",
        cost: "",
        status: "active",
      });
      setImagePreview("");
      setImageFile(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
    setImageFile(null);
    setImagePreview("");
  };

  const handleSaveProduct = async () => {
    if (!formData.sku || !formData.name || !formData.price) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    const nameTrim = (formData.name ?? "").trim();
    if (/^\d+$/.test(nameTrim)) {
      toast.error("ชื่อสินค้าต้องอ่านรู้เรื่อง ห้ามเป็นตัวเลขล้วน");
      return;
    }
    if (barcodeSource === "manual" && (formData.barcode ?? "").trim()) {
      const barcodeVal = validateEAN13(formData.barcode ?? "");
      if (!barcodeVal.valid) {
        toast.error(barcodeVal.error ?? "บาร์โค้ดนี้ไม่ตรงรูปแบบที่เลือก");
        return;
      }
    }

    try {
      let imageUrl = formData.imageUrl;

      if (imageFile) {
        try {
          const formDataForUpload = new FormData();
          formDataForUpload.append("file", imageFile);
          
          const uploadResponse = await fetch("/api/upload", {
            method: "POST",
            body: formDataForUpload,
          });

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            toast.error(`อัปโหลดภาพล้มเหลว: ${errorText}`);
            imageUrl = formData.imageUrl;
          } else {
            try {
              const uploadData = await uploadResponse.json();
              if (uploadData && uploadData.url) {
                imageUrl = uploadData.url;
              } else {
                toast.error("ไม่ได้รับ URL ของภาพจากเซิร์ฟเวอร์");
                imageUrl = formData.imageUrl; // Keep existing imageUrl
              }
            } catch (jsonError) {
              toast.error("ไม่สามารถอ่านข้อมูลจากเซิร์ฟเวอร์");
              imageUrl = formData.imageUrl; // Keep existing imageUrl
            }
          }
        } catch (uploadError) {
          toast.error(`เกิดข้อผิดพลาดในการอัปโหลด: ${uploadError instanceof Error ? uploadError.message : "Unknown error"}`);
          // Don't throw error - just skip image upload
          imageUrl = formData.imageUrl; // Keep existing imageUrl
        }
      }

      const productData: any = {
        ...formData,
        price: String(formData.price || "0"),
        cost: formData.cost ? String(formData.cost) : undefined,
        // ใช้ categoryId จากตัวที่เลือกใน dropdown โดยตรง (selectedCategoryIndex) เพื่อไม่ให้กลับเป็น 1
        categoryId: categories[selectedCategoryIndex]?.id ?? formData.categoryId,
      };
      
      // Handle imageUrl based on whether we're editing or creating
      if (editingProduct) {
        // When editing: always send imageUrl (even if null/undefined to preserve or clear existing image)
        // If we uploaded a new image, use it; otherwise keep the existing one from formData
        if (imageFile) {
          // New image uploaded - use the new URL
          productData.imageUrl = imageUrl || null;
        } else {
          // No new image uploaded - keep existing imageUrl from formData (which was set when opening dialog)
          // This ensures each product keeps its own image
          productData.imageUrl = formData.imageUrl || null;
        }
      } else {
        // When creating: only include if we have a value
        if (imageUrl && imageUrl.trim() !== "") {
          productData.imageUrl = imageUrl;
        }
      }

      // บาร์โค้ด: สร้างอัตโนมัติ = null, ใช้จากผู้ผลิต = ค่าที่ validate แล้ว
      productData.barcode = barcodeSource === "auto" ? null : (formData.barcode?.trim() || null);

      if (editingProduct) {
        await updateProductMutation.mutateAsync({
          id: editingProduct.id!,
          ...productData,
        });
        toast.success("อัปเดตสินค้าสำเร็จ");
      } else {
        await createProductMutation.mutateAsync(productData);
        toast.success("เพิ่มสินค้าสำเร็จ");
      }
      handleCloseDialog();
      // Queries will be automatically refetched via invalidate in onSuccess callbacks
    } catch (error: any) {
      const errorMessage = error?.message || error?.data?.message || "เกิดข้อผิดพลาดในการบันทึก";
      toast.error(errorMessage);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("คุณแน่ใจหรือว่าต้องการลบสินค้านี้?")) return;

    try {
      // Optimistic update: remove from UI immediately
      const currentProducts = productsQuery.data || [];
      const updatedProducts = currentProducts.filter((p: any) => p.id !== id);
      
      // Update cache optimistically
      utils.products.list.setData(
        { ...(selectedCategory != null ? { categoryId: selectedCategory } : {}), search: searchTerm },
        updatedProducts
      );

      await deleteProductMutation.mutateAsync({ id });
      
      // Force refetch to ensure data is synced with backend
      await utils.products.list.invalidate();
      await utils.inventory.list.invalidate();
      await new Promise(resolve => setTimeout(resolve, 200));
      await productsQuery.refetch();

      toast.success("ลบสินค้าสำเร็จ");
    } catch (error: any) {
      // Revert optimistic update on error by refetching
      await productsQuery.refetch();
      const errorMessage = error?.message || error?.data?.message || "เกิดข้อผิดพลาดในการลบ";
      toast.error(errorMessage);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("กรุณากรอกชื่อหมวดหมู่");
      return;
    }

    try {
      await createCategoryMutation.mutateAsync({ name: newCategoryName });
      toast.success("เพิ่มหมวดหมู่สำเร็จ");
      setNewCategoryName("");
      setIsCategoryDialogOpen(false);
      await categoriesQuery.refetch();
    } catch (error: unknown) {
      const msg =
        error && typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string"
          ? (error as { message: string }).message
          : "เกิดข้อผิดพลาดในการเพิ่มหมวดหมู่";
      toast.error(msg);
      console.error(error);
    }
  };

  const handleOpenCategoryManage = () => {
    setEditingCategoryId(null);
    setEditingCategoryName("");
    setIsCategoryManageOpen(true);
  };

  const handleSaveCategoryEdit = async () => {
    if (editingCategoryId == null || !editingCategoryName.trim()) {
      toast.error("กรุณากรอกชื่อหมวดหมู่");
      return;
    }
    try {
      await updateCategoryMutation.mutateAsync({ id: editingCategoryId, name: editingCategoryName.trim() });
      toast.success("แก้ไขหมวดหมู่สำเร็จ");
      setEditingCategoryId(null);
      setEditingCategoryName("");
      await categoriesQuery.refetch();
    } catch (error: any) {
      toast.error(error?.message || error?.data?.message || "เกิดข้อผิดพลาดในการแก้ไข");
    }
  };

  const handleCancelCategoryEdit = () => {
    setEditingCategoryId(null);
    setEditingCategoryName("");
  };

  const handleDeleteCategory = async (cat: { id: number; name: string }) => {
    if (!confirm(`ต้องการลบหมวดหมู่ "${cat.name}" ใช่หรือไม่?`)) return;
    try {
      await deleteCategoryMutation.mutateAsync({ id: cat.id });
      toast.success("ลบหมวดหมู่สำเร็จ");
      await categoriesQuery.refetch();
    } catch (error: any) {
      const msg = error?.message || error?.data?.message || "เกิดข้อผิดพลาดในการลบ";
      toast.error(msg);
    }
  };

  // Inventory handlers
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
    const productId = Number(adjustment.productId);
    if (!Number.isInteger(productId) || productId <= 0) {
      toast.error("รหัสสินค้าไม่ถูกต้อง");
      return;
    }
    try {
      const result = await adjustStockMutation.mutateAsync({
        productId,
        quantity,
        type: adjustment.type,
        reason: adjustment.reason,
      });
      const newQty = result?.newQuantity;
      const searchInput = { search: inventorySearchTerm ?? "" };
      if (typeof newQty === "number") {
        utils.inventory.list.setData(searchInput, (prev: any[] | undefined) => {
          if (!Array.isArray(prev)) return prev;
          return prev.map((item: any) =>
            String(item?.productId) === String(productId) ? { ...item, quantity: newQty } : item
          );
        });
      }
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
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            if (value === "toppings") {
              setLocation("/toppings");
              return;
            }
            setActiveTab(value);
          }}
          className="w-full"
        >
          {/* Header + แจ้งเตือน + แถบแท็บ แนบด้านบนเมื่อเลื่อน — หน้าสต๊อกเห็นปุ่มย้อนกลับตลอด */}
          <div className="sticky top-0 z-10 -mx-6 px-6 pt-4 pb-3 bg-background/95 backdrop-blur border-b space-y-4">
            <div className="flex items-center justify-between">
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
                  <h1 className="text-3xl font-bold">สินค้าและสต๊อก</h1>
                  <p className="text-muted-foreground">จัดการเมนูสินค้าและสต๊อกสินค้าคงคลัง</p>
                </div>
              </div>
            </div>
            {(lowStockItems.length > 0 || (user?.role === "admin" && duplicateProductIdsQuery.data?.length)) ? (
              <Alert className={
                duplicateProductIdsQuery.data?.length
                  ? "border-red-300 bg-red-50"
                  : "border-orange-200 bg-orange-50"
              }>
                <AlertTriangle className="h-4 w-4 shrink-0 text-orange-600" />
                <AlertDescription className="text-left space-y-2">
                  {lowStockItems.length > 0 && (
                    <p className="text-orange-800">
                      {activeTab === "inventory"
                        ? `มีสินค้า ${lowStockItems.length} รายการที่ใกล้หมดหรือหมด — กดปุ่ม "เพิ่มสต็อก" ในแถวสินค้าด้านล่าง`
                        : `มีสินค้า ${lowStockItems.length} รายการที่ใกล้หมดหรือหมด — ไปแท็บ "สต๊อกสินค้า" แล้วกดปุ่มเพิ่มสต็อก`}
                    </p>
                  )}
                  {user?.role === "admin" && duplicateProductIdsQuery.data && duplicateProductIdsQuery.data.length > 0 && (
                    <p className="text-red-800">
                      มีสินค้าหลายตัวใช้รหัสเดียวกัน → สต็อกจะขึ้น/ลงพร้อมกัน
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-2 border-red-400 text-red-700 hover:bg-red-100"
                        disabled={fixDuplicateProductIdsMutation.isPending}
                        onClick={() => fixDuplicateProductIdsMutation.mutate()}
                      >
                        {fixDuplicateProductIdsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        แก้รหัสซ้ำ ({duplicateProductIdsQuery.data.length} ชุด)
                      </Button>
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            ) : null}
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="products" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                จัดการเมนู
              </TabsTrigger>
              <TabsTrigger value="inventory" className="flex items-center gap-2">
                <Warehouse className="h-4 w-4" />
                สต๊อกสินค้า
              </TabsTrigger>
              <TabsTrigger value="toppings" className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                ท็อปปิ้ง
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6 mt-6">
            <div className="flex justify-end gap-2">
            <Button variant="add" onClick={() => setIsCategoryDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              เพิ่มหมวดหมู่
            </Button>
            <Button variant="outline" onClick={handleOpenCategoryManage}>
              <List className="mr-2 h-4 w-4" />
              จัดการหมวดหมู่
            </Button>
            <Button variant="add" onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              เพิ่มสินค้า
            </Button>
            {user?.role === "admin" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-amber-600 border-amber-300"
                  disabled={fixDuplicateBarcodesMutation.isPending}
                  onClick={() => fixDuplicateBarcodesMutation.mutate()}
                >
                  {fixDuplicateBarcodesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  แก้บาร์โค้ดซ้ำ
                </Button>
                {duplicateProductIdsQuery.data && duplicateProductIdsQuery.data.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-300"
                    disabled={fixDuplicateProductIdsMutation.isPending}
                    onClick={() => fixDuplicateProductIdsMutation.mutate()}
                    title="สินค้าหลายตัวใช้ id เดียวกัน = สต็อกลดทั้งสองตัวเมื่อขาย 1 ชิ้น"
                  >
                    {fixDuplicateProductIdsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    แก้ product id ซ้ำ ({duplicateProductIdsQuery.data.length})
                  </Button>
                )}
              </>
            )}
        </div>

        {/* Search & Filter */}
        <div className="space-y-3">
          <Input
            placeholder="ค้นหาสินค้า..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="flex flex-wrap gap-2 pb-2">
            <Button
              variant={selectedCategory === undefined ? "default" : "outline"}
              onClick={() => {
                setSelectedCategory(undefined);
                setSelectedCategoryIndex(-1);
              }}
              size="sm"
              className="shrink-0"
            >
              ทั้งหมด
            </Button>
            {categories.map((category, idx) => (
              <Button
                key={`cat-${category.id}-${idx}`}
                variant={
                  selectedCategory === category.id && selectedCategoryIndex === idx ? "default" : "outline"
                }
                onClick={() => {
                  setSelectedCategory(category.id);
                  setSelectedCategoryIndex(idx);
                }}
                size="sm"
                className="shrink-0"
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle>รายการสินค้า ({products.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {productsQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : products.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                ไม่มีสินค้า
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 w-12">ID</th>
                      <th className="text-left py-3 px-4">รูปภาพ</th>
                      <th className="text-left py-3 px-4">SKU</th>
                      <th className="text-left py-3 px-4">ชื่อ</th>
                      <th className="text-left py-3 px-4">หมวดหมู่</th>
                      <th className="text-left py-3 px-4">ราคา</th>
                      <th className="text-left py-3 px-4">ต้นทุน</th>
                      <th className="text-left py-3 px-4">สถานะ</th>
                      <th className="text-left py-3 px-4 w-20">บาร์โค้ด</th>
                      <th className="text-left py-3 px-4">การกระทำ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...products]
                      .sort((a, b) => {
                        const skuCmp = (a.sku ?? "").localeCompare(b.sku ?? "");
                        return skuCmp !== 0 ? skuCmp : (a.id ?? 0) - (b.id ?? 0);
                      })
                      .map((product, index, sorted) => {
                        const prevSku = index > 0 ? sorted[index - 1].sku : null;
                        const sameGroup = prevSku != null && prevSku === product.sku;
                        return (
                          <tr
                            key={product.id}
                            className={`border-b hover:bg-muted/50 ${sameGroup ? "bg-muted/20" : ""}`}
                          >
                            <td className="py-3 px-4 text-sm text-muted-foreground font-mono">{product.id}</td>
                            <td className="py-3 px-4">
                              {product.imageUrl ? (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="h-10 w-10 object-cover rounded"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="h-10 w-10 bg-muted rounded" />
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm">{product.sku}</td>
                            <td className="py-3 px-4 font-medium">{product.name}</td>
                            <td className="py-3 px-4 text-sm">
                              {categories.find((c) => c.id === product.categoryId)?.name}
                            </td>
                            <td className="py-3 px-4 font-semibold text-foreground">
                              ฿{parseFloat(product.price).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              ฿{parseFloat(product.cost || "0").toFixed(2)}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`text-xs font-semibold px-2 py-1 rounded ${
                                  product.status === "active"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {product.status === "active" ? "ใช้งาน" : "ปิดใช้งาน"}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {product.barcode?.trim() ? (
                                <span className="inline-flex items-center gap-1 text-green-700" title={product.barcode}>
                                  <Barcode className="h-4 w-4" />
                                  <span className="text-xs">มี</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-muted-foreground" title="ไม่มีบาร์โค้ด">
                                  <Minus className="h-4 w-4" />
                                  <span className="text-xs">ไม่มี</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title={product.barcode ? "พิมพ์บาร์โค้ด" : "ไม่มีบาร์โค้ด"}
                                  disabled={!product.barcode?.trim()}
                                  onClick={() => {
                                    if (!product.barcode?.trim()) return;
                                    setProductForBarcodePrint({
                                      id: product.id,
                                      name: product.name,
                                      price: product.price,
                                      barcode: product.barcode ?? null,
                                    });
                                    setShowBarcodePrint(true);
                                  }}
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title="แก้ไข"
                                  onClick={() => handleOpenDialog(product)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title="ลบ"
                                  onClick={() => handleDeleteProduct(product.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
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
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-6 mt-6">
            {/* Search */}
            <Input
              placeholder="ค้นหาสินค้า..."
              value={inventorySearchTerm}
              onChange={(e) => setInventorySearchTerm(e.target.value)}
            />

            {/* Low Stock Items */}
            {lowStockItems.length > 0 && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="text-orange-900">
                    ⚠️ สินค้าที่ใกล้หมดหรือหมด ({lowStockItems.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {lowStockItems.map((item: any) => (
                      <div
                        key={item.sku ?? item.productId}
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
                            className="font-semibold"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            เพิ่มสต็อก
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
                          const qty = Number(item.quantity) || 0;
                          const minT = Number(item.minThreshold) || 10;
                          const isOut = qty === 0;
                          const isLowStock = qty <= minT && !isOut;
                          const isCritical = isOut || isLowStock;
                          const statusText = isOut ? "หมด" : isLowStock ? "ใกล้หมด" : "ปกติ";
                          return (
                            <tr
                              key={item.sku ?? item.productId}
                              className={`border-b hover:bg-muted/50 ${
                                isCritical ? "bg-orange-50" : ""
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
                                    isOut ? "text-red-600" : isLowStock ? "text-orange-600" : "text-green-600"
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
                                    isOut
                                      ? "bg-red-100 text-red-800"
                                      : isLowStock
                                        ? "bg-orange-100 text-orange-800"
                                        : "bg-green-100 text-green-800"
                                  }`}
                                >
                                  {isOut ? "หมด" : isLowStock ? "⚠️ ใกล้หมด" : "✓ ปกติ"}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                ฿{parseFloat(item.price || "0").toFixed(2)}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex flex-wrap gap-2 items-center">
                                  <Button
                                    size="sm"
                                    variant={isCritical ? "add" : "default"}
                                    onClick={() =>
                                      handleOpenAdjustDialog(item.productId)
                                    }
                                    title="เพิ่ม/ปรับสต๊อก"
                                    className={isCritical ? "font-semibold" : ""}
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Product Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          className="max-w-2xl"
          onInteractOutside={(e) => {
            const el = e.target as HTMLElement;
            if (el?.closest?.('[data-slot="select-content"]') || el?.closest?.('[role="listbox"]')) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* แถวแรก: รูป + SKU + บาร์โค้ด */}
            <div className="grid grid-cols-[auto_1fr_1fr] gap-4 items-end">
              <div>
                <label className="text-sm font-medium">รูป</label>
                <div className="flex gap-2 mt-1">
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="preview" className="h-14 w-14 object-cover rounded border" />
                      <button type="button" onClick={() => { setImagePreview(""); setImageFile(null); }} className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ) : null}
                  <label className="flex items-center justify-center w-14 h-14 border-2 border-dashed rounded cursor-pointer hover:bg-muted shrink-0">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">SKU</label>
                <Input value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} placeholder="เช่น PROD-001" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">บาร์โค้ด</label>
                <RadioGroup value={barcodeSource} onValueChange={(v) => { setBarcodeSource(v as "auto" | "manual"); if (v === "auto") setFormData((p) => ({ ...p, barcode: "" })); }} className="mt-1 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="auto" id="barcode-auto" />
                    <Label htmlFor="barcode-auto" className="font-normal cursor-pointer">สร้างอัตโนมัติ (แนะนำ)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="manual" id="barcode-manual" />
                    <Label htmlFor="barcode-manual" className="font-normal cursor-pointer">ใช้บาร์โค้ดจากผู้ผลิต</Label>
                  </div>
                </RadioGroup>
                {barcodeSource === "manual" && (
                  <>
                    <Input
                      value={formData.barcode ?? ""}
                      onChange={(e) => {
                        const normalized = normalizeEAN13Input(e.target.value, true);
                        setFormData((p) => ({ ...p, barcode: normalized }));
                      }}
                      placeholder="กรอก 12 หลักแรก ระบบจะเติม check digit ให้"
                      className={`mt-1 font-mono ${(formData.barcode ?? "").length === 13 && !validateEAN13(formData.barcode ?? "").valid ? "border-destructive" : ""}`}
                      maxLength={13}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                    />
                    {(formData.barcode ?? "").length === 13 && (() => {
                      const v = validateEAN13(formData.barcode ?? "");
                      return !v.valid && <p className="text-xs text-destructive mt-0.5">{v.error}</p>;
                    })()}
                    <p className="text-xs text-muted-foreground mt-0.5">EAN-13: ตัวเลข 13 หลัก (กรอก 12 หลัก ระบบเติม check digit ให้)</p>
                  </>
                )}
                {barcodeSource === "auto" && <p className="text-xs text-muted-foreground mt-1">ระบบจะสร้างบาร์โค้ดอัตโนมัติเมื่อบันทึก</p>}
              </div>
            </div>

            {/* ชื่อ + หมวด + ราคา + ต้นทุน + สถานะ */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">ชื่อสินค้า</label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="ชื่อสินค้า" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">หมวดหมู่</label>
                <Select
                  value={selectedCategoryIndex >= 0 && selectedCategoryIndex < categories.length ? String(selectedCategoryIndex) : ""}
                  onValueChange={(v) => {
                    const i = parseInt(v, 10);
                    if (!Number.isNaN(i) && categories[i]) {
                      setSelectedCategoryIndex(i);
                      setFormData((prev) => ({ ...prev, categoryId: categories[i].id }));
                    }
                  }}
                >
                  <SelectTrigger className="w-full mt-0 h-11">
                    <SelectValue placeholder="เลือกหมวดหมู่" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    {categories.map((cat, idx) => (
                      <SelectItem key={`cat-${cat.id}-${idx}`} value={String(idx)}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">ราคาขาย</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="text-sm font-medium">ต้นทุน</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) =>
                    setFormData({ ...formData, cost: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="text-sm font-medium">สถานะ</label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as "active" | "inactive",
                    })
                  }
                  className="w-full px-3 py-2 border rounded text-sm"
                >
                  <option value="active">ใช้งาน</option>
                  <option value="inactive">ปิดใช้งาน</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">รายละเอียด</label>
              <textarea
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="รายละเอียดสินค้า"
                className="w-full px-3 py-2 border rounded text-sm min-h-16 resize-y"
                rows={2}
              />
            </div>

            {/* บาร์โค้ด — พับได้, แสดงรูปเฉพาะเมื่อ validate ผ่าน (EAN-13) */}
            {barcodeSource === "manual" && (formData.barcode ?? "").trim() ? (() => {
              const barcodeVal = validateEAN13(formData.barcode ?? "");
              return (
                <Collapsible defaultOpen={false}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between gap-2 py-2 px-3 border rounded-lg bg-muted/30 hover:bg-muted/50 text-left text-sm [&[data-state=open]_svg]:rotate-90"
                    >
                      <span className="font-medium">บาร์โค้ด (EAN-13)</span>
                      <span className="font-mono text-muted-foreground truncate">{formData.barcode}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 transition-transform" />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-3 border rounded-b-lg border-t-0 bg-muted/20 space-y-3">
                      {!barcodeVal.valid ? (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{barcodeVal.error ?? "บาร์โค้ดนี้ไม่ตรงรูปแบบที่เลือก"}</AlertDescription>
                        </Alert>
                      ) : (
                        <>
                          <div className="flex flex-col items-center">
                            <BarcodeDisplay value={formData.barcode!} format="EAN13" width={2} height={44} displayValue={true} />
                            <div className="flex gap-2 mt-2 flex-wrap justify-center">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setProductForBarcodePrint({
                                    id: editingProduct?.id ?? 0,
                                    name: formData.name,
                                    price: formData.price,
                                    barcode: formData.barcode?.trim() || null,
                                  });
                                  setShowBarcodePrint(true);
                                }}
                              >
                                <Printer className="h-4 w-4 mr-2" />
                                พิมพ์บาร์โค้ด
                              </Button>
                              {user?.role === "admin" && editingProduct?.id && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-amber-600 border-amber-300 hover:bg-amber-50"
                                  disabled={regenerateBarcodeMutation.isPending}
                                  onClick={() => editingProduct?.id && regenerateBarcodeMutation.mutate({ productId: editingProduct.id })}
                                >
                                  {regenerateBarcodeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                  สร้างบาร์โค้ดใหม่
                                </Button>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })() : null}

            {/* Buttons */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={handleCloseDialog}
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleSaveProduct}
                disabled={
                  createProductMutation.isPending ||
                  updateProductMutation.isPending
                }
              >
                {createProductMutation.isPending ||
                updateProductMutation.isPending ? (
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

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>เพิ่มหมวดหมู่ใหม่</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">ชื่อหมวดหมู่</label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="เช่น เครื่องดื่ม"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsCategoryDialogOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button
                variant="add"
                onClick={handleAddCategory}
                disabled={createCategoryMutation.isPending}
              >
                {createCategoryMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  "เพิ่มหมวดหมู่"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* จัดการหมวดหมู่ Dialog */}
      <Dialog
        open={isCategoryManageOpen}
        onOpenChange={(open) => {
          setIsCategoryManageOpen(open);
          if (!open) handleCancelCategoryEdit();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>จัดการหมวดหมู่</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {categories.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">ยังไม่มีหมวดหมู่</p>
            ) : (
              categories.map((cat, idx) => (
                <div
                  key={`cat-m-${cat.id}-${idx}`}
                  className="flex items-center gap-2 p-2 border rounded"
                >
                  {editingCategoryId === cat.id ? (
                    <>
                      <Input
                        value={editingCategoryName}
                        onChange={(e) => setEditingCategoryName(e.target.value)}
                        placeholder="ชื่อหมวดหมู่"
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveCategoryEdit}
                        disabled={updateCategoryMutation.isPending}
                      >
                        {updateCategoryMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "บันทึก"
                        )}
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancelCategoryEdit}>
                        ยกเลิก
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 font-medium">{cat.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingCategoryId(cat.id);
                          setEditingCategoryName(cat.name);
                        }}
                        disabled={updateCategoryMutation.isPending || deleteCategoryMutation.isPending}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteCategory(cat)}
                        disabled={updateCategoryMutation.isPending || deleteCategoryMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fixDuplicateIdsMutation.mutate()}
              disabled={fixDuplicateIdsMutation.isPending}
            >
              {fixDuplicateIdsMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              แก้ไข id หมวดหมู่ที่ซ้ำ (ถ้าเลือกแล้วบันทึกกลับเป็น 1)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* พิมพ์บาร์โค้ด — สติ๊กเกอร์ 50×30 mm, 8 ดวงต่อแผ่น A4 */}
      {productForBarcodePrint && (
        <BarcodePrintSheet
          open={showBarcodePrint}
          onOpenChange={setShowBarcodePrint}
          product={productForBarcodePrint}
          copies={8}
        />
      )}
    </DashboardLayout>
  );
}
