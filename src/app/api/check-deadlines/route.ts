import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendEmail, createDeadlineNotificationEmail } from "@/lib/email";

const NOTIFICATION_FALLBACK_EMAIL =
  process.env.NOTIFICATION_FALLBACK_EMAIL || "client@example.com";

export async function GET(request: Request) {
  const cronSecret = process.env.SUPABASE_CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret) {
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createServiceRoleClient();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const threeDaysOut = new Date(today);
  threeDaysOut.setUTCDate(today.getUTCDate() + 3);

  const todayIsoDate = today.toISOString().slice(0, 10);
  const threeDaysIsoDate = threeDaysOut.toISOString().slice(0, 10);

  try {
    const { data: projects, error } = await supabase
      .from("projects")
      .select(
        "id, title, deadline, client_name, user_id, notification_sent, notification_scheduled"
      )
      .gte("deadline", todayIsoDate)
      .lte("deadline", threeDaysIsoDate)
      .eq("notification_sent", false);

    if (error) {
      console.error("Error fetching projects:", error);
      return NextResponse.json(
        { error: "Error fetching projects" },
        { status: 500 }
      );
    }

    const pendingProjects = projects ?? [];
    const results = [];

    for (const project of pendingProjects) {
      try {
        const html = createDeadlineNotificationEmail(
          project.title,
          project.client_name,
          project.deadline
        );

        let recipient = NOTIFICATION_FALLBACK_EMAIL;

        try {
          const { data: userData, error: userError } =
            await supabase.auth.admin.getUserById(project.user_id);

          if (userError) {
            throw userError;
          }

          if (userData?.user?.email) {
            recipient = userData.user.email;
          }
        } catch (userLookupError) {
          console.error(
            `Failed to resolve email for user "${project.user_id}":`,
            userLookupError
          );
        }

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
          throw updateError;
        }

        results.push({ projectId: project.id, status: "sent" });
        console.log(`Email sent for project: ${project.title}`);
      } catch (err) {
        console.error(
          `Failed to send email for project "${project.title}":`,
          err
        );
        results.push({
          projectId: project.id,
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}

