import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  ArrowLeft,
  Building,
  Save,
  MapPin,
  Sun,
  Moon,
  Upload,
  Image,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";
import { apiRequest } from "@/lib/queryClient";
import { getCurrentLocation } from "@/lib/geolocation";

const companySchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  logoUrl: z.string().url().optional().or(z.literal("")),
  showCompanyName: z.boolean(),
  showLogo: z.boolean(),
});

const geofencingSchema = z.object({
  geofencingEnabled: z.boolean(),
  geoLat: z.number().optional(),
  geoLon: z.number().optional(),
  geoRadius: z.number().min(10, "Radius must be at least 10 meters"),
});

export default function Settings() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("company");

  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["/api/settings"],
  });

  const settings = settingsData?.settings;

  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/admin/settings", data),
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Your changes have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const companyForm = useForm({
    resolver: zodResolver(companySchema),
    defaultValues: {
      companyName: settings?.companyName || "",
      logoUrl: settings?.logoUrl || "",
      showCompanyName: settings?.showCompanyName ?? true,
      showLogo: settings?.showLogo ?? true,
    },
  });

  const geofencingForm = useForm({
    resolver: zodResolver(geofencingSchema),
    defaultValues: {
      geofencingEnabled: settings?.geofencingEnabled || false,
      geoLat: settings?.geoLat || undefined,
      geoLon: settings?.geoLon || undefined,
      geoRadius: settings?.geoRadius || 500,
    },
  });

  // Update form defaults when settings load
  useEffect(() => {
    if (settings) {
      companyForm.reset({
        companyName: settings.companyName,
        logoUrl: settings.logoUrl || "",
        showCompanyName: settings.showCompanyName ?? true,
        showLogo: settings.showLogo ?? true,
      });
      geofencingForm.reset({
        geofencingEnabled: settings.geofencingEnabled,
        geoLat: settings.geoLat,
        geoLon: settings.geoLon,
        geoRadius: settings.geoRadius || 500,
      });
    }
  }, [settings, companyForm, geofencingForm]);

  const onCompanySubmit = (data: any) => {
    updateSettingsMutation.mutate(data);
  };

  const onGeofencingSubmit = (data: any) => {
    updateSettingsMutation.mutate(data);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleGetCurrentLocation = async () => {
    try {
      const location = await getCurrentLocation();
      geofencingForm.setValue("geoLat", location.latitude);
      geofencingForm.setValue("geoLon", location.longitude);
      toast({
        title: "Location Retrieved",
        description: "Current location has been set as the safe zone center.",
      });
    } catch (error) {
      toast({
        title: "Location Error",
        description: "Failed to get current location. Please check your permissions.",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if it's an image file
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }

      // Convert to data URL for immediate preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        companyForm.setValue("logoUrl", dataUrl);
        toast({
          title: "Logo Uploaded",
          description: "Your logo has been uploaded successfully.",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Dark Mode Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="bg-background shadow-lg hover:shadow-xl transition-all duration-300 border"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-yellow-400" />
          ) : (
            <Moon className="h-4 w-4 text-foreground" />
          )}
        </Button>
      </div>

      {/* Header */}
      <nav className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/admin")}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center space-x-2">
                <Building className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-semibold text-foreground">System Settings</h1>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/employee")}
              className="text-muted-foreground hover:text-primary"
            >
              Employee View
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="company" className="text-sm">Company</TabsTrigger>
            <TabsTrigger value="geofencing" className="text-sm">Geofencing</TabsTrigger>
          </TabsList>

          {/* Company Settings */}
          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="w-5 h-5" />
                  <span>Company Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...companyForm}>
                  <form onSubmit={companyForm.handleSubmit(onCompanySubmit)} className="space-y-6">
                    <FormField
                      control={companyForm.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input {...field} className="h-12" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={companyForm.control}
                      name="logoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Logo</FormLabel>
                          <FormControl>
                            <div className="space-y-3">
                              <Input {...field} className="h-12" placeholder="https://example.com/logo.png or upload file below" />
                              
                              <div className="flex items-center gap-3">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleFileUpload}
                                  className="hidden"
                                  id="logo-upload"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => document.getElementById('logo-upload')?.click()}
                                >
                                  <Upload className="w-4 h-4 mr-2" />
                                  Upload Logo
                                </Button>
                                
                                {field.value && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Image className="w-4 h-4" />
                                    Logo uploaded
                                  </div>
                                )}
                              </div>
                              
                              {field.value && (
                                <div className="mt-2">
                                  <img 
                                    src={field.value} 
                                    alt="Logo preview" 
                                    className="h-16 object-contain border rounded"
                                  />
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Display Options</h3>
                      
                      <FormField
                        control={companyForm.control}
                        name="showCompanyName"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Show Company Name</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Display company name on login screen
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={companyForm.control}
                        name="showLogo"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Show Company Logo</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Display logo on login screen (fallback to clock icon if no URL)
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="bg-primary hover:bg-primary/90"
                      disabled={updateSettingsMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Company Settings
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Geofencing Settings */}
          <TabsContent value="geofencing">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5" />
                  <span>Geofencing Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert className="mb-6">
                  <MapPin className="h-4 w-4" />
                  <AlertDescription>
                    Enable geofencing to restrict clock-ins/outs to specific locations. Employees must be within the defined radius to punch in or out.
                  </AlertDescription>
                </Alert>
                
                <Form {...geofencingForm}>
                  <form onSubmit={geofencingForm.handleSubmit(onGeofencingSubmit)} className="space-y-6">
                    <FormField
                      control={geofencingForm.control}
                      name="geofencingEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Enable Geofencing</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Restrict punches to specific locations
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {geofencingForm.watch("geofencingEnabled") && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={geofencingForm.control}
                            name="geoLat"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Latitude</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="any"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                    className="h-12" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={geofencingForm.control}
                            name="geoLon"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Longitude</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="any"
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                    className="h-12" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={geofencingForm.control}
                          name="geoRadius"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Radius (meters)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  className="h-12" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleGetCurrentLocation}
                          className="w-full"
                        >
                          <MapPin className="w-4 h-4 mr-2" />
                          Use Current Location
                        </Button>
                      </>
                    )}

                    <Button 
                      type="submit" 
                      className="bg-primary hover:bg-primary/90"
                      disabled={updateSettingsMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Geofencing Settings
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}