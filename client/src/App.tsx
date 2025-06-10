import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "@/pages/dashboard";
import Permits from "@/pages/permits";
import Drafts from "@/pages/drafts";
import Settings from "@/pages/settings";
import PermitDetails from "@/pages/permit-details";
import UserManagement from "@/pages/user-management";
import Approvals from "@/pages/approvals";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/login">
        <ProtectedRoute requireAuth={false}>
          <Login />
        </ProtectedRoute>
      </Route>
      <Route path="/">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/permits">
        <ProtectedRoute>
          <Permits />
        </ProtectedRoute>
      </Route>
      <Route path="/permit/:id">
        <ProtectedRoute>
          <PermitDetails />
        </ProtectedRoute>
      </Route>
      <Route path="/approvals">
        <ProtectedRoute>
          <Approvals />
        </ProtectedRoute>
      </Route>
      <Route path="/drafts">
        <ProtectedRoute>
          <Drafts />
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </Route>
      <Route path="/user-management">
        <ProtectedRoute>
          <UserManagement />
        </ProtectedRoute>
      </Route>
      <Route>
        <ProtectedRoute>
          <NotFound />
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
