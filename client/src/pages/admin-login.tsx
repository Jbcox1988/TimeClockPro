import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Lock, Moon, Sun, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await apiRequest("POST", "/api/admin/login", { password });
      return response.json();
    },
    onSuccess: (data) => {
      setLocation("/admin");
      toast({
        title: "Admin Login Successful",
        description: "Welcome to the admin dashboard",
      });
      
      if (data.isDefaultPassword) {
        toast({
          title: "Security Warning",
          description: "Please change your password immediately for security.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid password. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) {
      loginMutation.mutate(password);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
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

      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-xl border border-gray-200 dark:border-gray-700">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-secondary rounded-full flex items-center justify-center">
                  <Lock className="text-white w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Admin Access
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Enter your administrator password
                </p>
              </div>

              {/* Default Password Warning */}
              <Alert className="mb-6 border-warning/20 bg-warning/10">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-sm text-gray-700 dark:text-gray-300">
                  <div className="font-semibold text-warning mb-1">Security Warning</div>
                  If using the default password, please change it immediately after login for security.
                </AlertDescription>
              </Alert>

              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <Label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="h-12"
                    disabled={loginMutation.isPending}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 font-semibold touch-manipulation"
                  disabled={!password || loginMutation.isPending}
                >
                  <Lock className="w-5 h-5 mr-2" />
                  {loginMutation.isPending ? "Logging in..." : "Access Admin Panel"}
                </Button>
              </form>

              <div className="text-center mt-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation("/")}
                  className="text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-blue-400"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to Employee Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
