# POS System - Project TODO

## Phase 1: Database & Architecture
- [x] Design database schema (users, products, categories, inventory, sales, transactions, customers)
- [x] Create Drizzle ORM schema with all tables
- [x] Setup database migrations
- [x] Create database query helpers in server/db.ts

## Phase 2: Backend API (tRPC Procedures)
- [x] Auth procedures (login/logout already done)
- [x] Product management procedures (add/edit/delete/list)
- [x] Category procedures (add/edit/delete/list)
- [x] Inventory procedures (update stock, get history)
- [x] Sales/POS procedures (create transaction, get cart items)
- [x] Customer procedures (add/edit/list, get history)
- [x] Report procedures (daily/monthly/yearly sales, top products)
- [ ] User management procedures (admin only)

## Phase 3: Frontend - Layout & Navigation
- [x] Design elegant color scheme and typography
- [x] Create DashboardLayout with sidebar navigation
- [x] Setup role-based navigation (Admin/Manager/Cashier)
- [x] Create main navigation structure

## Phase 4: Frontend - POS Screen (Sales)
- [x] Create POS sales screen layout
- [x] Product selection interface (grid view with images)
- [x] Shopping cart display
- [x] Price calculation and tax handling
- [x] Payment method selection (cash/transfer/card/e-wallet)
- [ ] Receipt generation and printing
- [ ] Transaction history

## Phase 5: Frontend - Menu Management
- [ ] Product list page (grid/list view)
- [ ] Add product modal/form (name, price, cost, category, image upload)
- [ ] Edit product modal/form
- [ ] Delete product with confirmation
- [ ] Image upload and management
- [ ] Product status toggle (active/inactive)
- [ ] Category management

## Phase 6: Frontend - Inventory & Stock
- [ ] Inventory dashboard
- [ ] Stock level display
- [ ] Low stock alerts
- [ ] Stock adjustment form
- [ ] Stock movement history
- [ ] Inventory reports

## Phase 7: Frontend - User Management & Reports
- [ ] User management page (admin only)
- [ ] User role assignment
- [ ] Activity/audit log
- [ ] Sales reports (daily/monthly/yearly)
- [ ] Top products report
- [ ] Sales by employee report
- [ ] Profit margin analysis
- [ ] Export to PDF/Excel
- [ ] Customer management page
- [ ] Customer history and loyalty points

## Phase 8: Testing & Polish
- [ ] Write vitest tests for critical procedures
- [ ] Test all payment flows
- [ ] Test role-based access control
- [ ] Performance optimization
- [ ] UI/UX refinement
- [ ] Cross-browser testing

## Phase 9: Deployment
- [ ] Final checkpoint
- [ ] Documentation
- [ ] User guide

## Bugs to Fix
- [x] Fix nested anchor tags error in Home.tsx (Link wrapping Button with Link inside)

## Phase 4.1: Products Management Page
- [x] Create Products page with list view
- [x] Add product modal/form (name, price, cost, category, image upload)
- [x] Edit product functionality
- [x] Delete product functionality
- [ ] Image upload to S3
- [x] Category management (create/edit/delete)
- [x] Search and filter products
- [x] Product status management (active/inactive)

## Phase 4.2: Inventory Management Page
- [x] Create Inventory page with stock levels
- [x] Add/adjust stock functionality
- [x] Low stock warning system
- [x] Stock movement history
- [x] Stock adjustment form
- [x] Alert notifications for low stock
- [ ] Inventory reports

## Phase 5: Customer Management (CRM)
- [x] Create Customers page with list view
- [x] Add customer form (name, phone, email, address)
- [x] Edit customer functionality
- [x] Delete customer functionality
- [x] View customer purchase history
- [x] Customer contact information management
- [x] Search and filter customers
- [x] Customer statistics (total purchases, total spent)

## Phase 6: Reports & Analytics
- [x] Create Reports page with date range selector
- [x] Daily sales summary (total sales, transactions, average transaction)
- [x] Monthly sales summary (total sales, transactions, average transaction)
- [x] Yearly sales summary (total sales, transactions, average transaction)
- [x] Top selling products (by quantity and revenue)
- [x] Sales by payment method
- [ ] Sales by cashier/staff
- [ ] Profit analysis (cost vs revenue)
- [ ] Export reports to PDF/Excel
- [x] Charts and visualizations (line chart, bar chart, pie chart)

## Phase 7: Export Reports (PDF/Excel)
- [x] Add export to PDF functionality
- [x] Add export to Excel functionality
- [x] Create PDF report template with company info
- [x] Create Excel report template with formatting
- [x] Add export button to Reports page
- [x] Test PDF/Excel exports

## Phase 8: Discounts & Promotions System
- [x] Create discounts table in database (discount_id, name, type, value, start_date, end_date, active)
- [x] Add discount procedures in tRPC (create, update, delete, list)
- [x] Create Discounts management page
- [x] Add discount types (percentage, fixed amount, product-specific, bill total)
- [ ] Implement discount calculation logic in Sales page
- [ ] Add discount application UI in POS screen
- [x] Test discount calculations

## Phase 9: Loyalty Program (Points System)
- [x] Add loyalty_points field to customers table
- [x] Create loyalty_transactions table to track point changes
- [x] Add procedures for earning points (add points, redeem points, get balance)
- [x] Create Loyalty Program settings (points per baht, point expiration, etc.)
- [ ] Add loyalty points display in Customers page
- [ ] Implement point earning in Sales/POS screen
- [ ] Add point redemption UI in checkout
- [x] Create loyalty points history view
- [x] Test loyalty program calculations

## Phase 10: UI Improvements
- [x] Add back button to all pages (Products, Inventory, Customers, Discounts, Loyalty, Reports)

## Phase 11: User Roles & Permissions Management
- [x] Create Users management page
- [x] Add user creation form (name, email, phone, role, password)
- [x] Edit user functionality
- [x] Delete user functionality
- [x] Role-based access control (Admin, Manager, Cashier)
- [x] Permission matrix (what each role can do)
- [ ] User activity log
- [ ] Password reset functionality
- [x] Test user management

## Phase 12: Email Notification System
- [x] Setup email service (Nodemailer or SendGrid)
- [x] Create email templates for daily sales report
- [x] Create email templates for low stock alerts
- [x] Add email notification procedures in tRPC
- [ ] Create scheduled job for daily sales report
- [ ] Create scheduled job for low stock alerts
- [ ] Add email notification settings page
- [x] Test email notifications

## Phase 13: UI/UX Improvements (Professional & Luxury Design)
- [x] Update color scheme to premium gradient (dark navy to gold/emerald)
- [x] Enhance typography with better font hierarchy
- [x] Add smooth animations and transitions
- [x] Redesign dashboard with premium cards and metrics
- [ ] Improve form designs with better styling
- [ ] Add icons and visual improvements to all pages
- [ ] Enhance table designs with better styling
- [ ] Add loading states and skeletons
- [ ] Improve modal/dialog designs
- [x] Add hover effects and interactive elements
- [x] Optimize spacing and padding throughout
- [x] Add subtle shadows and depth effects

## Phase 14: Receipt Printing System
- [x] Create receipt template table in database (receipt_template_id, name, header_text, footer_text, is_default, created_at)
- [x] Add receipt template procedures in tRPC (create, update, delete, list, get default)
- [x] Create Receipt Template management page
- [x] Add receipt printing functionality in Sales page
- [x] Add editable receipt preview modal
- [x] Implement print dialog and print functionality
- [x] Test receipt printing (43 tests passed)


## Bugs to Fix (Current)
- [x] หน้า Sales ไม่มีช่องใส่จำนวนเงิน (Payment Amount)
- [x] หน้า Sales ไม่แสดงใบเสร็จหลังกดชำระเงิน


## Phase 15: Loyalty Page Improvements
- [x] เพิ่มช่องค้นหาลูกค้าแบบ real-time
- [x] เพิ่มปุ่มด่วนสำหรับเพิ่มคะแนน
- [x] เพิ่มปุ่มด่วนสำหรับแลกคะแนน
- [x] แสดงข้อมูลลูกค้าและคะแนนปัจจุบันชัดเจน
- [x] แสดงประวัติการสะสมคะแนนล่าสุด
- [x] ปรับปรุง UI ให้ใช้งานง่ายขึ้น


## Bugs to Fix (Current Session)
- [x] หน้า Home ส่ง null แทน object ใน API query - TRPCClientError


## Phase 16: Product Images & Advanced Sales Features
- [x] เพิ่มระบบอัพโหลดรูปภาพสินค้า
- [x] แสดงรูปภาพสินค้าในหน้า Sales
- [x] เพิ่มช่องค้นหาลูกค้าในการชำระเงิน
- [x] แสดงคะแนนและส่วนลดของลูกค้า
- [x] เพิ่มระบบใช้ส่วนลดในการชำระเงิน
- [x] เพิ่มระบบแลกคะแนนในการชำระเงิน
- [x] เพิ่มระบบโค้ดส่วนลด (Discount Code)
- [x] จำกัดจำนวนครั้งที่ใช้โค้ดส่วนลด


## Phase 17: Discount Code API & Management
- [x] เพิ่ม API procedures สำหรับสร้างโค้ดส่วนลด
- [x] เพิ่ม API procedures สำหรับตรวจสอบโค้ดส่วนลด
- [x] เพิ่ม API procedures สำหรับอัพเดตจำนวนการใช้
- [x] เพิ่ม API procedures สำหรับลบโค้ดส่วนลด
- [x] เพิ่ม API procedures สำหรับดูรายการโค้ด
- [ ] เขียนหน้า Discount Codes Management
- [x] ทดสอบ discount code procedures (43 tests passed)


## Phase 18: Advanced Dashboard with Discount Code Statistics
- [ ] เพิ่ม API procedures สำหรับสถิติการใช้โค้ดส่วนลด
- [ ] เพิ่ม API procedures สำหรับโค้ดส่วนลดที่ใช้บ่อยที่สุด
- [ ] เขียนหน้า Dashboard ขั้นสูง
- [ ] แสดงสถิติการใช้โค้ดส่วนลด
- [ ] แสดงยอดขายและสินค้าขายดี
- [ ] แสดงลูกค้าใหม่และสต๊อกต่ำ
- [ ] แสดงกิจกรรมล่าสุด
- [ ] ทดสอบ Dashboard
