import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  ArrowLeft, 
  LogOut, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Pause, 
  Trash2,
  Moon,
  Sun,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useNavigation } from "@/hooks/use-navigation";
import { insertEmployeeSchema } from "@shared/schema";

const employeeFormSchema = insertEmployeeSchema.extend({
  pin: z.string().min(4, "PIN must be at least 4 digits").max(6, "PIN must be at most 6 digits"),
});

export default function EmployeeManagement() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { navigateToDashboard } = useNavigation();

  const { data: employeesData, isLoading } = useQuery({
    queryKey: ["/api/admin/employees"],
  });

  const form = useForm({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: "",
      pin: "",
      isActive: true,
      isAdmin: false,
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

  const createEmployeeMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/admin/employees", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employees"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "Employee Created",
        description: "New employee has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Creation Failed",
        description: "Failed to create employee. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PUT", `/api/admin/employees/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employees"] });
      setEditingEmployee(null);
      toast({
        title: "Employee Updated",
        description: "Employee information has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update employee. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/admin/employees/${id}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/employees"] });
      toast({
        title: "Employee Deleted",
        description: "Employee has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Deletion Failed",
        description: "Failed to delete employee. Please try again.",
        variant: "destructive",
      });
    },
  });

  const employees = employeesData?.employees || [];

  const handleAddEmployee = (data: any) => {
    createEmployeeMutation.mutate(data);
  };

  const handleEditEmployee = (employee: any) => {
    setEditingEmployee(employee);
    form.reset({
      name: employee.name,
      pin: employee.pin,
      isActive: employee.isActive,
      isAdmin: employee.isAdmin,
    });
  };

  const handleUpdateEmployee = (data: any) => {
    if (editingEmployee) {
      updateEmployeeMutation.mutate({ id: editingEmployee.id, data });
    }
  };

  const handleDeleteEmployee = (employeeId: string, employeeName: string) => {
    const adminPin = prompt(`To delete ${employeeName}, please enter your admin PIN:`);
    if (adminPin) {
      // In a real implementation, you'd verify the PIN here
      if (confirm(`Are you sure you want to delete ${employeeName}? This action cannot be undone.`)) {
        deleteEmployeeMutation.mutate(employeeId);
      }
    }
  };

  const filteredEmployees = employees.filter((employee: any) => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && employee.isActive) ||
                         (statusFilter === "inactive" && !employee.isActive);
    return matchesSearch && matchesStatus;
  });

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
              <h1 className="text-lg font-semibold">Employee Management</h1>
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Employee Management</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage employee accounts, PINs, and access permissions
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-green-600 text-white font-semibold touch-manipulation">
                <Plus className="w-5 h-5 mr-2" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleAddEmployee)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter full name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PIN (4-6 digits)</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" placeholder="Enter PIN" maxLength={6} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <FormLabel>Active Employee</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isAdmin"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <FormLabel>Admin Access</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createEmployeeMutation.isPending}>
                      {createEmployeeMutation.isPending ? "Adding..." : "Add Employee"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Employee Table */}
        <Card className="shadow-xl border border-gray-200 dark:border-gray-700">
          <CardHeader className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search employees..."
                    className="pl-10 w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="inactive">Inactive Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Employee
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      PIN
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Last Punch
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        Loading employees...
                      </td>
                    </tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        No employees found
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((employee: any) => (
                      <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mr-3">
                              <span className="text-white font-semibold text-sm">
                                {employee.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                {employee.name}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                ID: {employee.id.slice(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm text-gray-900 dark:text-white">
                            ****
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={employee.isActive ? "default" : "secondary"}>
                            {employee.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white">N/A</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">No recent punches</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditEmployee(employee)}
                              className="text-info hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => updateEmployeeMutation.mutate({ 
                                id: employee.id, 
                                data: { isActive: !employee.isActive } 
                              })}
                              className="text-warning hover:text-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                            >
                              <Pause className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteEmployee(employee.id, employee.name)}
                              className="text-destructive hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredEmployees.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {filteredEmployees.length} of {employees.length} employees
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

        {/* Edit Employee Dialog */}
        <Dialog open={!!editingEmployee} onOpenChange={() => setEditingEmployee(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Employee</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleUpdateEmployee)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter full name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PIN (4-6 digits)</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="Enter PIN" maxLength={6} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Active Employee</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isAdmin"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <FormLabel>Admin Access</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setEditingEmployee(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateEmployeeMutation.isPending}>
                    {updateEmployeeMutation.isPending ? "Updating..." : "Update Employee"}
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
