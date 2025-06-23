import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  ArrowLeft, 
  LogOut, 
  Search, 
  Filter,
  Edit,
  Trash2,
  MapPin,
  Calendar,
  Moon,
  Sun,
  Download,
  X,
  Plus,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { exportToCSV, formatPunchesForCSV } from "@/lib/csv-export";
import { useNavigation } from "@/hooks/use-navigation";

const punchEditSchema = z.object({
  timestamp: z.date(),
  punchType: z.enum(["in", "out"]),
  flagged: z.boolean(),
});

const manualPunchSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  timestamp: z.date(),
  punchType: z.enum(["in", "out"]),
  note: z.string().optional(),
});

export default function PunchManagement() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [flaggedFilter, setFlaggedFilter] = useState("all");
  const [editingPunch, setEditingPunch] = useState<any>(null);
  const [showManualPunch, setShowManualPunch] = useState(false);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { navigateToDashboard } = useNavigation();

  const form = useForm({
    resolver: zodResolver(punchEditSchema),
    defaultValues: {
      timestamp: new Date(),
      punchType: "in" as const,
      flagged: false,
    },
  });

  const manualPunchForm = useForm({
    resolver: zodResolver(manualPunchSchema),
    defaultValues: {
      employeeId: "",
      timestamp: new Date(),
      punchType: "in" as const,
      note: "",
    },
  });

  const { data: punchesData, isLoading } = useQuery({
    queryKey: ["/api/admin/punches", startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate.toISOString().split('T')[0]);
      if (endDate) params.append('endDate', endDate.toISOString().split('T')[0]);
      
      const response = await fetch(`/api/admin/punches?${params}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch punches");
      }
      
      return response.json();
    },
  });

  const { data: employeesData } = useQuery({
    queryKey: ["/api/admin/employees"],
  });

  const deletePunchMutation = useMutation({
    mutationFn: async (punchId: string) => {
      const response = await apiRequest("DELETE", `/api/admin/punches/${punchId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/punches"] });
      toast({
        title: "Punch Deleted",
        description: "The punch record has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete punch record.",
        variant: "destructive",
      });
    },
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

  const updatePunchMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PUT", `/api/admin/punches/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/punches"] });
      setEditingPunch(null);
      toast({
        title: "Punch Updated",
        description: "Punch record has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update punch record. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createManualPunchMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/admin/punches/manual", {
        employeeId: data.employeeId,
        timestamp: data.timestamp.toISOString(),
        punchType: data.punchType,
        note: data.note || `Manual entry by admin`
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/punches"] });
      setShowManualPunch(false);
      manualPunchForm.reset();
      toast({
        title: "Manual Punch Added",
        description: "Punch record has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Creation Failed",
        description: "Failed to create punch record. Please try again.",
        variant: "destructive",
      });
    },
  });

  const punches = punchesData?.punches || [];
  const employees = employeesData?.employees || [];

  // Create employee lookup map
  const employeeMap = employees.reduce((acc: any, emp: any) => {
    acc[emp.id] = emp;
    return acc;
  }, {});

  const handleEditPunch = (punch: any) => {
    setEditingPunch(punch);
    form.reset({
      timestamp: new Date(punch.timestamp),
      punchType: punch.punchType,
      flagged: punch.flagged,
    });
  };

  const handleUpdatePunch = (data: any) => {
    if (editingPunch) {
      updatePunchMutation.mutate({ 
        id: editingPunch.id, 
        data: {
          timestamp: data.timestamp.toISOString(),
          punchType: data.punchType,
          flagged: data.flagged,
        }
      });
    }
  };

  const handleDeletePunch = (punchId: string, employeeName: string) => {
    if (confirm(`Are you sure you want to delete this punch record for ${employeeName}? This action cannot be undone.`)) {
      deletePunchMutation.mutate(punchId);
    }
  };

  const filteredPunches = punches.filter((punch: any) => {
    const employee = employeeMap[punch.employeeId];
    const matchesSearch = employee?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         punch.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFlagged = flaggedFilter === "all" || 
                          (flaggedFilter === "flagged" && punch.flagged) ||
                          (flaggedFilter === "normal" && !punch.flagged);
    return matchesSearch && matchesFlagged;
  });

  const handleExport = () => {
    if (filteredPunches.length === 0) {
      toast({
        title: "No Data",
        description: "No punch data available to export.",
        variant: "destructive",
      });
      return;
    }

    try {
      const csvData = formatPunchesForCSV(filteredPunches.map((punch: any) => ({
        ...punch,
        employeeName: employeeMap[punch.employeeId]?.name || "Unknown"
      })));
      const filename = `punch-management-${new Date().toISOString().split('T')[0]}`;
      exportToCSV(csvData, filename);
      
      toast({
        title: "Export Successful",
        description: "Punch data has been exported to CSV.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export punch data.",
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
      <nav className="bg-secondary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateToDashboard()}
                className="text-gray-300 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-semibold">Punch Management</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/employee")}
                className="text-gray-300 hover:text-white border-gray-300"
              >
                Employee View
              </Button>
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
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Punch Management</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              View, edit, and manage employee punch records
            </p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <Button 
              onClick={() => setShowManualPunch(true)} 
              className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Manual Punch
            </Button>
            <Button onClick={handleExport} className="bg-primary hover:bg-blue-600 text-white w-full sm:w-auto">
              <Download className="w-5 h-5 mr-2" />
              Export Data
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="shadow-xl border border-gray-200 dark:border-gray-700 mb-8">
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search" className="text-sm font-medium">Search</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search by employee or ID..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
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
              
              <div>
                <Label htmlFor="flaggedFilter" className="text-sm font-medium">Status</Label>
                <Select value={flaggedFilter} onValueChange={setFlaggedFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Punches</SelectItem>
                    <SelectItem value="normal">Normal Only</SelectItem>
                    <SelectItem value="flagged">Flagged Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Punch Table */}
        <Card className="shadow-xl border border-gray-200 dark:border-gray-700">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Employee
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Date & Time
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
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        Loading punch records...
                      </td>
                    </tr>
                  ) : filteredPunches.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        No punch records found
                      </td>
                    </tr>
                  ) : (
                    filteredPunches.map((punch: any) => {
                      const employee = employeeMap[punch.employeeId];
                      
                      return (
                        <tr key={punch.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mr-3">
                                <span className="text-white font-semibold text-sm">
                                  {employee?.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() || "?"}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {employee?.name || "Unknown Employee"}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  ID: {punch.employeeId.slice(0, 8)}...
                                </div>
                              </div>
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
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {new Date(punch.timestamp).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {new Date(punch.timestamp).toLocaleTimeString()}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {punch.latitude && punch.longitude ? (
                                <div className="flex items-center">
                                  <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                                  {punch.latitude.toFixed(4)}, {punch.longitude.toFixed(4)}
                                </div>
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
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditPunch(punch)}
                                className="text-info hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeletePunch(punch.id, employeeMap[punch.employeeId]?.name || 'Unknown')}
                                className="text-destructive hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                disabled={deletePunchMutation.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {filteredPunches.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {filteredPunches.length} of {punches.length} punch records
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" disabled>
                      Previous
                    </Button>
                    <Button variant="default" size="sm">
                      1
                    </Button>
                    <Button variant="ghost" size="sm" disabled>
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Punch Dialog */}
        <Dialog open={!!editingPunch} onOpenChange={() => setEditingPunch(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Punch Record</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleUpdatePunch)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="timestamp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date & Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          value={field.value ? new Date(field.value.getTime() - field.value.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="punchType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Punch Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select punch type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="in">Clock In</SelectItem>
                          <SelectItem value="out">Clock Out</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setEditingPunch(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updatePunchMutation.isPending}>
                    {updatePunchMutation.isPending ? "Updating..." : "Update Punch"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Manual Punch Creation Dialog */}
        <Dialog open={showManualPunch} onOpenChange={setShowManualPunch}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Manual Punch</DialogTitle>
            </DialogHeader>
            <Form {...manualPunchForm}>
              <form onSubmit={manualPunchForm.handleSubmit((data) => createManualPunchMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={manualPunchForm.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees.map((employee: any) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.name} (#{employee.employeeId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={manualPunchForm.control}
                  name="timestamp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date & Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          value={field.value ? new Date(field.value.getTime() - field.value.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={manualPunchForm.control}
                  name="punchType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Punch Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select punch type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="in">Clock In</SelectItem>
                          <SelectItem value="out">Clock Out</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={manualPunchForm.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Reason for manual entry..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setShowManualPunch(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createManualPunchMutation.isPending}>
                    {createManualPunchMutation.isPending ? "Creating..." : "Create Punch"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
