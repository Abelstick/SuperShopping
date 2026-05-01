import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAppStore = create(
  persist(
    (set) => ({
      themeMode: 'light',
      sidebarOpen: true,
      // Incremented each time the browser tab becomes visible again.
      // Pages include this in useEffect deps to re-fetch stale data on tab return.
      refreshSignal: 0,
      toggleTheme: () => set((s) => ({ themeMode: s.themeMode === 'light' ? 'dark' : 'light' })),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      bumpRefreshSignal: () => set((s) => ({ refreshSignal: s.refreshSignal + 1 })),
    }),
    {
      name: 'app-settings',
      partialize: (s) => ({ themeMode: s.themeMode, sidebarOpen: s.sidebarOpen }),
    }
  )
)
