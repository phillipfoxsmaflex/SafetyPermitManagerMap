import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, AlertTriangle, Info } from "lucide-react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { CreatePermitFormData } from "@/lib/types";

const createPermitSchema = z.object({
  type: z.string().min(1, "Permit type is required"),
  location: z.string().min(1, "Location is required"),
  description: z.string().min(1, "Description is required"),
  requestorName: z.string().min(1, "Requestor name is required"),
  department: z.string().min(1, "Department is required"),
  contactNumber: z.string().min(1, "Contact number is required"),
  emergencyContact: z.string().min(1, "Emergency contact is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  riskLevel: z.string().optional(),
  safetyOfficer: z.string().optional(),
  identifiedHazards: z.string().optional(),
  additionalComments: z.string().optional(),
  atmosphereTest: z.boolean().optional(),
  ventilation: z.boolean().optional(),
  ppe: z.boolean().optional(),
  emergencyProcedures: z.boolean().optional(),
  fireWatch: z.boolean().optional(),
  isolationLockout: z.boolean().optional(),
  oxygenLevel: z.string().optional(),
  lelLevel: z.string().optional(),
  h2sLevel: z.string().optional(),
});

interface CreatePermitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePermitModal({ open, onOpenChange }: CreatePermitModalProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreatePermitFormData>({
    resolver: zodResolver(createPermitSchema),
    defaultValues: {
      type: "",
      location: "",
      description: "",
      requestorName: "",
      department: "",
      contactNumber: "",
      emergencyContact: "",
      startDate: "",
      endDate: "",
      riskLevel: "",
      safetyOfficer: "",
      identifiedHazards: "",
      additionalComments: "",
      atmosphereTest: false,
      ventilation: false,
      ppe: false,
      emergencyProcedures: false,
      fireWatch: false,
      isolationLockout: false,
      oxygenLevel: "",
      lelLevel: "",
      h2sLevel: "",
    },
  });

  const createPermitMutation = useMutation({
    mutationFn: async (data: CreatePermitFormData) => {
      const response = await apiRequest("POST", "/api/permits", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/permits/stats"] });
      toast({
        title: "Success",
        description: "Permit submitted for approval successfully!",
      });
      onOpenChange(false);
      form.reset();
      setActiveTab("basic");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create permit. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreatePermitFormData) => {
    createPermitMutation.mutate(data);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-industrial-gray">
            Create New Work Permit
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic" className="text-sm">
                  1. Basic Information
                </TabsTrigger>
                <TabsTrigger value="safety" className="text-sm">
                  2. Safety Assessment
                </TabsTrigger>
                <TabsTrigger value="approval" className="text-sm">
                  3. Approval & Sign-off
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Permit Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select permit type..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="confined_space">Confined Space Entry</SelectItem>
                            <SelectItem value="hot_work">Hot Work</SelectItem>
                            <SelectItem value="electrical">Electrical Work</SelectItem>
                            <SelectItem value="chemical">Chemical Handling</SelectItem>
                            <SelectItem value="height">Height Work</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Tank A-104, Building 3" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Requested Start Date</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
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
                        <FormLabel>Requested End Date</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Work Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe the work to be performed..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="requestorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Requestor Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Number</FormLabel>
                        <FormControl>
                          <Input type="tel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emergencyContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emergency Contact</FormLabel>
                        <FormControl>
                          <Input type="tel" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="safety" className="space-y-6">
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-caution-orange" />
                  <AlertDescription className="text-industrial-gray">
                    <strong>Safety Requirements:</strong> Complete all applicable safety checks before proceeding with work authorization.
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-industrial-gray">Pre-Work Safety Checklist</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="atmosphereTest"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-sm text-industrial-gray">
                            Atmosphere testing completed and documented
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ventilation"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-sm text-industrial-gray">
                            Adequate ventilation system verified
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ppe"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-sm text-industrial-gray">
                            Personal protective equipment (PPE) requirements identified
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="emergencyProcedures"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-sm text-industrial-gray">
                            Emergency procedures communicated to all workers
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fireWatch"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-sm text-industrial-gray">
                            Fire watch personnel assigned (if applicable)
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isolationLockout"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-sm text-industrial-gray">
                            Equipment isolation and lockout/tagout completed
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-industrial-gray">Risk Assessment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="riskLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Risk Level</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select risk level..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="critical">Critical</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="safetyOfficer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Safety Officer</FormLabel>
                            <FormControl>
                              <Input placeholder="Assigned safety officer" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="identifiedHazards"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Identified Hazards</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="List all identified hazards and mitigation measures..."
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-industrial-gray">Atmospheric Monitoring</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="oxygenLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Oxygen Level (%)</FormLabel>
                            <FormControl>
                              <Input placeholder="19.5-23.5" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="lelLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>LEL (%)</FormLabel>
                            <FormControl>
                              <Input placeholder="<10%" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="h2sLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>H2S (ppm)</FormLabel>
                            <FormControl>
                              <Input placeholder="<10 ppm" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="approval" className="space-y-6">
                <Alert className="border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4 text-safety-blue" />
                  <AlertDescription className="text-industrial-gray">
                    <strong>Approval Process:</strong> Digital signatures required from authorized personnel before work can commence.
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-industrial-gray">Required Approvals</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="text-secondary-gray">👤</div>
                        <div>
                          <p className="font-medium text-industrial-gray">Area Supervisor</p>
                          <p className="text-sm text-secondary-gray">Responsible for work area oversight</p>
                        </div>
                      </div>
                      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-orange-100 text-warning-orange">
                        Pending
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="text-secondary-gray">🛡️</div>
                        <div>
                          <p className="font-medium text-industrial-gray">Safety Officer</p>
                          <p className="text-sm text-secondary-gray">Safety requirements verification</p>
                        </div>
                      </div>
                      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-orange-100 text-warning-orange">
                        Pending
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="text-secondary-gray">⚙️</div>
                        <div>
                          <p className="font-medium text-industrial-gray">Operations Manager</p>
                          <p className="text-sm text-secondary-gray">Final authorization for critical work</p>
                        </div>
                      </div>
                      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-orange-100 text-warning-orange">
                        Pending
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <FormField
                  control={form.control}
                  name="additionalComments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Comments</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any additional safety considerations or special instructions..."
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Card>
                  <CardHeader>
                    <CardTitle className="text-industrial-gray">Emergency Contacts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-red-50 rounded-lg">
                        <p className="font-medium text-alert-red">Emergency Services</p>
                        <p className="text-lg font-bold text-alert-red">112</p>
                      </div>
                      <div className="p-3 bg-orange-50 rounded-lg">
                        <p className="font-medium text-caution-orange">Plant Emergency</p>
                        <p className="text-lg font-bold text-caution-orange">+49 123 456-7890</p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="font-medium text-safety-blue">Safety Department</p>
                        <p className="text-lg font-bold text-safety-blue">+49 123 456-7891</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="font-medium text-safety-green">Medical</p>
                        <p className="text-lg font-bold text-safety-green">+49 123 456-7892</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={createPermitMutation.isPending}
                >
                  Save Draft
                </Button>
                <Button
                  type="submit"
                  className="bg-safety-blue hover:bg-blue-700 text-white"
                  disabled={createPermitMutation.isPending}
                >
                  {createPermitMutation.isPending ? "Submitting..." : "Submit for Approval"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
