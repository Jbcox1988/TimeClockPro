import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import { CompanyBranding } from "@/components/company-branding";
import { PinKeypad } from "@/components/pin-keypad";
import { apiRequest } from "@/lib/queryClient";

export default function EmployeeLogin() {
  const [, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (pin: string) => {
      const response = await apiRequest("POST", "/api/employee/login", { pin });
      return response.json();
    },
    onSuccess: () => {
      setLocation("/employee");
      toast({
        title: "Login Successful",
        description: "Welcome to TimeClock Pro",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid PIN. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePinSubmit = (pin: string) => {
    loginMutation.mutate(pin);
  };



  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

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

      {/* Main Content */}
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <CompanyBranding />
          <PinKeypad
            onPinSubmit={handlePinSubmit}
            onAdminClick={() => {}}
            loading={loginMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}
