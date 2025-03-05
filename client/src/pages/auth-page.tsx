import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Redirect } from "wouter";
import { insertUserSchema } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { useState } from "react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(false),
});

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  preferredLanguage: z.string().min(1, "Language selection is required"),
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "it", name: "Italiano" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "zh", name: "中文" },
];

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [registrationStep, setRegistrationStep] = useState(1);

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", preferredLanguage: "en" },
  });

  const handleRegister = async (data: RegisterData) => {
    if (registrationStep === 1) {
      setRegistrationStep(2);
      return;
    }

    registerMutation.mutate({
      email: data.email,
      password: data.password,
      preferredLanguage: data.preferredLanguage,
      userType: "consumer",
    });
  };

  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex items-center">
      <div className="flex-1 flex justify-center items-center p-8">
        <div className="w-full max-w-md">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Welcome Back</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))}>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" type="email" {...loginForm.register("email")} />
                        {loginForm.formState.errors.email && (
                          <p className="text-sm text-destructive mt-1">
                            {loginForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" {...loginForm.register("password")} />
                        {loginForm.formState.errors.password && (
                          <p className="text-sm text-destructive mt-1">
                            {loginForm.formState.errors.password.message}
                          </p>
                        )}
                      </div>
                      <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                        {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Login
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>
                    {registrationStep === 1 ? "Create Account" : "Select Language"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={registerForm.handleSubmit(handleRegister)}>
                    <div className="space-y-4">
                      {registrationStep === 1 ? (
                        <>
                          <div>
                            <Label htmlFor="reg-email">Email Address</Label>
                            <Input id="reg-email" type="email" {...registerForm.register("email")} />
                            {registerForm.formState.errors.email && (
                              <p className="text-sm text-destructive mt-1">
                                {registerForm.formState.errors.email.message}
                              </p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="reg-password">Password</Label>
                            <Input id="reg-password" type="password" {...registerForm.register("password")} />
                            {registerForm.formState.errors.password && (
                              <p className="text-sm text-destructive mt-1">
                                {registerForm.formState.errors.password.message}
                              </p>
                            )}
                          </div>
                        </>
                      ) : (
                        <div>
                          <Label htmlFor="language">Preferred Language</Label>
                          <Select
                            value={registerForm.watch("preferredLanguage")}
                            onValueChange={(value) => registerForm.setValue("preferredLanguage", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a language" />
                            </SelectTrigger>
                            <SelectContent>
                              {SUPPORTED_LANGUAGES.map((lang) => (
                                <SelectItem key={lang.code} value={lang.code}>
                                  {lang.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                        {registerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {registrationStep === 1 ? "Next" : "Create Account"}
                      </Button>
                      {registrationStep === 2 && (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={() => setRegistrationStep(1)}
                        >
                          Back
                        </Button>
                      )}
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <div className="hidden lg:block flex-1 h-screen bg-cover bg-center" style={{ backgroundImage: `url(${encodeURI('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4')})` }}>
        <div className="h-full w-full bg-black/50 p-12 flex items-center">
          <div className="text-white max-w-md">
            <h1 className="text-4xl font-bold mb-4">Menu Management Made Simple</h1>
            <p className="text-lg opacity-90">Create and manage your restaurant's menu with our easy-to-use platform. Showcase your dishes and help customers find the perfect meal.</p>
          </div>
        </div>
      </div>
    </div>
  );
}