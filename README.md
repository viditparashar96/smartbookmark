# Smart Bookmark App

A lightweight web application that allows users to securely manage personal bookmarks using Google OAuth authentication. Each user maintains a private bookmark collection, with real-time updates across sessions.

## Features

- **Google OAuth** — Sign in with Google, no passwords needed
- **Add Bookmarks** — Save links with a title and URL (with validation)
- **Private Collections** — Bookmarks are private per user via Row Level Security
- **Real-Time Updates** — UI updates instantly on insert/delete using Supabase Realtime
- **Delete Bookmarks** — Remove bookmarks with one click
- **Dark Mode** — Toggle between light and dark themes

## Tech Stack

- **Next.js 16** — App Router, Server Components, Middleware
- **React 19** — with TypeScript
- **Supabase** — Auth (Google OAuth), PostgreSQL database, Realtime subscriptions, Row Level Security
- **Tailwind CSS v4** — Utility-first styling
- **shadcn/ui** — UI component library
- **Zod** — Form validation
- **Sonner** — Toast notifications

## Data Model

**Table: `bookmarks`**

| Column       | Type        | Description                      |
| ------------ | ----------- | -------------------------------- |
| `id`         | uuid (PK)   | Auto-generated unique identifier |
| `user_id`    | uuid (FK)   | References `auth.users(id)`      |
| `title`      | text        | Bookmark title                   |
| `url`        | text        | Bookmark URL                     |
| `created_at` | timestamptz | Timestamp, defaults to `now()`   |

## Security

- **Row Level Security (RLS)** is enabled on the `bookmarks` table
- Users can only **select**, **insert**, and **delete** rows where `auth.uid() = user_id`
- Supabase anon key is used client-side; all data access is gated by RLS policies

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Google Cloud](https://console.cloud.google.com) OAuth 2.0 Client ID

### 1. Clone and install

```bash
git clone <repo-url>
cd abstrabit
npm install
```

### 2. Set up Supabase

1. Create a Supabase project at [supabase.com/dashboard](https://supabase.com/dashboard)
2. Go to **SQL Editor** and run the contents of [`supabase/setup.sql`](supabase/setup.sql)
3. Copy your **Project URL** and **anon key** from **Settings > API**

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Configure authentication

1. In Supabase dashboard, go to **Authentication > URL Configuration**
2. Set **Site URL** to `http://localhost:3000`
3. Add **Redirect URL**: `http://localhost:3000/auth/callback`
4. Enable **Google** provider under **Authentication > Providers** with your Google OAuth Client ID and Secret

> See [`supabase/SETUP_GUIDE.md`](supabase/SETUP_GUIDE.md) for detailed Google OAuth setup instructions.

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to the login page.

## Project Structure

```
app/
├── layout.tsx                        # Root layout (ThemeProvider + Toaster)
├── page.tsx                          # Landing → redirect to /dashboard
├── (auth)/
│   ├── login/page.tsx                # Login page (Google OAuth)
│   └── auth/callback/route.ts       # OAuth callback handler
├── (dashboard)/
│   └── dashboard/page.tsx            # Main bookmark dashboard
components/
├── login-form.tsx                    # Google sign-in form
├── bookmark-form.tsx                 # Add bookmark form with validation
├── bookmark-list.tsx                 # Bookmark list with realtime updates
├── bookmark-dashboard.tsx            # Combined dashboard component
├── app-sidebar.tsx                   # Sidebar navigation
├── nav-user.tsx                      # User menu with logout
├── site-header.tsx                   # Header with theme toggle
├── theme-toggle.tsx                  # Dark/light mode toggle
├── ui/                               # shadcn/ui components
lib/
├── supabase/
│   ├── client.ts                     # Browser Supabase client
│   └── server.ts                     # Server Supabase client
middleware.ts                         # Auth session refresh + route protection
supabase/
├── setup.sql                         # Database schema, RLS, Realtime config
└── SETUP_GUIDE.md                    # Supabase setup instructions
```

## Deployment

Deploy to [Vercel](https://vercel.com):

1. Push your code to a Git repository
2. Import the project in Vercel
3. Add the environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. Update Supabase auth settings:
   - **Site URL** → your Vercel production URL
   - **Redirect URLs** → add `https://your-app.vercel.app/auth/callback`
   - **Google OAuth redirect URI** → stays as `https://your-project-ref.supabase.co/auth/v1/callback`


#Problems Faced

## 1. Supabase Key Types: Publishable Key vs Anon Key

### The Problem
Supabase recently introduced a new **publishable key** format (`sb_publishable_*`). We initially used this key, but Realtime features (INSERT/DELETE subscriptions) were completely broken — no events were received.

### Solution
Switched to the standard **anon key** (JWT format) for `NEXT_PUBLIC_SUPABASE_ANON_KEY`. This key is safe to expose in the browser — it only grants access that RLS policies allow.


## 2. Realtime DELETE Not Working With RLS

### The Problem
With RLS enabled, INSERT events worked via `postgres_changes`, but DELETE events were never received by any tab — including the tab that triggered the delete.


### Solution: Three-Layer Approach

**Layer 1 — Optimistic Update (same tab):**
```ts
async function handleDelete(id: string) {
  const previous = bookmarks
  setBookmarks((prev) => prev.filter((b) => b.id !== id))  // instant removal

  const { error } = await supabase.from("bookmarks").delete().eq("id", id)
  if (error) {
    setBookmarks(previous)  // rollback on failure
  }
}
```

**Layer 2 — Broadcast (cross-tab):**
```ts
// After successful delete, broadcast to other tabs:
channelRef.current?.send({
  type: "broadcast",
  event: "bookmark-deleted",
  payload: { id },
})

// Other tabs listen:
.on("broadcast", { event: "bookmark-deleted" }, (payload) => {
  setBookmarks((prev) => prev.filter((b) => b.id !== payload.payload.id))
})
```

**Layer 3 — postgres_changes DELETE (backup):**
Kept in the subscription as a fallback. If Supabase fixes the RLS+DELETE behavior, it'll work automatically.



## Acceptance Criteria

- [x] Google login works
- [x] Bookmark creation with validation (title + URL)
- [x] Bookmarks displayed sorted newest first
- [x] Privacy enforced via RLS
- [x] Bookmark deletion works
- [x] Real-time updates on insert/delete
- [x] Deployed on Vercel
# smartbookmark
