import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  LogOut, 
  Download, 
  Calendar, 
  Filter,
  BarChart3,
  Users,
  Clock,
  Moon,
  Sun,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { exportToCSV, formatPunchesForCSV, formatEmployeesForCSV } from "@/lib/csv-export";

export default function Reports() {
  const [, setLocation] = useLocation();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [reportType, setReportType] = useState("punches");
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Set default date range to current month
  useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  });

  const { data: punchesData, isLoading: punchesLoading } = useQuery({
    queryKey: ["/api/admin/punches", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/admin/punches?${params}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch punches");
      }
      
      return response.json();
    },
  });

  const { data: employeesData, isLoading: employeesLoading } = useQuery({
    queryKey: ["/api/admin/employees"],
  });

  const { data: statsData } = useQuery({
    queryKey: ["/api/admin/stats"],
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

  const punches = punchesData?.punches || [];
  const employees = employeesData?.employees || [];
  const stats = statsData?.stats;

  // Filter punches by selected employee
  const filteredPunches = selectedEmployee === "all" 
    ? punches 
    : punches.filter((punch: any) => punch.employeeId === selectedEmployee);

  // Create employee lookup map
  const employeeMap = employees.reduce((acc: any, emp: any) => {
    acc[emp.id] = emp;
    return acc;
  }, {});

  // Calculate summary statistics
  const calculateSummaryStats = () => {
    const totalPunches = filteredPunches.length;
    const uniqueEmployees = new Set(filteredPunches.map((p: any) => p.employeeId)).size;
    const flaggedPunches = filteredPunches.filter((p: any) => p.flagged).length;
    
    // Calculate total hours worked
    let totalMinutes = 0;
    const employeePunches: { [key: string]: any[] } = {};
    
    // Group punches by employee
    filteredPunches.forEach((punch: any) => {
      if (!employeePunches[punch.employeeId]) {
        employeePunches[punch.employeeId] = [];
      }
      employeePunches[punch.employeeId].push(punch);
    });
    
    // Calculate hours for each employee
    Object.values(employeePunches).forEach((empPunches: any[]) => {
      // Sort by timestamp
      empPunches.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      for (let i = 0; i < empPunches.length - 1; i += 2) {
        const clockIn = empPunches[i];
        const clockOut = empPunches[i + 1];
        
        if (clockIn?.punchType === "in" && clockOut?.punchType === "out") {
          const inTime = new Date(clockIn.timestamp);
          const outTime = new Date(clockOut.timestamp);
          const minutes = (outTime.getTime() - inTime.getTime()) / (1000 * 60);
          totalMinutes += minutes;
        }
      }
    });
    
    const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
    
    return {
      totalPunches,
      uniqueEmployees,
      flaggedPunches,
      totalHours,
    };
  };

  const summaryStats = calculateSummaryStats();

  const handleExportPunches = () => {
    if (filteredPunches.length === 0) {
      toast({
        title: "No Data",
        description: "No punch data available for the selected criteria.",
        variant: "destructive",
      });
      return;
    }

    try {
      const csvData = formatPunchesForCSV(filteredPunches.map((punch: any) => ({
        ...punch,
        employeeName: employeeMap[punch.employeeId]?.name || "Unknown"
      })));
      
      const employeeName = selectedEmployee === "all" ? "all-employees" : employeeMap[selectedEmployee]?.name || "unknown";
      const filename = `punch-report-${employeeName}-${startDate}-to-${endDate}`;
      
      exportToCSV(csvData, filename);
      
      toast({
        title: "Export Successful",
        description: "Punch report has been exported to CSV.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export punch report.",
        variant: "destructive",
      });
    }
  };

  const handleExportEmployees = () => {
    if (employees.length === 0) {
      toast({
        title: "No Data",
        description: "No employee data available to export.",
        variant: "destructive",
      });
      return;
    }

    try {
      const csvData = formatEmployeesForCSV(employees);
      const filename = `employee-report-${new Date().toISOString().split('T')[0]}`;
      
      exportToCSV(csvData, filename);
      
      toast({
        title: "Export Successful",
        description: "Employee report has been exported to CSV.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export employee report.",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    if (reportType === "punches") {
      handleExportPunches();
    } else {
      handleExportEmployees();
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
      <nav className="bg-secondary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/admin")}
                className="text-gray-300 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-semibold">Reports & Export</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logoutMutation.mutate()}
              className="text-gray-300 hover:text-white"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Reports & Export</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Generate reports and export data to CSV
            </p>
          </div>
        </div>

        {/* Report Filters */}
        <Card className="shadow-xl border border-gray-200 dark:border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="reportType" className="text-sm font-medium">Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="punches">Punch Records</SelectItem>
                    <SelectItem value="employees">Employee List</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {reportType === "punches" && (
                <>
                  <div>
                    <Label htmlFor="employee" className="text-sm font-medium">Employee</Label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Employees</SelectItem>
                        {employees.map((employee: any) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="startDate" className="text-sm font-medium">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="endDate" className="text-sm font-medium">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </>
              )}
              
              <div className="flex items-end">
                <Button 
                  onClick={handleExport}
                  className="bg-primary hover:bg-blue-600 w-full"
                  disabled={punchesLoading || employeesLoading}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Statistics */}
        {reportType === "punches" && (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card className="shadow-lg border border-gray-200 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Punches</div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {summaryStats.totalPunches}
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Clock className="text-primary w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border border-gray-200 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Employees</div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {summaryStats.uniqueEmployees}
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
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Hours</div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {summaryStats.totalHours}h
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-info/10 rounded-xl flex items-center justify-center">
                    <BarChart3 className="text-info w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border border-gray-200 dark:border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Flagged Punches</div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {summaryStats.flaggedPunches}
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center">
                    <FileText className="text-warning w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Report Preview */}
        <Card className="shadow-xl border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle>
              {reportType === "punches" ? "Punch Records Preview" : "Employee Records Preview"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reportType === "punches" ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Employee
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Date & Time
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {punchesLoading ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                          Loading punch records...
                        </td>
                      </tr>
                    ) : filteredPunches.slice(0, 10).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                          No punch records found for the selected criteria
                        </td>
                      </tr>
                    ) : (
                      filteredPunches.slice(0, 10).map((punch: any) => (
                        <tr key={punch.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            {employeeMap[punch.employeeId]?.name || "Unknown"}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              punch.punchType === "in" 
                                ? "bg-accent/10 text-accent" 
                                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                            }`}>
                              Clock {punch.punchType === "in" ? "In" : "Out"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            {new Date(punch.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              punch.flagged 
                                ? "bg-destructive/10 text-destructive" 
                                : "bg-accent/10 text-accent"
                            }`}>
                              {punch.flagged ? "Flagged" : "Normal"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {filteredPunches.length > 10 && (
                  <div className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
                    Showing first 10 of {filteredPunches.length} records. Export to see all data.
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Employee ID
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {employeesLoading ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                          Loading employees...
                        </td>
                      </tr>
                    ) : employees.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                          No employees found
                        </td>
                      </tr>
                    ) : (
                      employees.slice(0, 10).map((employee: any) => (
                        <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                            {employee.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {employee.id.slice(0, 8)}...
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              employee.isActive 
                                ? "bg-accent/10 text-accent" 
                                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                            }`}>
                              {employee.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {employees.length > 10 && (
                  <div className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
                    Showing first 10 of {employees.length} employees. Export to see all data.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
