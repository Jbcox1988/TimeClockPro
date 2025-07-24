import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ColorThemeProvider } from "@/components/color-theme-provider";
import EmployeeLogin from "@/pages/employee-login";
import EmployeeDashboard from "@/pages/employee-dashboard";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import EmployeeManagement from "@/pages/employee-management";
import PunchHistory from "@/pages/punch-history";
import PunchManagement from "@/pages/punch-management";
import Settings from "@/pages/settings";
import Reports from "@/pages/reports";
import GeofencingSettings from "@/pages/geofencing-settings";
import CorrectionsManagement from "@/pages/corrections-management";
import EmployeeProfile from "@/pages/employee-profile";
import TimeOffCalendar from "@/pages/time-off-calendar";
import TimeOffManagement from "@/pages/time-off-management";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={EmployeeLogin} />
      <Route path="/employee" component={EmployeeDashboard} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/employees" component={EmployeeManagement} />
      <Route path="/admin/punches" component={PunchManagement} />
      <Route path="/admin/settings" component={Settings} />
      <Route path="/admin/reports" component={Reports} />
      <Route path="/admin/geofencing" component={GeofencingSettings} />
      <Route path="/admin/corrections" component={CorrectionsManagement} />
      <Route path="/admin/time-off" component={TimeOffManagement} />
      <Route path="/employee/history" component={PunchHistory} />
      <Route path="/employee/profile" component={EmployeeProfile} />
      <Route path="/employee/time-off" component={TimeOffCalendar} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ColorThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ColorThemeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
