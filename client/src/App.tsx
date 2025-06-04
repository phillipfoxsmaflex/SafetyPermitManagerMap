import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
      <Route path="/" component={Dashboard} />
      <Route path="/permits" component={Permits} />
      <Route path="/permit/:id" component={PermitDetails} />
      <Route path="/approvals" component={Approvals} />
      <Route path="/drafts" component={Drafts} />
      <Route path="/settings" component={Settings} />
      <Route path="/user-management" component={UserManagement} />
      <Route path="/login" component={Login} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
