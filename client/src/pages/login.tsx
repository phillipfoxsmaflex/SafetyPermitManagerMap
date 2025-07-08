import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { HardHat, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

const loginSchema = z.object({
  username: z.string().min(1, "Benutzername ist erforderlich"),
  password: z.string().min(1, "Passwort ist erforderlich"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();

  // Fetch system settings for customizable title and icon
  const { data: systemSettings } = useQuery({
    queryKey: ["/api/system-settings"]
  });

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Ungültige Anmeldedaten");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Update the auth context with the logged-in user
      login(data.user);
      toast({
        title: "Erfolgreich angemeldet",
        description: "Willkommen zurück!",
      });
      // Use a slight delay to ensure the auth context is updated
      setTimeout(() => {
        setLocation("/");
      }, 100);
    },
    onError: (error) => {
      toast({
        title: "Anmeldung fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-safety-blue to-blue-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-white p-3 sm:p-4 rounded-full shadow-lg">
              {(systemSettings as any)?.headerIcon ? (
                <img 
                  src={(systemSettings as any).headerIcon} 
                  alt="Header Icon" 
                  className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
                />
              ) : (
                <HardHat className="w-10 h-10 sm:w-12 sm:h-12 text-safety-blue" />
              )}
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            {(systemSettings as any)?.applicationTitle || "Arbeitserlaubnis"}
          </h1>
          <p className="text-blue-100 text-sm sm:text-base px-4">
            Digitales Genehmigungssystem für sichere Arbeitsplätze
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-2xl border-0">
          <CardHeader className="space-y-1 pb-4 sm:pb-6">
            <CardTitle className="text-xl sm:text-2xl font-bold text-center text-industrial-gray">
              Anmelden
            </CardTitle>
            <p className="text-center text-secondary-gray text-sm sm:text-base">
              Geben Sie Ihre Anmeldedaten ein, um fortzufahren
            </p>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Benutzername</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-gray w-4 h-4" />
                          <Input
                            placeholder="Ihr Benutzername"
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
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Passwort</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-gray w-4 h-4" />
                          <Input
                            type="password"
                            placeholder="Ihr Passwort"
                            className="pl-10"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-safety-blue text-white hover:bg-blue-700"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Anmelden..." : "Anmelden"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-blue-100 text-sm">
          <p>© 2024 Arbeitserlaubnis System</p>
          <p>Für sichere und konforme Arbeitsplätze</p>
        </div>
      </div>
    </div>
  );
}