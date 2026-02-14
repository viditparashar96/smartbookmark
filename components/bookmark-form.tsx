"use client"

import { useState } from "react"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { createClient } from "@/lib/supabase/client"

const bookmarkSchema = z.object({
  title: z.string().min(1, "Title is required"),
  url: z.string().url("Please enter a valid URL"),
})

export function BookmarkForm({ userId }: { userId: string }) {
  const supabase = createClient()
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")
  const [errors, setErrors] = useState<{ title?: string; url?: string }>({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    const result = bookmarkSchema.safeParse({ title, url })
    if (!result.success) {
      const fieldErrors: { title?: string; url?: string } = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as "title" | "url"
        fieldErrors[field] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setLoading(true)
    const { error } = await supabase.from("bookmarks").insert({
      user_id: userId,
      title: result.data.title,
      url: result.data.url,
    })
    setLoading(false)

    if (error) {
      toast.error("Failed to add bookmark")
      return
    }

    toast.success("Bookmark added")
    setTitle("")
    setUrl("")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Bookmark</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="title">Title</FieldLabel>
            <Input
              id="title"
              placeholder="My favorite site"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            {errors.title && <FieldError>{errors.title}</FieldError>}
          </Field>
          <Field>
            <FieldLabel htmlFor="url">URL</FieldLabel>
            <Input
              id="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            {errors.url && <FieldError>{errors.url}</FieldError>}
          </Field>
          <Button type="submit" disabled={loading}>
            {loading ? "Adding..." : "Add Bookmark"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
