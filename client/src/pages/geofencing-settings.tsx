import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Save, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function GeofencingSettings() {
  const [, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["/api/settings"],
  });

  const settings = settingsData?.settings;

  const [formData, setFormData] = useState({
    geofencingEnabled: settings?.geofencingEnabled || false,
    geoLat: settings?.geoLat || "",
    geoLon: settings?.geoLon || "",
    geoRadius: settings?.geoRadius || 500,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", "/api/admin/settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings Updated",
        description: "Geofencing settings have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update settings.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(formData);
  };

  const getCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            geoLat: position.coords.latitude.toString(),
            geoLon: position.coords.longitude.toString(),
          });
          toast({
            title: "Location Retrieved",
            description: "Current location has been set as the geofence center.",
          });
        },
        (error) => {
          toast({
            title: "Location Error",
            description: "Unable to retrieve current location. Please enter coordinates manually.",
            variant: "destructive",
          });
        }
      );
    } else {
      toast({
        title: "Geolocation Not Supported",
        description: "Your browser doesn't support geolocation.",
        variant: "destructive",
      });
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/employee")}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Geofencing Settings
              </h1>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="bg-white dark:bg-gray-800"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-yellow-400" />
              ) : (
                <Moon className="h-4 w-4 text-gray-600" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="shadow-xl border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <MapPin className="w-6 h-6 mr-3 text-primary" />
              Geofencing Configuration
            </CardTitle>
            <p className="text-gray-600 dark:text-gray-400">
              Configure location-based punch restrictions for your workplace
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Enable Geofencing */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <Label className="text-base font-medium text-gray-900 dark:text-white">
                    Enable Geofencing
                  </Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Restrict clock in/out to specific geographic location
                  </p>
                </div>
                <Switch
                  checked={formData.geofencingEnabled}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, geofencingEnabled: checked })
                  }
                />
              </div>

              {formData.geofencingEnabled && (
                <>
                  {/* Current Location Button */}
                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div>
                      <Label className="text-base font-medium text-blue-900 dark:text-blue-100">
                        Use Current Location
                      </Label>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Automatically set coordinates to your current position
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={getCurrentLocation}
                      className="bg-white dark:bg-gray-800"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Get Location
                    </Button>
                  </div>

                  {/* Coordinates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="latitude" className="text-base font-medium">
                        Latitude
                      </Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="any"
                        placeholder="e.g., 40.7128"
                        value={formData.geoLat}
                        onChange={(e) =>
                          setFormData({ ...formData, geoLat: e.target.value })
                        }
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="longitude" className="text-base font-medium">
                        Longitude
                      </Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="any"
                        placeholder="e.g., -74.0060"
                        value={formData.geoLon}
                        onChange={(e) =>
                          setFormData({ ...formData, geoLon: e.target.value })
                        }
                        className="mt-2"
                      />
                    </div>
                  </div>

                  {/* Radius */}
                  <div>
                    <Label htmlFor="radius" className="text-base font-medium">
                      Allowed Radius (meters)
                    </Label>
                    <Input
                      id="radius"
                      type="number"
                      min="10"
                      max="10000"
                      placeholder="500"
                      value={formData.geoRadius}
                      onChange={(e) =>
                        setFormData({ ...formData, geoRadius: parseInt(e.target.value) || 500 })
                      }
                      className="mt-2"
                    />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Employees must be within this distance to clock in/out
                    </p>
                  </div>
                </>
              )}

              {/* Save Button */}
              <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  type="submit"
                  size="lg"
                  disabled={updateSettingsMutation.isPending}
                  className="px-8"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}