# Quick Setup Guide

## 1. Install Dependencies

```bash
npm install --legacy-peer-deps
```

## 2. Set Up Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Run the SQL script
5. Get your project URL and anon key from Project Settings > API

## 3. Configure Environment Variables

1. Copy `env.example.txt` to `.env.local`:

```bash
cp env.example.txt .env.local
```

2. Fill in your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
```

**For Gmail:**
- Enable 2-Factor Authentication
- Generate App Password: https://myaccount.google.com/apppasswords
- Use the app password as `SMTP_PASSWORD`

## 4. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 5. Create Your First Account

1. Click "Sign Up" on the login page
2. Enter your email and password (min 6 characters)
3. Check your email for verification (if email confirmation is enabled)
4. Login and start creating projects!

## Features

- ✅ Create projects with title, deadline, and client name
- ✅ Add tasks to projects
- ✅ Update task status (todo/in-progress/done)
- ✅ Collapsible project view
- ✅ Email notifications 3 days before deadline
- ✅ Secure authentication with Supabase Auth
- ✅ Row Level Security (RLS) for data protection

## Troubleshooting

### Email Not Sending
- Verify SMTP credentials are correct
- For Gmail, ensure you're using an App Password, not your regular password
- Check that SMTP_PORT and SMTP_SECURE match your email provider

### Authentication Issues
- Ensure Supabase URL and anon key are correct
- Check that RLS policies are properly set up
- Verify email confirmation settings in Supabase dashboard

### Database Errors
- Ensure you've run the `supabase-schema.sql` script
- Check that RLS policies are enabled
- Verify foreign key relationships are correct

