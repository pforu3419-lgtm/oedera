import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Home from "@/pages/Home";
import Sales from "@/pages/Sales";
import Products from "@/pages/Products";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Customers from "./pages/Customers";
import Reports from "./pages/Reports";
import Discounts from "./pages/Discounts";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Settings from "./pages/Settings";
import TaxSystem from "./pages/TaxSystem";
import Toppings from "./pages/Toppings";
import JoinStore from "./pages/JoinStore";
import EnterAdminCode from "./pages/EnterAdminCode";
import CreateAdminCodes from "./pages/CreateAdminCodes";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path={"/login"} component={Login} />
      <Route path={"/register"} component={Register} />
      <Route path={"/enter-admin-code"} component={EnterAdminCode} />
      <Route path="/create-admin-code">
        <Redirect to="/create-admin-codes" />
      </Route>
      <Route path={"/create-admin-codes"} component={CreateAdminCodes} />
      <Route path={"/sales"} component={Sales} />
      <Route path={"/products"} component={Products} />
      <Route path={"/inventory"} component={Products} />
      <Route path={"/customers"} component={Customers} />
      <Route path={"/loyalty"} component={Customers} />
      <Route path={"/reports"} component={Reports} />
      <Route path={"/discounts"} component={Discounts} />
      <Route path={"/users"} component={Settings} />
      <Route path={"/receipt-templates"} component={Settings} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/tax/company-profile"} component={TaxSystem} />
      <Route path={"/tax/invoices"} component={TaxSystem} />
      <Route path={"/tax/vat-reports"} component={TaxSystem} />
      <Route path={"/tax/purchase-invoices"} component={TaxSystem} />
      <Route path={"/tax"} component={TaxSystem} />
      <Route path={"/toppings"} component={Toppings} />
      <Route path={"/join-store"} component={JoinStore} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
