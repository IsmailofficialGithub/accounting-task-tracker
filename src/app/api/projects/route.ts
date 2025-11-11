import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ProjectInsert, ProjectUpdate } from "@/types/database";
import { sendEmail, createDeadlineNotificationEmail } from "@/lib/email";

const NOTIFICATION_FALLBACK_EMAIL =
  process.env.NOTIFICATION_FALLBACK_EMAIL || "client@example.com";

export async function GET() {
  try {
    const supabase = await createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: projects, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching projects:", error);
      return NextResponse.json(
        { error: "Failed to fetch projects" },
        { status: 500 }
      );
    }

    return NextResponse.json({ projects }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/projects:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: ProjectInsert = await request.json();
    const { title, deadline, client_name } = body;

    if (!title || !deadline || !client_name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const projectData: ProjectInsert = {
      title,
      deadline,
      client_name,
      user_id: user.id,
      notification_sent: false,
      notification_scheduled: false,
    };

    const { data: project, error } = await supabase
      .from("projects")
      .insert(projectData)
      .select()
      .single();

    if (error) {
      console.error("Error creating project:", error);
      return NextResponse.json(
        { error: "Failed to create project" },
        { status: 500 }
      );
    }

    if (project) {
      const deadlineDate = new Date(project.deadline);
      const now = new Date();
      now.setUTCHours(0, 0, 0, 0);
      deadlineDate.setUTCHours(0, 0, 0, 0);

      const diffInMs = deadlineDate.getTime() - now.getTime();
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

      if (diffInDays >= 0 && diffInDays <= 3) {
        try {
          const html = createDeadlineNotificationEmail(
            project.title,
            project.client_name,
            project.deadline
          );

          const recipient = user.email
            ? user.email
            : NOTIFICATION_FALLBACK_EMAIL;

          await sendEmail({
            to: recipient,
            subject: `⏰ Project "${project.title}" deadline reminder`,
            html,
          });

          const { error: updateError } = await supabase
            .from("projects")
            .update({
              notification_sent: true,
              notification_scheduled: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", project.id);

          if (updateError) {
            console.error(
              "Failed to update notification status for project:",
              updateError
            );
          } else {
            project.notification_sent = true;
            project.notification_scheduled = true;
          }
        } catch (notificationError) {
          console.error(
            `Failed to send immediate notification for project "${project.title}":`,
            notificationError
          );
        }
      }
    }

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/projects:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

