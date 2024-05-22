import type { Metadata } from 'next'
import './globals.css'
import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'
import { Button } from '@/components/ui/button'

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
      <html lang="en">
        <body className="flex flex-col min-h-[100dvh]">
          <header className="fixed top-0 left-0 right-0 px-2 border-b h-10 flex items-center justify-between bg-background z-10">
            <h1 className="font-bold">Cycles</h1>
            <div className="flex items-center">
              <SignedOut>
                <SignInButton>
                  <Button variant="link">Sign in</Button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <UserButton />
              </SignedIn>
            </div>
          </header>

          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
