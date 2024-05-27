import type { Metadata } from 'next'
import './globals.css'
import {
  ClerkProvider,
  OrganizationSwitcher,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeSelector } from '@/components/theme-selector'

export const metadata: Metadata = {
  title: 'Cycles',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="flex flex-col min-h-[100dvh]">
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <header className="fixed top-0 left-0 right-0 px-2 border-b h-10 flex items-center justify-between bg-background z-10">
              <h1 className="font-bold">Cycles</h1>
              <div className="flex items-center gap-2">
                <SignedOut>
                  <SignInButton>
                    <Button variant="link">Sign in</Button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <div className="flex gap-2">
                    <Button variant="link" asChild>
                      <Link href="/boards">Boards</Link>
                    </Button>
                    <div className="flex items-center [&_.cl-organizationPreviewMainIdentifier]:text-foreground">
                      <OrganizationSwitcher
                        afterSelectOrganizationUrl="/boards"
                        afterSelectPersonalUrl="/boards"
                        appearance={{
                          elements: {
                            organizationSwitcherPopoverActionButton__createOrganization:
                              { display: 'none' },
                          },
                        }}
                      />
                    </div>
                    <div className="flex items-center size-6 self-center">
                      <UserButton />
                    </div>
                  </div>
                </SignedIn>
                <ThemeSelector />
              </div>
            </header>

            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
