import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, User, MessageSquare, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { format, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TimeOffRequest, Employee } from "@shared/schema";

const responseSchema = z.object({
  status: z.enum(["approved", "denied"]),
  adminResponse: z.string().optional(),
});

type ResponseForm = z.infer<typeof responseSchema>;

export default function TimeOffManagement() {
  const [selectedRequest, setSelectedRequest] = useState<TimeOffRequest | null>(null);
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Get all time-off requests
  const { data: requestsData, isLoading } = useQuery({
    queryKey: ["/api/admin/time-off"],
    queryFn: async ({ queryKey }) => {
      const response = await apiRequest("GET", queryKey[0] as string);
      return await response.json();
    }
  });

  // Get all employees for name lookup
  const { data: employeesData } = useQuery({
    queryKey: ["/api/admin/employees"],
    queryFn: async ({ queryKey }) => {
      const response = await apiRequest("GET", queryKey[0] as string);
      return await response.json();
    }
  });

  const form = useForm<ResponseForm>({
    resolver: zodResolver(responseSchema),
    defaultValues: {
      status: "approved",
      adminResponse: "",
    },
  });

  const updateRequestMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ResponseForm }) => 
      apiRequest("PATCH", `/api/admin/time-off/${id}`, data),
    onSuccess: () => {
      toast({ title: "Request updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/time-off"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-off/employee"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-off/calendar"] });
      setIsResponseDialogOpen(false);
      setSelectedRequest(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to update request", variant: "destructive" });
    },
  });

  const onSubmit = (data: ResponseForm) => {
    if (selectedRequest) {
      updateRequestMutation.mutate({ id: selectedRequest.id, data });
    }
  };

  const handleRequestAction = (request: TimeOffRequest, status: "approved" | "denied") => {
    setSelectedRequest(request);
    form.setValue("status", status);
    setIsResponseDialogOpen(true);
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

  const getEmployeeName = (employeeId: string) => {
    const employee = (employeesData as any)?.employees?.find((emp: Employee) => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee";
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "vacation":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "sick":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "personal":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Time Off Management</h1>
        </div>
        <div className="text-center py-8">Loading requests...</div>
      </div>
    );
  }

  const requests = (requestsData as any)?.requests || [];
  const pendingRequests = requests.filter((req: TimeOffRequest) => req.status === "pending");
  const processedRequests = requests.filter((req: TimeOffRequest) => req.status !== "pending");

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/admin")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Time Off Management</h1>
          </div>
        </div>
      </div>

      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            Pending Requests ({pendingRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-muted-foreground">No pending requests.</p>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request: TimeOffRequest) => (
                <div key={request.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{getEmployeeName(request.employeeId)}</span>
                        <Badge className={getTypeColor(request.type)} variant="outline">
                          {request.type}
                        </Badge>
                        {request.isPartialDay && (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Partial Day
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        <div>
                          {format(parseISO(request.startDate), "MMM d, yyyy")} - {format(parseISO(request.endDate), "MMM d, yyyy")}
                        </div>
                        {request.isPartialDay && request.startTime && request.endTime && (
                          <div>
                            Time: {new Date(`2000-01-01T${request.startTime}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })} - {new Date(`2000-01-01T${request.endTime}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                          </div>
                        )}
                        <div>Requested: {format(request.requestDate, "MMM d, yyyy 'at' h:mm a")}</div>
                      </div>

                      {request.reason && (
                        <div className="text-sm">
                          <span className="font-medium">Reason:</span> {request.reason}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-600 hover:bg-green-50"
                        onClick={() => handleRequestAction(request, "approved")}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        onClick={() => handleRequestAction(request, "denied")}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Deny
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Processed Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {processedRequests.length === 0 ? (
            <p className="text-muted-foreground">No processed requests yet.</p>
          ) : (
            <div className="space-y-4">
              {processedRequests.slice(0, 10).map((request: TimeOffRequest) => (
                <div key={request.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{getEmployeeName(request.employeeId)}</span>
                        <Badge className={getTypeColor(request.type)} variant="outline">
                          {request.type}
                        </Badge>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(request.status)}`}>
                          {getStatusIcon(request.status)}
                          {request.status}
                        </div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        <div>
                          {format(parseISO(request.startDate), "MMM d, yyyy")} - {format(parseISO(request.endDate), "MMM d, yyyy")}
                        </div>
                        <div>
                          Processed: {request.processedDate ? format(request.processedDate, "MMM d, yyyy 'at' h:mm a") : "N/A"}
                        </div>
                      </div>

                      {request.reason && (
                        <div className="text-sm">
                          <span className="font-medium">Reason:</span> {request.reason}
                        </div>
                      )}

                      {request.adminResponse && (
                        <div className="text-sm">
                          <span className="font-medium">Admin Response:</span> {request.adminResponse}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Response Dialog */}
      <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {form.watch("status") === "approved" ? "Approve" : "Deny"} Time Off Request
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="font-medium">{getEmployeeName(selectedRequest.employeeId)}</div>
                <div className="text-sm text-muted-foreground">
                  {format(parseISO(selectedRequest.startDate), "MMM d, yyyy")} - {format(parseISO(selectedRequest.endDate), "MMM d, yyyy")}
                </div>
                <div className="text-sm">
                  <Badge className={getTypeColor(selectedRequest.type)} variant="outline">
                    {selectedRequest.type}
                  </Badge>
                </div>
                {selectedRequest.reason && (
                  <div className="text-sm mt-2">
                    <span className="font-medium">Reason:</span> {selectedRequest.reason}
                  </div>
                )}
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Decision</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="approved">Approve</SelectItem>
                            <SelectItem value="denied">Deny</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="adminResponse"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Response (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add a note or reason for your decision..."
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
                      onClick={() => setIsResponseDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateRequestMutation.isPending}>
                      {updateRequestMutation.isPending ? "Saving..." : "Save Decision"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}