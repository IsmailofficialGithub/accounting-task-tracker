"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Project } from "@/types/database";
import { ProjectList } from "@/components/project-list";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Loader } from "@/components/ui/loader";
import { LogOut, User } from "lucide-react";

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const loadUserAndProjects = async () => {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!currentUser) {
          router.push("/login");
          return; // Keep loading state true, don't render content
        }

        setUser(currentUser);
        await loadProjects();
        setLoading(false);
      } catch (error) {
        console.error("Error loading user:", error);
        router.push("/login");
        // Keep loading state true, don't render content
      }
    };

    loadUserAndProjects();
  }, [router, supabase]);

  const loadProjects = async () => {
    try {
      // First check and send any scheduled notifications
      await fetch("/api/notifications", { method: "GET" });
      
      // Then load projects
      const response = await fetch("/api/projects");
      if (response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          setProjects(data.projects || []);
        } else {
          console.error("Response is not JSON");
          if (response.status === 401) {
            router.push("/login");
          }
        }
      } else if (response.status === 401) {
        router.push("/login");
      } else {
        const text = await response.text();
        console.error("Error loading projects:", text);
      }
    } catch (error) {
      console.error("Error loading projects:", error);
    }
  };

  const handleLogoutClick = () => {
    setLogoutDialogOpen(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Error logging out:", error);
    } finally {
      setLogoutDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader size="lg" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Accounting Task Tracker
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your client projects and tasks efficiently
            </p>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{user.email}</span>
              </div>
            )}
            <ThemeToggle />
            <Button variant="outline" onClick={handleLogoutClick} size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>

        <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Logout</DialogTitle>
              <DialogDescription>
                Are you sure you want to logout? You will need to login again to access your account.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setLogoutDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleLogoutConfirm}>
                Logout
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card className="mb-6 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Projects</CardTitle>
              <CreateProjectDialog onProjectCreated={loadProjects} />
            </div>
          </CardHeader>
        </Card>

        <ProjectList projects={projects} onRefresh={loadProjects} />
      </div>
    </div>
  );
}
