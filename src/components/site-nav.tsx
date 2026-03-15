"use client"

import NextLink from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { LinkButton } from "@/components/ui/link-button"
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants"
import { createClient } from "@/lib/supabase/client"

type NavUser = {
  email?: string | null
  role?: string | null
}

export function SiteNav() {
  const [user, setUser] = useState<NavUser | null>(null)
  const [isSigningOut, startSigningOut] = useTransition()
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      const authUser = data.user
      setUser(
        authUser
          ? {
              email: authUser.email,
              role: authUser.user_metadata?.role,
            }
          : null,
      )
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user
      setUser(
        authUser
          ? {
              email: authUser.email,
              role: authUser.user_metadata?.role,
            }
          : null,
      )
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const dashboardHref = useMemo(() => {
    if (!user?.role) {
      return "/patient"
    }

    const base = user.role === "doctor" ? "/doctor" : "/patient"
    return user.email ? `${base}?email=${encodeURIComponent(user.email)}` : base
  }, [user])

  function handleSignOut() {
    startSigningOut(async () => {
      const supabase = createClient()
      await supabase.auth.signOut()
      setUser(null)
      router.push("/")
      router.refresh()
    })
  }

  return (
    <nav className="flex flex-col gap-4 pt-8 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <NextLink href="/">
          <p className="text-2xl font-semibold text-foreground font-display">
            {APP_NAME}
          </p>
          <p className="text-sm text-muted-foreground">{APP_DESCRIPTION}</p>
        </NextLink>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {user ? (
          <>
            <LinkButton href={dashboardHref}>Dashboard</LinkButton>
            <Button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="border-border bg-background text-foreground hover:bg-muted"
            >
              {isSigningOut ? "Signing out..." : "Sign out"}
            </Button>
          </>
        ) : (
          <>
            <LinkButton href="/sign-in">Sign in</LinkButton>
            <LinkButton
              href="/sign-up"
              className="border-border bg-background text-foreground hover:bg-muted"
            >
              Create account
            </LinkButton>
          </>
        )}
      </div>
    </nav>
  )
}
