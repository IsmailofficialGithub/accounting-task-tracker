import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, createDeadlineNotificationEmail } from "@/lib/email";
import { differenceInDays } from "date-fns";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { project_id } = body;

    if (!project_id) {
      return NextResponse.json(
        { error: "Missing project_id" },
        { status: 400 }
      );
    }

    // Fetch project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", project_id)
      .eq("user_id", user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: "Project not found or unauthorized" },
        { status: 404 }
      );
    }

    // Check if notification was already sent
    if (project.notification_sent) {
      return NextResponse.json(
        { message: "Notification already sent", project },
        { status: 200 }
      );
    }

    // Get user email
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userEmail = authUser?.email;

    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    const deadline = new Date(project.deadline);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);
    const daysUntilDeadline = differenceInDays(deadline, now);

    // If deadline has passed, don't schedule
    if (daysUntilDeadline < 0) {
      return NextResponse.json(
        { error: "Deadline has already passed" },
        { status: 400 }
      );
    }

    // If within 3 days, send immediately
    if (daysUntilDeadline <= 3) {
      const emailHtml = createDeadlineNotificationEmail(
        project.title,
        project.client_name,
        project.deadline
      );

      try {
        await sendEmail({
          to: userEmail,
          subject: `Deadline Reminder: ${project.title} - Due in ${daysUntilDeadline} ${daysUntilDeadline === 1 ? 'day' : 'days'}`,
          html: emailHtml,
        });

        // Mark notification as sent
        const { error: updateError } = await supabase
          .from("projects")
          .update({ 
            notification_sent: true, 
            notification_scheduled: true,
            updated_at: new Date().toISOString() 
          })
          .eq("id", project_id);

        if (updateError) {
          console.error("Error updating notification status:", updateError);
        }

        return NextResponse.json(
          { message: "Notification sent successfully", project },
          { status: 200 }
        );
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        return NextResponse.json(
          { error: "Failed to send email notification" },
          { status: 500 }
        );
      }
    }

    // If more than 3 days away, schedule the notification
    const { error: updateError } = await supabase
      .from("projects")
      .update({ 
        notification_scheduled: true,
        updated_at: new Date().toISOString() 
      })
      .eq("id", project_id);

    if (updateError) {
      console.error("Error scheduling notification:", updateError);
      return NextResponse.json(
        { error: "Failed to schedule notification" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: `Notification scheduled. You will receive an email when ${daysUntilDeadline - 3} days remain (3 days before deadline).`,
        project: { ...project, notification_scheduled: true }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in POST /api/notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Check and send scheduled notifications
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all projects with scheduled but not sent notifications
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .eq("notification_scheduled", true)
      .eq("notification_sent", false);

    if (projectsError) {
      console.error("Error fetching projects:", projectsError);
      return NextResponse.json(
        { error: "Failed to fetch projects" },
        { status: 500 }
      );
    }

    if (!projects || projects.length === 0) {
      return NextResponse.json(
        { message: "No scheduled notifications to send", sent: 0 },
        { status: 200 }
      );
    }

    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userEmail = authUser?.email;

    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    let sentCount = 0;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Check each project and send if within 3 days
    for (const project of projects) {
      const deadline = new Date(project.deadline);
      deadline.setHours(0, 0, 0, 0);
      const daysUntilDeadline = differenceInDays(deadline, now);

      // If within 3 days, send the notification
      if (daysUntilDeadline <= 3 && daysUntilDeadline >= 0) {
        const emailHtml = createDeadlineNotificationEmail(
          project.title,
          project.client_name,
          project.deadline
        );

        try {
          await sendEmail({
            to: userEmail,
            subject: `Deadline Reminder: ${project.title} - Due in ${daysUntilDeadline} ${daysUntilDeadline === 1 ? 'day' : 'days'}`,
            html: emailHtml,
          });

          // Mark notification as sent
          await supabase
            .from("projects")
            .update({ 
              notification_sent: true,
              updated_at: new Date().toISOString() 
            })
            .eq("id", project.id);

          sentCount++;
        } catch (emailError) {
          console.error(`Error sending email for project ${project.id}:`, emailError);
        }
      }
    }

    return NextResponse.json(
      { 
        message: `Checked scheduled notifications. ${sentCount} notification(s) sent.`,
        sent: sentCount
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in GET /api/notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
