"use client"

import { useEffect, useRef, useState } from "react"
import { IconExternalLink, IconTrash } from "@tabler/icons-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

type Bookmark = {
  id: string
  user_id: string
  title: string
  url: string
  created_at: string
}

export function BookmarkList({
  initialBookmarks,
  userId,
}: {
  initialBookmarks: Bookmark[]
  userId: string
}) {
  const supabase = createClient()
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    async function subscribe() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token)
      }

      const channel = supabase
        .channel(`bookmarks-${userId}`)
        // Realtime INSERT via postgres_changes (works with RLS)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "bookmarks",
          },
          (payload) => {
            const newBookmark = payload.new as Bookmark
            if (newBookmark.user_id !== userId) return
            setBookmarks((prev) => {
              if (prev.some((b) => b.id === newBookmark.id)) return prev
              return [newBookmark, ...prev]
            })
          }
        )
        // Realtime DELETE via postgres_changes (backup, may not fire with RLS)
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "bookmarks",
          },
          (payload) => {
            const oldBookmark = payload.old as Bookmark
            if (oldBookmark.user_id !== userId) return
            setBookmarks((prev) =>
              prev.filter((b) => b.id !== oldBookmark.id)
            )
          }
        )
        // Broadcast DELETE for cross-tab sync (bypasses RLS)
        .on("broadcast", { event: "bookmark-deleted" }, (payload) => {
          const deletedId = payload.payload.id as string
          setBookmarks((prev) => prev.filter((b) => b.id !== deletedId))
        })
        .subscribe()

      channelRef.current = channel
    }

    subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [supabase, userId])

  async function handleDelete(id: string) {
    const previous = bookmarks
    setBookmarks((prev) => prev.filter((b) => b.id !== id))

    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)

    if (error) {
      setBookmarks(previous)
      toast.error("Failed to delete bookmark")
      return
    }

    // Broadcast deletion to other tabs on the same channel
    channelRef.current?.send({
      type: "broadcast",
      event: "bookmark-deleted",
      payload: { id },
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Bookmarks</CardTitle>
      </CardHeader>
      <CardContent>
        {bookmarks.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No bookmarks yet. Add one above!
          </p>
        ) : (
          <div className="flex flex-col divide-y">
            {bookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{bookmark.title}</p>
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={bookmark.url}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 truncate text-sm transition-colors"
                  >
                    <span className="truncate">{bookmark.url}</span>
                    <IconExternalLink className="size-3 shrink-0" />
                  </a>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(bookmark.id)}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  <IconTrash className="size-4" />
                  <span className="sr-only">Delete bookmark</span>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
