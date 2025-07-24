import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, User, Phone, Mail, Calendar, Camera, Key, Save, Eye, EyeOff, Download, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/hooks/use-toast";
import { useNavigation } from "@/hooks/use-navigation";
import { apiRequest } from "@/lib/queryClient";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").or(z.literal("")),
  phone: z.string().optional(),
  birthday: z.string().optional(),
  photoUrl: z.string().url("Invalid URL").or(z.literal("")).optional(),
});

const pinChangeSchema = z.object({
  currentPin: z.string().min(4, "PIN must be at least 4 digits").max(6, "PIN must be at most 6 digits"),
  newPin: z.string().min(4, "PIN must be at least 4 digits").max(6, "PIN must be at most 6 digits"),
  confirmPin: z.string().min(4, "PIN must be at least 4 digits").max(6, "PIN must be at most 6 digits"),
}).refine((data) => data.newPin === data.confirmPin, {
  message: "PINs don't match",
  path: ["confirmPin"],
});

const emailExportSchema = z.object({
  email: z.string().email("Invalid email address"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export default function EmployeeProfile() {
  const [, setLocation] = useLocation();
  const [showPinChange, setShowPinChange] = useState(false);
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { navigateToDashboard } = useNavigation();

  const { data: employeeData, isLoading } = useQuery({
    queryKey: ["/api/employee/current"],
  });

  const employee = employeeData?.employee;

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      birthday: "",
      photoUrl: "",
    },
  });

  const pinForm = useForm({
    resolver: zodResolver(pinChangeSchema),
    defaultValues: {
      currentPin: "",
      newPin: "",
      confirmPin: "",
    },
  });

  const emailExportForm = useForm<z.infer<typeof emailExportSchema>>({
    resolver: zodResolver(emailExportSchema),
    defaultValues: {
      email: "",
      startDate: "",
      endDate: "",
    },
  });

  // Reset form when employee data loads
  useEffect(() => {
    if (employee) {
      console.log("Employee data loaded:", employee);
      profileForm.reset({
        name: employee.name || "",
        email: employee.email || "",
        phone: employee.phone || "",
        birthday: employee.birthday || "",
        photoUrl: employee.photoUrl || "",
      });
      
      // Update email export form with employee's email
      emailExportForm.reset({
        email: employee.email || "",
        startDate: "",
        endDate: "",
      });
    }
  }, [employee, profileForm, emailExportForm]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", "/api/employee/profile", data);
      return response.json();
    },
    onSuccess: (updatedEmployee) => {
      console.log("Profile update response:", updatedEmployee);
      
      // Force cache refresh
      queryClient.removeQueries({ queryKey: ["/api/employee/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employee/current"] });
      
      // Reset form with updated data immediately
      if (updatedEmployee?.employee) {
        console.log("Resetting form with:", updatedEmployee.employee);
        profileForm.reset({
          name: updatedEmployee.employee.name || "",
          email: updatedEmployee.employee.email || "",
          phone: updatedEmployee.employee.phone || "",
          birthday: updatedEmployee.employee.birthday || "",
          photoUrl: updatedEmployee.employee.photoUrl || "",
        });
      }
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const changePinMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", "/api/employee/profile", {
        currentPin: data.currentPin,
        newPin: data.newPin
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee/current"] });
      setShowPinChange(false);
      pinForm.reset();
      toast({
        title: "PIN Changed",
        description: "Your PIN has been changed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "PIN Change Failed",
        description: error.message || "Failed to change PIN. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleProfileSubmit = (data: any) => {
    updateProfileMutation.mutate(data);
  };

  const handlePinSubmit = (data: any) => {
    changePinMutation.mutate(data);
  };

  const emailExportMutation = useMutation({
    mutationFn: async (data: z.infer<typeof emailExportSchema>) => {
      const response = await apiRequest("POST", "/api/employee/email-export", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email Sent",
        description: "Your time export has been emailed successfully.",
      });
      emailExportForm.reset({
        email: employee?.email || "",
        startDate: "",
        endDate: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Email Failed",
        description: error.message || "Failed to send email. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEmailExportSubmit = (data: z.infer<typeof emailExportSchema>) => {
    if (!data.email) {
      toast({
        title: "Email Required",
        description: "Please enter an email address to receive the export.",
        variant: "destructive",
      });
      return;
    }
    emailExportMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl mb-8">
          <div className="px-6 py-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateToDashboard()}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  My Profile
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Manage your personal information and settings
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Photo & Basic Info */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-blue-600" />
                  <span>Profile Photo</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <Avatar className="w-32 h-32 mx-auto mb-4">
                    <AvatarImage src={employee?.photoUrl || undefined} alt={employee?.name} />
                    <AvatarFallback className="text-2xl bg-blue-100 text-blue-600">
                      {employee?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {employee?.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Employee ID: #{employee?.pin}
                  </p>
                  <Button
                    onClick={() => setShowPinChange(!showPinChange)}
                    variant="outline"
                    className="w-full"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Change PIN
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* PIN Change Form */}
            {showPinChange && (
              <Card className="shadow-lg mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Key className="w-5 h-5 text-orange-600" />
                    <span>Change PIN</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...pinForm}>
                    <form onSubmit={pinForm.handleSubmit(handlePinSubmit)} className="space-y-4">
                      <FormField
                        control={pinForm.control}
                        name="currentPin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current PIN</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showCurrentPin ? "text" : "password"}
                                  placeholder="Enter current PIN"
                                  {...field}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-0 top-0 h-full px-3"
                                  onClick={() => setShowCurrentPin(!showCurrentPin)}
                                >
                                  {showCurrentPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={pinForm.control}
                        name="newPin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New PIN</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showNewPin ? "text" : "password"}
                                  placeholder="Enter new PIN"
                                  {...field}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-0 top-0 h-full px-3"
                                  onClick={() => setShowNewPin(!showNewPin)}
                                >
                                  {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={pinForm.control}
                        name="confirmPin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm New PIN</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showConfirmPin ? "text" : "password"}
                                  placeholder="Confirm new PIN"
                                  {...field}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-0 top-0 h-full px-3"
                                  onClick={() => setShowConfirmPin(!showConfirmPin)}
                                >
                                  {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowPinChange(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={changePinMutation.isPending}
                          className="flex-1"
                        >
                          {changePinMutation.isPending ? "Changing..." : "Change PIN"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Profile Information */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-blue-600" />
                  <span>Personal Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={profileForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input 
                                  type="email" 
                                  placeholder="Enter your email"
                                  className="pl-10"
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={profileForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input 
                                  type="tel" 
                                  placeholder="Enter your phone number"
                                  className="pl-10"
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={profileForm.control}
                        name="birthday"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Birthday</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                <Input 
                                  type="date" 
                                  className="pl-10"
                                  {...field} 
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={profileForm.control}
                      name="photoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profile Photo URL</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Camera className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input 
                                type="url" 
                                placeholder="Enter photo URL (optional)"
                                className="pl-10"
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        className="min-w-32"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Email Time Export */}
        <div className="mt-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Send className="w-5 h-5 text-green-600" />
                <span>Email Time Export</span>
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Export your punch history and receive it via email as a CSV file
              </p>
            </CardHeader>
            <CardContent>
              <Form {...emailExportForm}>
                <form onSubmit={emailExportForm.handleSubmit(handleEmailExportSubmit)} className="space-y-6">
                  <FormField
                    control={emailExportForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input 
                              type="email" 
                              placeholder="Enter email address to receive export"
                              className="pl-10"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={emailExportForm.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date (Optional)</FormLabel>
                          <FormControl>
                            <DatePicker
                              date={field.value ? new Date(field.value) : undefined}
                              setDate={(date) => field.onChange(date ? date.toISOString().split('T')[0] : "")}
                              placeholder="Select start date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={emailExportForm.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date (Optional)</FormLabel>
                          <FormControl>
                            <DatePicker
                              date={field.value ? new Date(field.value) : undefined}
                              setDate={(date) => field.onChange(date ? date.toISOString().split('T')[0] : "")}
                              placeholder="Select end date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <Download className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Export Information
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                          {emailExportForm.watch('startDate') || emailExportForm.watch('endDate') 
                            ? 'Your time export will include punch records for the selected date range.'
                            : 'Your time export will include all punch records on file.'
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={emailExportMutation.isPending}
                      className="min-w-32"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {emailExportMutation.isPending ? "Sending..." : "Email Export"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}