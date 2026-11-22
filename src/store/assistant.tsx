import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type AssistantContextValue = {
  isOpen: boolean
  seed: string
  openAssistant: (seed?: string) => void
  closeAssistant: () => void
}

const AssistantContext = createContext<AssistantContextValue | null>(null)

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [seed, setSeed] = useState('')

  const openAssistant = useCallback((nextSeed = '') => {
    setSeed(nextSeed)
    setIsOpen(true)
  }, [])

  const closeAssistant = useCallback(() => setIsOpen(false), [])

  const value = useMemo<AssistantContextValue>(
    () => ({ isOpen, seed, openAssistant, closeAssistant }),
    [isOpen, seed, openAssistant, closeAssistant],
  )

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>
}

export function useAssistant() {
  const context = useContext(AssistantContext)
  if (!context) throw new Error('useAssistant must be used inside AssistantProvider')
  return context
}
