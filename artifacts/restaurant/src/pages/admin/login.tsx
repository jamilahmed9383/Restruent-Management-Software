import { useState } from "react";
import { useLocation } from "wouter";
import { useAdminLogin, useGetAdminMe, getGetAdminMeQueryKey, setCustomHeader } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UtensilsCrossed } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const { data: admin } = useGetAdminMe({ query: { queryKey: getGetAdminMeQueryKey(), retry: false } });
  if (admin?.username) {
    setLocation("/admin/dashboard");
  }

  const loginMutation = useAdminLogin();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { data: { username, password } },
      {
        onSuccess: (data) => {
          localStorage.setItem("admin-token", data.token);
          setCustomHeader("x-admin-token", data.token);
          setLocation("/admin/dashboard");
        },
        onError: () => {
          toast({
            title: "Login failed",
            description: "Invalid credentials. Try admin / admin123",
            variant: "destructive",
          });
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
            <UtensilsCrossed className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Lumina Staff</h1>
          <p className="text-muted-foreground mt-2">Manage orders and tables</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 bg-card p-6 rounded-3xl border border-border shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground pl-1">Username</label>
            <Input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-12 rounded-xl bg-muted/50 border-none"
              placeholder="admin"
              required
            />
          </div>
          <div className="space-y-2 pb-2">
            <label className="text-sm font-medium text-foreground pl-1">Password</label>
            <Input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl bg-muted/50 border-none"
              placeholder="••••••••"
              required
            />
          </div>
          <Button 
            type="submit" 
            className="w-full h-12 rounded-xl text-base font-medium"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Authenticating..." : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
}
