"use client";

import { useState, useEffect } from "react";
import { Project, Task } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader } from "@/components/ui/loader";
import { ChevronDown, ChevronUp, Plus, Bell, Calendar, User as UserIcon } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { TaskList } from "./task-list";
import { CreateTaskDialog } from "./create-task-dialog";
import { useToast } from "@/hooks/use-toast";

interface ProjectListProps {
  projects: Project[];
  onRefresh: () => void;
}

const ITEMS_PER_PAGE = 5;

export function ProjectList({ projects, onRefresh }: ProjectListProps) {
  const [openProjects, setOpenProjects] = useState<Set<string>>(new Set());
  const [tasksByProject, setTasksByProject] = useState<Record<string, Task[]>>({});
  const [loadingTasks, setLoadingTasks] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  const totalPages = Math.ceil(projects.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedProjects = projects.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const toggleProject = async (projectId: string) => {
    const newOpenProjects = new Set(openProjects);
    if (newOpenProjects.has(projectId)) {
      newOpenProjects.delete(projectId);
    } else {
      newOpenProjects.add(projectId);
      if (!tasksByProject[projectId]) {
        await loadTasks(projectId);
      }
    }
    setOpenProjects(newOpenProjects);
  };

  const loadTasks = async (projectId: string) => {
    setLoadingTasks((prev) => new Set(prev).add(projectId));
    try {
      const response = await fetch(`/api/tasks?project_id=${projectId}`);
      const data = await response.json();
      if (data.tasks) {
        setTasksByProject((prev) => ({
          ...prev,
          [projectId]: data.tasks,
        }));
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load tasks",
      });
    } finally {
      setLoadingTasks((prev) => {
        const newSet = new Set(prev);
        newSet.delete(projectId);
        return newSet;
      });
    }
  };

  const handleTaskUpdate = async (projectId: string) => {
    await loadTasks(projectId);
    onRefresh();
  };

  const handleNotifyDeadline = async (projectId: string) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ project_id: projectId }),
      });

      const data = await response.json();
      if (response.ok) {
        toast({
          variant: "success",
          title: "Success",
          description: data.message || "Notification scheduled successfully!",
        });
        onRefresh();
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.error || "Failed to schedule notification",
        });
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send notification",
      });
    }
  };

  if (projects.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-muted-foreground">
              No projects yet
            </p>
            <p className="text-sm text-muted-foreground">
              Create your first project to get started!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {paginatedProjects.map((project) => {
          const isOpen = openProjects.has(project.id);
          const tasks = tasksByProject[project.id] || [];
          const deadline = new Date(project.deadline);
          const isOverdue = deadline < new Date();
          const daysUntilDeadline = differenceInDays(deadline, new Date());

          return (
            <Card key={project.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <CardTitle className="text-xl font-semibold">
                      {project.title}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <UserIcon className="h-4 w-4" />
                        <span>{project.client_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4" />
                        <span>{format(deadline, "PPP")}</span>
                      </div>
                      {isOverdue && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                          Overdue
                        </span>
                      )}
                      {!isOverdue && daysUntilDeadline <= 3 && daysUntilDeadline >= 0 && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-500/10 text-orange-600 dark:text-orange-400">
                          {daysUntilDeadline} {daysUntilDeadline === 1 ? "day" : "days"} left
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleNotifyDeadline(project.id)}
                      disabled={project.notification_sent || project.notification_scheduled}
                      title={
                        project.notification_sent
                          ? "Notification already sent"
                          : project.notification_scheduled
                          ? "Notification scheduled - will send 3 days before deadline"
                          : "Schedule notification for 3 days before deadline"
                      }
                    >
                      <Bell className={`h-4 w-4 ${project.notification_scheduled ? "text-blue-600 dark:text-blue-400" : ""}`} />
                    </Button>
                    <Collapsible open={isOpen} onOpenChange={() => toggleProject(project.id)}>
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          disabled={loadingTasks.has(project.id)}
                        >
                          {loadingTasks.has(project.id) ? (
                            <Loader size="sm" />
                          ) : isOpen ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </Collapsible>
                  </div>
                </div>
              </CardHeader>
              <Collapsible open={isOpen} onOpenChange={() => toggleProject(project.id)}>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {loadingTasks.has(project.id) ? (
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-sm">Tasks</h3>
                          <CreateTaskDialog
                            projectId={project.id}
                            onTaskCreated={() => handleTaskUpdate(project.id)}
                          />
                        </div>
                        <TaskList
                          tasks={tasks}
                          onTaskUpdate={() => handleTaskUpdate(project.id)}
                        />
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) setCurrentPage(currentPage - 1);
                }}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage(page);
                  }}
                  isActive={currentPage === page}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                }}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
