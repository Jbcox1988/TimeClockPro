import { useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, LogOut, History, Edit, User, Play, Square, Coffee, Timer, ArrowRight, Moon, Sun, Settings, Users, FileText, BarChart3, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTheme } from "@/hooks/use-theme";
import { useToast } from "@/hooks/use-toast";
import { CompanyBranding } from "@/components/company-branding";
import { apiRequest } from "@/lib/queryClient";
import { getCurrentLocation, isWithinGeofence } from "@/lib/geolocation";
import { useNavigation } from "@/hooks/use-navigation";

export default function EmployeeDashboard() {
  const [, setLocation] = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [logoutCountdown, setLogoutCountdown] = useState(0);
  const [countdownInterval, setCountdownInterval] = useState<NodeJS.Timeout | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { navigateWithHistory } = useNavigation();

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const { data: lastPunchData } = useQuery({
    queryKey: ["/api/employee/last-punch"],
  });

  const { data: settingsData } = useQuery({
    queryKey: ["/api/settings"],
  });

  const { data: employeeData } = useQuery({
    queryKey: ["/api/employee/current"],
  });

  // Fetch today's punches for calculating hours worked and break time
  const { data: todayPunchesData } = useQuery({
    queryKey: ["/api/employee/punches", new Date().toISOString().split('T')[0]],
    queryFn: () => {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      return fetch(`/api/employee/punches?startDate=${startOfDay.toISOString()}&endDate=${endOfDay.toISOString()}`)
        .then(res => res.json());
    }
  });

  // Fetch current week's punches for weekly summary
  const { data: weeklyPunchesData } = useQuery({
    queryKey: ["/api/employee/punches", "weekly"],
    queryFn: () => {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Start from Sunday
      startOfWeek.setHours(0, 0, 0, 0);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      
      return fetch(`/api/employee/punches?startDate=${startOfWeek.toISOString()}&endDate=${endOfWeek.toISOString()}`)
        .then(res => res.json());
    }
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

  const punchMutation = useMutation({
    mutationFn: async (punchData: any) => {
      const response = await apiRequest("POST", "/api/employee/punch", punchData);
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee/last-punch"] });
      
      const punchType = variables.punchType;
      toast({
        title: "Punch Recorded",
        description: `Successfully clocked ${punchType}. Logging out in 5 seconds...`,
      });

      // Start countdown for kiosk auto-logout
      setLogoutCountdown(5);
      const interval = setInterval(() => {
        setLogoutCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            logoutMutation.mutate();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setCountdownInterval(interval);
    },
    onError: (error: any) => {
      toast({
        title: "Punch Failed",
        description: error.message || "Failed to record punch. Please try again.",
        variant: "destructive",
      });
    },
  });

  const lastPunch = lastPunchData?.lastPunch;
  const settings = settingsData?.settings;
  const employee = employeeData?.employee;
  const isCurrentlyClockedIn = lastPunch?.punchType === "in";
  const isAdmin = employee?.isAdmin || false;

  // Calculate hours worked and break time from today's punches
  const todayPunches = todayPunchesData?.punches || [];
  const { hoursWorked, breakTime } = useMemo(() => {
    if (todayPunches.length === 0) return { hoursWorked: 0, breakTime: 0 };

    const sortedPunches = [...todayPunches].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    let totalWorked = 0;
    let totalBreak = 0;
    let lastClockIn: Date | null = null;

    for (const punch of sortedPunches) {
      const punchTime = new Date(punch.timestamp);
      
      if (punch.punchType === "in") {
        lastClockIn = punchTime;
      } else if (punch.punchType === "out" && lastClockIn) {
        // Calculate worked time from last clock in to this clock out
        const workedMs = punchTime.getTime() - lastClockIn.getTime();
        totalWorked += workedMs;
        lastClockIn = null;
      }
    }

    // If currently clocked in, add time from last clock in to now
    if (isCurrentlyClockedIn && lastClockIn) {
      const now = new Date();
      const currentWorkedMs = now.getTime() - lastClockIn.getTime();
      totalWorked += currentWorkedMs;
    }

    // Calculate break time as gaps between out and in punches
    for (let i = 1; i < sortedPunches.length; i++) {
      const prevPunch = sortedPunches[i - 1];
      const currPunch = sortedPunches[i];
      
      if (prevPunch.punchType === "out" && currPunch.punchType === "in") {
        const breakMs = new Date(currPunch.timestamp).getTime() - new Date(prevPunch.timestamp).getTime();
        totalBreak += breakMs;
      }
    }

    return {
      hoursWorked: totalWorked / (1000 * 60 * 60), // Convert to hours
      breakTime: totalBreak / (1000 * 60) // Convert to minutes
    };
  }, [todayPunches, isCurrentlyClockedIn]);

  // Calculate weekly hours by day
  const weeklyHours = useMemo(() => {
    const weeklyPunches = weeklyPunchesData?.punches || [];
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekDays = [];

    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(startOfWeek);
      currentDay.setDate(startOfWeek.getDate() + i);
      
      const dayPunches = weeklyPunches.filter(punch => {
        const punchDate = new Date(punch.timestamp);
        return punchDate.toDateString() === currentDay.toDateString();
      });

      // Calculate hours for this day
      let dayHours = 0;
      let lastClockIn: Date | null = null;
      
      const sortedDayPunches = [...dayPunches].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      for (const punch of sortedDayPunches) {
        const punchTime = new Date(punch.timestamp);
        
        if (punch.punchType === "in") {
          lastClockIn = punchTime;
        } else if (punch.punchType === "out" && lastClockIn) {
          const workedMs = punchTime.getTime() - lastClockIn.getTime();
          dayHours += workedMs / (1000 * 60 * 60);
          lastClockIn = null;
        }
      }

      // If currently clocked in and this is today, add current working time
      if (currentDay.toDateString() === today.toDateString() && 
          isCurrentlyClockedIn && lastClockIn) {
        const currentWorkedMs = today.getTime() - lastClockIn.getTime();
        dayHours += currentWorkedMs / (1000 * 60 * 60);
      }

      weekDays.push({
        day: daysOfWeek[i],
        date: currentDay.getDate(),
        hours: dayHours,
        isToday: currentDay.toDateString() === today.toDateString(),
        month: currentDay.getMonth(),
        year: currentDay.getFullYear()
      });
    }

    return weekDays;
  }, [weeklyPunchesData, isCurrentlyClockedIn]);

  const handleClockToggle = async () => {
    try {
      let locationData = null;
      let flagged = false;

      // Try to get geolocation
      try {
        const location = await getCurrentLocation();
        locationData = {
          latitude: location.latitude,
          longitude: location.longitude,
        };

        // Check geofencing if enabled
        if (settings?.geofencingEnabled && settings.geoLat && settings.geoLon) {
          const withinFence = isWithinGeofence(
            location.latitude,
            location.longitude,
            settings.geoLat,
            settings.geoLon,
            settings.geoRadius || 500
          );

          if (!withinFence) {
            toast({
              title: "Location Warning",
              description: "You are outside the allowed work area. Punch will be flagged for review.",
              variant: "destructive",
            });
            flagged = true;
          }
        }
      } catch (geoError) {
        // Location denied or failed
        flagged = true;
        toast({
          title: "Location Unavailable",
          description: "Location access denied. Punch will be flagged for review.",
          variant: "destructive",
        });
      }

      const punchType = isCurrentlyClockedIn ? "out" : "in";
      
      punchMutation.mutate({
        punchType,
        ...locationData,
        flagged,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process clock action. Please try again.",
        variant: "destructive",
      });
    }
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

      {/* Header */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Avatar className="w-10 h-10">
                <AvatarImage src={employee?.photoUrl || undefined} alt={employee?.name} />
                <AvatarFallback className="bg-primary text-white">
                  {employee?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || <Clock className="w-5 h-5" />}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  {settings?.companyName || "TimeClock Pro"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Welcome, {employee?.name || "Employee"}
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
        <div className="grid md:grid-cols-2 gap-8">
          {/* Clock In/Out Card */}
          <Card className="shadow-xl border border-gray-200 dark:border-gray-700">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="mb-6">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-accent/10 rounded-full mb-4">
                    <Clock className="text-accent w-10 h-10" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Time Clock
                  </h2>
                  <div className="mb-6">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Current Status
                    </div>
                    <div className={`inline-flex items-center px-4 py-2 rounded-full font-semibold ${
                      isCurrentlyClockedIn
                        ? "bg-accent/10 text-accent"
                        : "bg-destructive/10 text-destructive"
                    }`}>
                      <div className={`w-2 h-2 rounded-full animate-pulse mr-2 ${
                        isCurrentlyClockedIn ? "bg-accent" : "bg-destructive"
                      }`} />
                      {isCurrentlyClockedIn ? "Clocked In" : "Clocked Out"}
                    </div>
                  </div>
                </div>

                {logoutCountdown > 0 ? (
                  <div className="text-center space-y-4">
                    <div className="text-6xl font-bold text-accent animate-pulse">
                      {logoutCountdown}
                    </div>
                    <div className="text-lg text-gray-600 dark:text-gray-400">
                      Automatically logging out for next user...
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => {
                          setLogoutCountdown(0);
                          logoutMutation.mutate();
                        }}
                        className="h-12"
                      >
                        Log Out Now
                      </Button>
                      <Button
                        variant="default"
                        size="lg"
                        onClick={() => {
                          setLogoutCountdown(0);
                          if (countdownInterval) {
                            clearInterval(countdownInterval);
                            setCountdownInterval(null);
                          }
                        }}
                        className="h-12 bg-primary hover:bg-blue-600"
                      >
                        Stay Logged In
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="lg"
                    className={`w-full h-16 text-xl font-bold touch-manipulation ${
                      isCurrentlyClockedIn
                        ? "bg-destructive hover:bg-red-600"
                        : "bg-accent hover:bg-green-600"
                    }`}
                    onClick={handleClockToggle}
                    disabled={punchMutation.isPending}
                  >
                    {isCurrentlyClockedIn ? (
                      <>
                        <Square className="w-6 h-6 mr-3" />
                        Clock Out
                      </>
                    ) : (
                      <>
                        <Play className="w-6 h-6 mr-3" />
                        Clock In
                      </>
                    )}
                  </Button>
                )}

                {lastPunch && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                    Last punch: {new Date(lastPunch.timestamp).toLocaleString()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Today's Summary */}
          <Card className="shadow-xl border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
                Today's Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Hours Worked</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {hoursWorked.toFixed(1)}
                  </div>
                </div>
                <Timer className="text-info w-8 h-8" />
              </div>
              
              <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Clock In Time</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {lastPunch && lastPunch.punchType === "in" 
                      ? new Date(lastPunch.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "Not clocked in"
                    }
                  </div>
                </div>
                <Play className="text-accent w-8 h-8" />
              </div>
              
              <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Break Time</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {Math.round(breakTime)} min
                  </div>
                </div>
                <Coffee className="text-warning w-8 h-8" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Hours Summary */}
        <div className="mt-8">
          <Card className="shadow-lg border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <span>This Week's Hours</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {weeklyHours.map((day, index) => (
                  <div
                    key={index}
                    className={`text-center p-1 sm:p-3 rounded-lg border transition-all duration-200 ${
                      day.isToday
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <div className={`text-xs font-medium mb-1 ${
                      day.isToday ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {day.day}
                    </div>
                    <div className={`text-xs sm:text-sm font-semibold mb-1 ${
                      day.isToday ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'
                    }`}>
                      {day.date}
                    </div>
                    <div className={`text-sm sm:text-lg font-bold leading-tight ${
                      day.isToday ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {day.hours.toFixed(1)}h
                    </div>
                    {day.hours > 0 && (
                      <div className={`w-full h-1 rounded-full mt-1 sm:mt-2 ${
                        day.isToday ? 'bg-blue-300' : 'bg-gray-300 dark:bg-gray-600'
                      }`} 
                      style={{ 
                        opacity: Math.min(day.hours / 8, 1),
                        backgroundColor: day.hours >= 8 ? '#10b981' : undefined
                      }} />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Week:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {weeklyHours.reduce((total, day) => total + day.hours, 0).toFixed(1)} hours
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex justify-center">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl w-full">
          <Card 
            className="shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200 cursor-pointer group"
            onClick={() => setLocation("/employee/history")}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-info/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <History className="text-info w-6 h-6" />
                </div>
                <ArrowRight className="text-gray-400 group-hover:text-info transition-colors duration-200 w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Punch History
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                View your clock in/out history and total hours
              </p>
            </CardContent>
          </Card>



          <Card 
            className="shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200 cursor-pointer group"
            onClick={() => setLocation("/employee/profile")}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <User className="text-accent w-6 h-6" />
                </div>
                <ArrowRight className="text-gray-400 group-hover:text-accent transition-colors duration-200 w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                My Profile
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Manage your profile, change PIN, and update contact info
              </p>
            </CardContent>
          </Card>

          <Card 
            className="shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200 cursor-pointer group"
            onClick={() => setLocation("/employee/time-off")}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <Calendar className="text-blue-500 w-6 h-6" />
                </div>
                <ArrowRight className="text-gray-400 group-hover:text-blue-500 transition-colors duration-200 w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Time Off Calendar
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Request vacation days and view your time-off schedule
              </p>
            </CardContent>
          </Card>
          </div>
        </div>

        {/* Admin Features - Only visible for admin users */}
        {isAdmin && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Admin Management
              </h2>
              <Button
                onClick={() => setLocation("/admin")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Open Admin Dashboard
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card 
                className="shadow-lg border border-blue-200 dark:border-blue-700 hover:shadow-xl transition-all duration-200 cursor-pointer group bg-blue-50 dark:bg-blue-950"
                onClick={() => navigateWithHistory("/admin/employees")}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <Users className="text-blue-600 dark:text-blue-300 w-6 h-6" />
                    </div>
                    <ArrowRight className="text-gray-400 group-hover:text-blue-600 transition-colors duration-200 w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Manage Employees
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Add, edit, and manage employee accounts
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="shadow-lg border border-green-200 dark:border-green-700 hover:shadow-xl transition-all duration-200 cursor-pointer group bg-green-50 dark:bg-green-950"
                onClick={() => navigateWithHistory("/admin/punches")}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <Clock className="text-green-600 dark:text-green-300 w-6 h-6" />
                    </div>
                    <ArrowRight className="text-gray-400 group-hover:text-green-600 transition-colors duration-200 w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Manage Punches
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Review and edit employee time entries
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="shadow-lg border border-purple-200 dark:border-purple-700 hover:shadow-xl transition-all duration-200 cursor-pointer group bg-purple-50 dark:bg-purple-950"
                onClick={() => navigateWithHistory("/admin/reports")}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-800 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <BarChart3 className="text-purple-600 dark:text-purple-300 w-6 h-6" />
                    </div>
                    <ArrowRight className="text-gray-400 group-hover:text-purple-600 transition-colors duration-200 w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    View Reports
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Generate payroll and time reports
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="shadow-lg border border-orange-200 dark:border-orange-700 hover:shadow-xl transition-all duration-200 cursor-pointer group bg-orange-50 dark:bg-orange-950"
                onClick={() => navigateWithHistory("/admin/geofencing")}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-800 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <Settings className="text-orange-600 dark:text-orange-300 w-6 h-6" />
                    </div>
                    <ArrowRight className="text-gray-400 group-hover:text-orange-600 transition-colors duration-200 w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Geofencing Settings
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Configure location-based punch restrictions
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Profile Dialog */}
        <Dialog open={showProfile} onOpenChange={setShowProfile}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Employee Profile</DialogTitle>
              <DialogDescription>
                View your employee information and account details.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
                  <User className="text-white w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {employee?.name || "Employee"}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Employee ID: {employee?.id?.slice(0, 8) || "N/A"}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Status</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {employee?.isActive ? "Active" : "Inactive"}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Role</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {employee?.isAdmin ? "Admin" : "Employee"}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">Current Status</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {isCurrentlyClockedIn ? "Clocked In" : "Clocked Out"}
                </div>
                {lastPunch && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Last punch: {new Date(lastPunch.timestamp).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setShowProfile(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
