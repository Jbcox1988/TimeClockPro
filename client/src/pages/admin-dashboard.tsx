import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Shield, 
  LogOut, 
  Users, 
  Clock, 
  BarChart3, 
  Settings, 
  MapPin, 
  Edit, 
  ArrowRight,
  Moon,
  Sun,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "@/hooks/use-theme";
import { apiRequest } from "@/lib/queryClient";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const { data: statsData } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  const { data: settingsData } = useQuery({
    queryKey: ["/api/settings"],
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/logout", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/");
    },
  });

  const stats = statsData?.stats || {
    activeEmployees: 0,
    clockedInToday: 0,
    punchesToday: 0,
    pendingCorrections: 0,
  };

  const settings = settingsData?.settings;

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const navigationItems = [
    {
      title: "Employee Management",
      description: "Add, edit, and manage employee accounts and PINs",
      icon: Users,
      color: "accent",
      href: "/admin/employees",
    },
    {
      title: "Punch Management",
      description: "View, edit, and manage employee punch records",
      icon: Clock,
      color: "info",
      href: "/admin/punches",
    },
    {
      title: "Reports & Export",
      description: "Generate reports and export data to CSV",
      icon: BarChart3,
      color: "primary",
      href: "/admin/reports",
    },
    {
      title: "System Settings",
      description: "Configure company settings, geofencing, and security",
      icon: Settings,
      color: "secondary",
      href: "/admin/settings",
    },
    {
      title: "Geofencing",
      description: "Configure location-based punch restrictions",
      icon: MapPin,
      color: "warning",
      href: "/admin/settings",
    },
    {
      title: "Correction Requests",
      description: "Review and approve employee punch corrections",
      icon: Edit,
      color: "destructive",
      href: "/admin/corrections",
    },
    {
      title: "Time Off Management",
      description: "Review and approve employee time-off requests",
      icon: Calendar,
      color: "info",
      href: "/admin/time-off",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800 transition-colors duration-300">
      {/* Dark Mode Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-yellow-400" />
          ) : (
            <Moon className="h-4 w-4 text-gray-600" />
          )}
        </Button>
      </div>

      {/* Header */}
      <nav className="bg-card border-b shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <Shield className="text-primary w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  {settings?.companyName || "TimeClock Pro"}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Current Time</div>
                <div className="text-lg font-semibold text-foreground">
                  {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/employee")}
                className="text-muted-foreground hover:text-primary"
              >
                <Users className="w-4 h-4 mr-2" />
                Employee View
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => logoutMutation.mutate()}
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-lg border border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Active Employees</div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stats.activeEmployees}
                  </div>
                </div>
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                  <Users className="text-accent w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Clocked In Today</div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stats.clockedInToday}
                  </div>
                </div>
                <div className="w-12 h-12 bg-info/10 rounded-xl flex items-center justify-center">
                  <Clock className="text-info w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Punches Today</div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stats.punchesToday}
                  </div>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <BarChart3 className="text-primary w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Pending Corrections</div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stats.pendingCorrections}
                  </div>
                </div>
                <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center">
                  <Edit className="text-warning w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            const colorClasses = {
              accent: "bg-accent/10 text-accent group-hover:text-accent",
              info: "bg-info/10 text-info group-hover:text-info",
              primary: "bg-primary/10 text-primary group-hover:text-primary",
              secondary: "bg-secondary/10 text-secondary group-hover:text-secondary",
              warning: "bg-warning/10 text-warning group-hover:text-warning",
              destructive: "bg-destructive/10 text-destructive group-hover:text-destructive",
            };

            return (
              <Card
                key={item.title}
                className="shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200 cursor-pointer group"
                onClick={() => setLocation(item.href)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200 ${colorClasses[item.color as keyof typeof colorClasses]}`}>
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <ArrowRight className="text-gray-400 group-hover:text-primary transition-colors duration-200 w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
