import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Redirect } from "wouter";
import { insertUserSchema } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const registerSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  restaurantName: z.string().min(1, "Restaurant name is required"),
});

type RegisterData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();

  const loginForm = useForm({
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", password: "", restaurantName: "" },
  });

  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 p-8">
        <div className="max-w-md mx-auto">
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Login to Your Restaurant</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))}>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="username">Username</Label>
                        <Input id="username" {...loginForm.register("username")} />
                      </div>
                      <div>
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" type="password" {...loginForm.register("password")} />
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
                  <CardTitle>Register Your Restaurant</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate(data))}>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="restaurantName">Restaurant Name</Label>
                        <Input id="restaurantName" {...registerForm.register("restaurantName")} />
                      </div>
                      <div>
                        <Label htmlFor="reg-username">Username</Label>
                        <Input id="reg-username" {...registerForm.register("username")} />
                      </div>
                      <div>
                        <Label htmlFor="reg-password">Password</Label>
                        <Input id="reg-password" type="password" {...registerForm.register("password")} />
                      </div>
                      <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                        {registerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Register
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="hidden lg:block flex-1 bg-cover bg-center" style={{ backgroundImage: `url(${encodeURI('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4')})` }}>
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