import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { BookmarkForm } from "@/components/bookmark-form"
import { BookmarkList } from "@/components/bookmark-list"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: bookmarks } = await supabase
    .from("bookmarks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" user={user} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="mx-auto w-full max-w-3xl flex flex-col gap-6 p-4 md:p-6">
            <BookmarkForm userId={user.id} />
            <BookmarkList
              initialBookmarks={bookmarks ?? []}
              userId={user.id}
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
