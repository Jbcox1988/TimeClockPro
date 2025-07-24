import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle, XCircle, Clock, User, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useNavigation } from "@/hooks/use-navigation";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

export default function CorrectionsManagement() {
  const [, setLocation] = useLocation();
  const [selectedCorrection, setSelectedCorrection] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { navigateToDashboard } = useNavigation();

  const { data: correctionsData, isLoading } = useQuery({
    queryKey: ["/api/admin/corrections"],
  });

  const { data: employeesData } = useQuery({
    queryKey: ["/api/admin/employees"],
  });

  const { data: punchesData } = useQuery({
    queryKey: ["/api/admin/punches"],
  });

  const updateCorrectionMutation = useMutation({
    mutationFn: async (data: { id: string; status: string; note?: string }) => {
      const response = await apiRequest("PUT", `/api/admin/corrections/${data.id}`, {
        status: data.status,
        note: data.note
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/corrections"] });
      setShowDialog(false);
      setSelectedCorrection(null);
      setAdminNote("");
      toast({
        title: "Correction Updated",
        description: "The correction request has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update correction request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const corrections = correctionsData?.corrections || [];
  const employees = employeesData?.employees || [];
  const punches = punchesData?.punches || [];

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find((emp: any) => emp.id === employeeId);
    return employee ? employee.name : "Unknown Employee";
  };

  const getPunchDetails = (punchId: string) => {
    const punch = punches.find((p: any) => p.id === punchId);
    if (!punch) return null;
    
    return {
      timestamp: format(new Date(punch.timestamp), "MMM dd, yyyy 'at' h:mm a"),
      type: punch.punchType,
      flagged: punch.flagged
    };
  };

  const handleCorrectionAction = (correction: any, status: string) => {
    setSelectedCorrection(correction);
    setAdminNote("");
    setShowDialog(true);
    
    if (status === "approved") {
      updateCorrectionMutation.mutate({
        id: correction.id,
        status,
        note: "Approved by admin"
      });
    } else {
      // For deny, we'll let admin add a note
    }
  };

  const handleDenyWithNote = () => {
    if (selectedCorrection) {
      updateCorrectionMutation.mutate({
        id: selectedCorrection.id,
        status: "denied",
        note: adminNote || "Denied by admin"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading corrections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl mb-8">
          <div className="px-6 py-6">
            <div className="flex items-center justify-between w-full">
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
                    Correction Requests
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Review and manage employee punch correction requests
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/employee")}
                className="text-gray-600 dark:text-gray-300 hover:text-primary"
              >
                Employee View
              </Button>
            </div>
          </div>
        </div>

        {/* Corrections List */}
        {corrections.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Correction Requests
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                There are currently no punch correction requests to review.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {corrections.map((correction: any) => {
              const punchDetails = getPunchDetails(correction.punchId);
              
              return (
                <Card key={correction.id} className="shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-3">
                        <User className="w-5 h-5 text-blue-600" />
                        <span>{getEmployeeName(correction.employeeId)}</span>
                        <Badge 
                          variant={
                            correction.status === "pending" ? "secondary" :
                            correction.status === "approved" ? "default" : "destructive"
                          }
                        >
                          {correction.status.charAt(0).toUpperCase() + correction.status.slice(1)}
                        </Badge>
                      </CardTitle>
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(correction.date), "MMM dd, yyyy")}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                          Punch Details
                        </h4>
                        {punchDetails ? (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Clock className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {punchDetails.timestamp}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant={punchDetails.type === "in" ? "default" : "secondary"}>
                                Clock {punchDetails.type === "in" ? "In" : "Out"}
                              </Badge>
                              {punchDetails.flagged && (
                                <Badge variant="destructive">Flagged</Badge>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Punch details not available</p>
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                          Correction Reason
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                          {correction.note}
                        </p>
                      </div>
                    </div>
                    
                    {correction.status === "pending" && (
                      <div className="mt-6 flex space-x-3">
                        <Button
                          onClick={() => handleCorrectionAction(correction, "approved")}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          disabled={updateCorrectionMutation.isPending}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedCorrection(correction);
                            setShowDialog(true);
                          }}
                          variant="destructive"
                          disabled={updateCorrectionMutation.isPending}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Deny
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Deny Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Correction Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for denying this correction request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="adminNote">Reason for denial</Label>
              <Textarea
                id="adminNote"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Enter the reason for denying this correction request..."
                className="mt-1"
              />
            </div>
            <div className="flex space-x-3">
              <Button
                onClick={handleDenyWithNote}
                variant="destructive"
                disabled={updateCorrectionMutation.isPending || !adminNote.trim()}
              >
                Deny Request
              </Button>
              <Button
                onClick={() => setShowDialog(false)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}