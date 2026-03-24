"use client"

import { ChakraProvider } from "@chakra-ui/react"
import { system } from "@/styles/theme"
import { Toaster } from "@/lib/ToasterProvider"
import type { ReactNode } from "react"

interface ProviderProps {
  children: ReactNode
}

export function Provider({ children }: ProviderProps) {
  return (
    <ChakraProvider value={system}>
      {children}
      <Toaster />
    </ChakraProvider>
  )
}
