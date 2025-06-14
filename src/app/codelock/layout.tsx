import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Code Lock Solver - A-List ELAN Hub',
  description: 'Solve code lock puzzles for ELAN Life fuel station robberies',
}

export default function CodeLockLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
    </>
  )
}