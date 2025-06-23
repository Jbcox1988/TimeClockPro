import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  LogOut, 
  Calendar, 
  Filter, 
  Download,
  Clock,
  Moon,
  Sun
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { exportToCSV, formatPunchesForCSV } from "@/lib/csv-export";

export default function PunchHistory() {
  const [, setLocation] = useLocation();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Set default date range to current month
  useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(firstDay);
    setEndDate(lastDay);
  });

  const { data: punchesData, isLoading } = useQuery({
    queryKey: ["/api/employee/punches", startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString().split('T')[0]);
      if (endDate) params.append('endDate', endDate.toISOString().split('T')[0]);
      
      const response = await fetch(`/api/employee/punches?${params}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch punches");
      }
      
      return response.json();
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/employee/logout", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/");
    },
  });

  const correctionMutation = useMutation({
    mutationFn: async (data: { punchId: string; reason: string }) => {
      const response = await apiRequest("POST", "/api/employee/corrections", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Correction Requested",
        description: "Your correction request has been submitted to management.",
      });
    },
    onError: () => {
      toast({
        title: "Request Failed",
        description: "Failed to submit correction request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const punches = punchesData?.punches || [];

  const handleCorrectionRequest = (punchId: string) => {
    const reason = prompt("Please enter a reason for this correction request:");
    if (reason && reason.trim()) {
      correctionMutation.mutate({ punchId, reason: reason.trim() });
    }
  };

  const calculateTotalHours = () => {
    let totalMinutes = 0;
    const punchPairs = [];
    
    for (let i = 0; i < punches.length; i += 2) {
      const clockIn = punches[i + 1]; // Newest first, so reverse order
      const clockOut = punches[i];
      
      if (clockIn?.punchType === "in" && clockOut?.punchType === "out") {
        const inTime = new Date(clockIn.timestamp);
        const outTime = new Date(clockOut.timestamp);
        const minutes = (outTime.getTime() - inTime.getTime()) / (1000 * 60);
        totalMinutes += minutes;
      }
    }
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    return `${hours}h ${minutes}m`;
  };

  const handleExport = () => {
    if (punches.length === 0) {
      toast({
        title: "No Data",
        description: "No punch data available to export.",
        variant: "destructive",
      });
      return;
    }

    try {
      const csvData = formatPunchesForCSV(punches);
      const filename = `punch-history-${startDate}-to-${endDate}`;
      exportToCSV(csvData, filename);
      
      toast({
        title: "Export Successful",
        description: "Punch history has been exported to CSV.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export punch history.",
        variant: "destructive",
      });
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

      {/* Header */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/employee")}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Punch History
              </h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logoutMutation.mutate()}
              className="text-gray-500 dark:text-gray-400 hover:text-destructive"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Summary */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Date Filter */}
          <Card className="shadow-xl border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="w-5 h-5 mr-2" />
                Filter by Date Range
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Start Date</Label>
                  <DatePicker
                    date={startDate}
                    setDate={setStartDate}
                    placeholder="Select start date"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">End Date</Label>
                  <DatePicker
                    date={endDate}
                    setDate={setEndDate}
                    placeholder="Select end date"
                    className="mt-1"
                  />
                </div>
              </div>
              <Button 
                onClick={handleExport}
                className="w-full"
                disabled={punches.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export to CSV
              </Button>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="shadow-xl border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle>Period Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Hours</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {calculateTotalHours()}
                  </div>
                </div>
                <Clock className="text-primary w-8 h-8" />
              </div>
              
              <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Punches</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {punches.length}
                  </div>
                </div>
                <Calendar className="text-info w-8 h-8" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Punch History Table */}
        <Card className="shadow-xl border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle>Punch Records</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Date & Time
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Location
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        Loading punch history...
                      </td>
                    </tr>
                  ) : punches.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        No punch records found for the selected date range
                      </td>
                    </tr>
                  ) : (
                    punches.map((punch: any) => (
                      <tr key={punch.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {new Date(punch.timestamp).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(punch.timestamp).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge 
                            variant={punch.punchType === "in" ? "default" : "secondary"}
                            className={punch.punchType === "in" ? "bg-accent text-white" : ""}
                          >
                            Clock {punch.punchType === "in" ? "In" : "Out"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {punch.latitude && punch.longitude ? (
                              `${punch.latitude.toFixed(4)}, ${punch.longitude.toFixed(4)}`
                            ) : (
                              "Location unavailable"
                            )}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            IP: {punch.ipAddress}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={punch.flagged ? "destructive" : "default"}>
                            {punch.flagged ? "Flagged" : "Normal"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCorrectionRequest(punch.id)}
                            className="text-xs"
                          >
                            Request Correction
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
