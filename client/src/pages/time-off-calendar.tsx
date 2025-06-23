import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, Clock, Plus, CheckCircle, XCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TimeOffRequest } from "@shared/schema";

const timeOffRequestSchema = z.object({
  type: z.enum(["vacation", "sick", "personal", "other"]),
  startDate: z.string(),
  endDate: z.string(),
  isPartialDay: z.boolean().default(false),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  reason: z.string().optional(),
});

type TimeOffRequestForm = z.infer<typeof timeOffRequestSchema>;

// Generate time options in 30-minute increments
const generateTimeOptions = () => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      options.push({ value: timeString, label: displayTime });
    }
  }
  return options;
};

export default function TimeOffCalendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const currentMonth = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const monthDays = eachDayOfInterval({ start: currentMonth, end: monthEnd });

  // Get time-off requests for current month
  const { data: calendarData } = useQuery({
    queryKey: ["/api/time-off/calendar", format(currentMonth, "yyyy-MM-dd"), format(monthEnd, "yyyy-MM-dd")],
    queryFn: async ({ queryKey }) => {
      const response = await apiRequest("GET", `/api/time-off/calendar?startDate=${queryKey[1]}&endDate=${queryKey[2]}`);
      return await response.json();
    }
  });

  // Get user's time-off requests
  const { data: userRequests } = useQuery({
    queryKey: ["/api/time-off/employee"],
    queryFn: async ({ queryKey }) => {
      const response = await apiRequest("GET", queryKey[0] as string);
      return await response.json();
    }
  });

  const form = useForm<TimeOffRequestForm>({
    resolver: zodResolver(timeOffRequestSchema),
    defaultValues: {
      type: "vacation",
      startDate: "",
      endDate: "",
      isPartialDay: false,
      startTime: "",
      endTime: "",
      reason: "",
    },
  });

  const createRequestMutation = useMutation({
    mutationFn: (data: TimeOffRequestForm) => apiRequest("POST", "/api/time-off", data),
    onSuccess: () => {
      toast({ title: "Time-off request submitted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/time-off/employee"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-off/calendar"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/time-off"] });
      setIsRequestDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to submit request", variant: "destructive" });
    },
  });

  const onSubmit = (data: TimeOffRequestForm) => {
    createRequestMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "denied":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "denied":
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const hasTimeOffOnDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return (calendarData as any)?.requests?.some((request: TimeOffRequest) => 
      dateStr >= request.startDate && dateStr <= request.endDate
    );
  };

  const getTimeOffForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return (calendarData as any)?.requests?.filter((request: TimeOffRequest) => 
      dateStr >= request.startDate && dateStr <= request.endDate
    ) || [];
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/employee")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Time Off Calendar</h1>
          </div>
        </div>
        <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Request Time Off
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Request Time Off</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="vacation">Vacation</SelectItem>
                          <SelectItem value="sick">Sick Leave</SelectItem>
                          <SelectItem value="personal">Personal</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <DatePicker
                          date={field.value ? parseISO(field.value) : undefined}
                          setDate={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <DatePicker
                          date={field.value ? parseISO(field.value) : undefined}
                          setDate={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isPartialDay"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Partial Day Request
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Request specific hours instead of full days
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                {form.watch("isPartialDay") && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select start time" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {generateTimeOptions().map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select end time" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {generateTimeOptions().map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter reason for time off..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsRequestDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createRequestMutation.isPending}>
                    {createRequestMutation.isPending ? "Submitting..." : "Submit Request"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{format(selectedDate, "MMMM yyyy")}</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(new Date())}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-4">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map((day) => {
                  const dayTimeOff = getTimeOffForDate(day);
                  const hasTimeOff = dayTimeOff.length > 0;
                  
                  return (
                    <div
                      key={day.toString()}
                      className={`
                        p-2 min-h-[80px] border rounded-lg cursor-pointer hover:bg-accent/50
                        ${!isSameMonth(day, selectedDate) ? "text-muted-foreground bg-muted/30" : ""}
                        ${isToday(day) ? "bg-primary/10 border-primary" : ""}
                        ${hasTimeOff ? "bg-blue-50 dark:bg-blue-950/20" : ""}
                      `}
                    >
                      <div className="text-sm font-medium">{format(day, "d")}</div>
                      {hasTimeOff && (
                        <div className="mt-1 space-y-1">
                          {dayTimeOff.slice(0, 2).map((request: TimeOffRequest) => (
                            <div
                              key={request.id}
                              className={`text-xs px-1 py-0.5 rounded text-center ${getStatusColor(request.status)}`}
                            >
                              <div className="flex items-center justify-center gap-1">
                                {request.isPartialDay && <Clock className="h-2 w-2" />}
                                {request.type}
                              </div>
                              {request.isPartialDay && request.startTime && request.endTime && (
                                <div className="text-[10px] opacity-75">
                                  {request.startTime}-{request.endTime}
                                </div>
                              )}
                            </div>
                          ))}
                          {dayTimeOff.length > 2 && (
                            <div className="text-xs text-muted-foreground text-center">
                              +{dayTimeOff.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* My Requests */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                My Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(userRequests as any)?.requests?.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No time-off requests yet.</p>
                ) : (
                  (userRequests as any)?.requests?.map((request: TimeOffRequest) => (
                    <div key={request.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="capitalize">
                          {request.type}
                        </Badge>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(request.status)}`}>
                          {getStatusIcon(request.status)}
                          {request.status}
                        </div>
                      </div>
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-2">
                          <span>{format(parseISO(request.startDate), "MMM d")} - {format(parseISO(request.endDate), "MMM d, yyyy")}</span>
                          {request.isPartialDay && (
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Partial Day
                            </Badge>
                          )}
                        </div>
                        {request.isPartialDay && request.startTime && request.endTime && (
                          <div className="text-muted-foreground">
                            Time: {new Date(`2000-01-01T${request.startTime}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })} - {new Date(`2000-01-01T${request.endTime}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                          </div>
                        )}
                        {request.reason && (
                          <div className="text-muted-foreground">{request.reason}</div>
                        )}
                        {request.adminResponse && (
                          <div className="text-muted-foreground italic">
                            Admin: {request.adminResponse}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}