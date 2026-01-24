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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Loader2, Plus, Edit2, Trash2, Upload, X, ArrowLeft, AlertTriangle, History, Package, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface ProductForm {
  id?: number;
  sku: string;
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
  const [activeTab, setActiveTab] = useState("products");
  
  // Products state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductForm | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [formData, setFormData] = useState<ProductForm>({
    sku: "",
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
      categoryId: selectedCategory,
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
      console.log("[deleteProductMutation] onSuccess - invalidating queries");
      // Invalidate all related queries
      await utils.products.list.invalidate();
      await utils.inventory.list.invalidate();
      console.log("[deleteProductMutation] Queries invalidated");
    },
    onError: async (error) => {
      console.error("[deleteProductMutation] Error:", error);
      // Refetch on error to restore state
      await productsQuery.refetch();
    },
  });
  const createCategoryMutation = trpc.categories.create.useMutation({
    onSuccess: () => {
      utils.categories.list.invalidate();
    },
  });
  const adjustStockMutation = trpc.inventory.adjustStock.useMutation({
    onSuccess: () => {
      utils.inventory.list.invalidate();
    },
  });

  const categories = categoriesQuery.data || [];
  // Products are now actually deleted from database, so no need to filter by status
  const products = productsQuery.data || [];
  console.log("[Products] Total products from query:", products.length);
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
      console.log("[handleOpenDialog] Opening dialog for product:", product.id, product.name);
      setEditingProduct(product);
      setFormData({
        id: product.id,
        sku: product.sku,
        name: product.name,
        description: product.description,
        categoryId: product.categoryId,
        price: product.price,
        cost: product.cost,
        imageUrl: product.imageUrl || undefined, // Store current imageUrl
        status: product.status,
      });
      setImagePreview(product.imageUrl || "");
      setImageFile(null); // Clear any previous file selection
    } else {
      console.log("[handleOpenDialog] Opening dialog for new product");
      setEditingProduct(null);
      setFormData({
        sku: "",
        name: "",
        categoryId: 1,
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

    try {
      let imageUrl = formData.imageUrl;

      if (imageFile) {
        try {
          console.log("[handleSaveProduct] Starting image upload...");
          const formDataForUpload = new FormData();
          formDataForUpload.append("file", imageFile);
          
          const uploadResponse = await fetch("/api/upload", {
            method: "POST",
            body: formDataForUpload,
          });

          console.log("[handleSaveProduct] Upload response status:", uploadResponse.status);

          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error("[handleSaveProduct] Upload error:", errorText);
            toast.error(`อัปโหลดภาพล้มเหลว: ${errorText}`);
            // Don't throw error - just skip image upload
            console.warn("[handleSaveProduct] Skipping image upload due to error");
            imageUrl = formData.imageUrl; // Keep existing imageUrl if upload fails
          } else {
            try {
              const uploadData = await uploadResponse.json();
              console.log("[handleSaveProduct] Upload response data:", uploadData);
              
              if (uploadData && uploadData.url) {
                imageUrl = uploadData.url;
                console.log("[handleSaveProduct] Image URL set to:", imageUrl);
              } else {
                console.warn("[handleSaveProduct] No URL in upload response:", uploadData);
                toast.error("ไม่ได้รับ URL ของภาพจากเซิร์ฟเวอร์");
                imageUrl = formData.imageUrl; // Keep existing imageUrl
              }
            } catch (jsonError) {
              console.error("[handleSaveProduct] JSON parse error:", jsonError);
              toast.error("ไม่สามารถอ่านข้อมูลจากเซิร์ฟเวอร์");
              imageUrl = formData.imageUrl; // Keep existing imageUrl
            }
          }
        } catch (uploadError) {
          console.error("[handleSaveProduct] Upload exception:", uploadError);
          toast.error(`เกิดข้อผิดพลาดในการอัปโหลด: ${uploadError instanceof Error ? uploadError.message : "Unknown error"}`);
          // Don't throw error - just skip image upload
          imageUrl = formData.imageUrl; // Keep existing imageUrl
        }
      }

      const productData: any = {
        ...formData,
        price: String(formData.price || "0"),
        cost: formData.cost ? String(formData.cost) : undefined,
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

      console.log("[handleSaveProduct] Product data:", productData);
      console.log("[handleSaveProduct] Editing product ID:", editingProduct?.id);
      console.log("[handleSaveProduct] Image URL:", imageUrl);
      console.log("[handleSaveProduct] FormData imageUrl:", formData.imageUrl);
      console.log("[handleSaveProduct] Has imageFile:", !!imageFile);

      if (editingProduct) {
        await updateProductMutation.mutateAsync({
          id: editingProduct.id!,
          ...productData,
        });
        toast.success("อัปเดตสินค้าสำเร็จ");
      } else {
        console.log("[handleSaveProduct] Creating product...");
        const result = await createProductMutation.mutateAsync(productData);
        console.log("[handleSaveProduct] Product created:", result);
        toast.success("เพิ่มสินค้าสำเร็จ");
      }
      handleCloseDialog();
      // Queries will be automatically refetched via invalidate in onSuccess callbacks
    } catch (error: any) {
      console.error("[handleSaveProduct] Error details:", error);
      const errorMessage = error?.message || error?.data?.message || "เกิดข้อผิดพลาดในการบันทึก";
      toast.error(errorMessage);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("คุณแน่ใจหรือว่าต้องการลบสินค้านี้?")) return;

    try {
      console.log("[handleDeleteProduct] Attempting to delete product ID:", id);
      
      // Optimistic update: remove from UI immediately
      const currentProducts = productsQuery.data || [];
      const updatedProducts = currentProducts.filter((p: any) => p.id !== id);
      
      // Update cache optimistically
      utils.products.list.setData(
        { categoryId: selectedCategory, search: searchTerm },
        updatedProducts
      );
      
      console.log("[handleDeleteProduct] Optimistic update applied - product removed from UI");
      
      // Then call the mutation to delete from database
      await deleteProductMutation.mutateAsync({ id });
      console.log("[handleDeleteProduct] Delete mutation completed");
      
      // Force refetch to ensure data is synced with backend
      await utils.products.list.invalidate();
      await utils.inventory.list.invalidate();
      await new Promise(resolve => setTimeout(resolve, 200));
      await productsQuery.refetch();
      
      console.log("[handleDeleteProduct] Products list refetched");
      toast.success("ลบสินค้าสำเร็จ");
    } catch (error: any) {
      console.error("[handleDeleteProduct] Error details:", error);
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
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการเพิ่มหมวดหมู่");
      console.error(error);
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
      reason: "",
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
      await adjustStockMutation.mutateAsync({
        productId: adjustment.productId,
        quantity,
        type: adjustment.type,
        reason: adjustment.reason,
      });

      toast.success("ปรับปรุงสต๊อกสำเร็จ");
      setIsAdjustDialogOpen(false);
      await inventoryQuery.refetch();
    } catch (error) {
      toast.error("เกิดข้อผิดพลาดในการปรับปรุงสต๊อก");
      console.error(error);
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
              className="hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">สินค้าและสต๊อก</h1>
              <p className="text-muted-foreground">จัดการเมนูสินค้าและสต๊อกสินค้าคงคลัง</p>
            </div>
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              จัดการเมนู
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Warehouse className="h-4 w-4" />
              สต๊อกสินค้า
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6 mt-6">
            <div className="flex justify-end gap-2">
            <Button variant="add" onClick={() => setIsCategoryDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              เพิ่มหมวดหมู่
            </Button>
            <Button variant="add" onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              เพิ่มสินค้า
            </Button>
        </div>

        {/* Search & Filter */}
        <div className="space-y-3">
          <Input
            placeholder="ค้นหาสินค้า..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedCategory === undefined ? "default" : "outline"}
              onClick={() => setSelectedCategory(undefined)}
              size="sm"
            >
              ทั้งหมด
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(category.id)}
                size="sm"
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
                      <th className="text-left py-3 px-4">รูปภาพ</th>
                      <th className="text-left py-3 px-4">SKU</th>
                      <th className="text-left py-3 px-4">ชื่อ</th>
                      <th className="text-left py-3 px-4">หมวดหมู่</th>
                      <th className="text-left py-3 px-4">ราคา</th>
                      <th className="text-left py-3 px-4">ต้นทุน</th>
                      <th className="text-left py-3 px-4">สถานะ</th>
                      <th className="text-left py-3 px-4">การกระทำ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="h-10 w-10 object-cover rounded"
                              onError={(e) => {
                                console.error("[Products] Image load error:", product.imageUrl);
                                e.currentTarget.style.display = "none";
                              }}
                              onLoad={() => {
                                console.log("[Products] Image loaded successfully:", product.imageUrl);
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
                        <td className="py-3 px-4 font-semibold text-accent">
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
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenDialog(product)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
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
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      handleOpenAdjustDialog(item.productId)
                                    }
                                    title="ปรับปรุงสต๊อก"
                                  >
                                    <Edit2 className="h-4 w-4" />
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Image Upload */}
            <div>
              <label className="text-sm font-medium">รูปภาพ</label>
              <div className="mt-2 flex gap-4">
                {imagePreview && (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="preview"
                      className="h-24 w-24 object-cover rounded"
                    />
                    <button
                      onClick={() => {
                        setImagePreview("");
                        setImageFile(null);
                      }}
                      className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <label className="flex items-center justify-center w-24 h-24 border-2 border-dashed rounded cursor-pointer hover:bg-muted">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">SKU</label>
                <Input
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  placeholder="เช่น PROD-001"
                />
              </div>

              <div>
                <label className="text-sm font-medium">ชื่อสินค้า</label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="ชื่อสินค้า"
                />
              </div>

              <div>
                <label className="text-sm font-medium">หมวดหมู่</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      categoryId: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border rounded text-sm"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
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
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="รายละเอียดสินค้า"
                className="w-full px-3 py-2 border rounded text-sm min-h-24"
              />
            </div>

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
                className="mt-1"
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
