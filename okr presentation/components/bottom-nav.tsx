"use client"

import { usePathname, useRouter } from "next/navigation"

interface BottomNavProps {
  onAddClient?: () => void
  onUpdateKRs?: () => void
}

export function BottomNav({ onAddClient, onUpdateKRs }: BottomNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isHome = pathname === "/"
  const isAccounts = pathname === "/accounts"
  const isProductPage = pathname.startsWith("/product/")

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      <div className="glass-panel px-6 py-2">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <button
            onClick={() => router.push("/")}
            className="flex flex-col items-center gap-1 py-2 px-4 touch-manipulation active:scale-95 transition-all"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className={isHome ? "text-[#FF4D00]" : "text-[#9CA3AF]"}
            >
              <path
                d="M9 19V13H15V19M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            onClick={isProductPage ? onUpdateKRs : onAddClient}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FF4D00] to-[#FF6B2B] flex items-center justify-center shadow-lg shadow-[#FF4D00]/30 transition-all touch-manipulation active:scale-95 active:shadow-md"
          >
            {isProductPage ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 19V5M12 5L6 11M12 5L18 11"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            )}
          </button>

          <button
            onClick={() => router.push("/accounts")}
            className="flex flex-col items-center gap-1 py-2 px-4 touch-manipulation active:scale-95 transition-all"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className={isAccounts ? "text-[#FF4D00]" : "text-[#9CA3AF]"}
            >
              <path
                d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13M16 3.13C16.8604 3.3503 17.623 3.8507 18.1676 4.55231C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  )
}
