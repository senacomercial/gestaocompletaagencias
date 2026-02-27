'use client'

import { create } from 'zustand'

interface UnreadState {
  // leadId → contagem de não lidas
  counts: Record<string, number>
  increment: (leadId: string) => void
  clear: (leadId: string) => void
  clearAll: () => void
}

export const useUnreadMessages = create<UnreadState>((set) => ({
  counts: {},
  increment: (leadId) =>
    set((state) => ({
      counts: { ...state.counts, [leadId]: (state.counts[leadId] ?? 0) + 1 },
    })),
  clear: (leadId) =>
    set((state) => {
      const { [leadId]: _, ...rest } = state.counts
      return { counts: rest }
    }),
  clearAll: () => set({ counts: {} }),
}))
