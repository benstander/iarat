"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { User, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

export default function Header() {
  const { user, signOut, loading } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    setShowUserMenu(false)
  }

  const handleSignIn = () => {
    router.push('/auth')
  }

  const handleSignUp = () => {
    router.push('/auth?mode=signup')
  }

  if (loading) {
    return (
      <div className="flex justify-between items-center pb-16 pl-16 pr-16">
        <Link href="/" className="text-2xl font-bold text-black cursor-pointer">recaps</Link>
        <div className="flex gap-4">
          <div className="w-20 h-12 bg-gray-200 rounded-full animate-pulse" />
          <div className="w-20 h-12 bg-gray-200 rounded-full animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-between items-center pb-16 pl-16 pr-16">
        <Link href="/" className="text-2xl font-bold text-black cursor-pointer">recaps</Link>
        
        {user ? (
          // Authenticated user state
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-pink-400 to-pink-600 rounded-md flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700">{user.email}</span>
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-md shadow-md border border-gray-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-pink-400 to-pink-600 rounded-sm flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{user.email}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Unauthenticated state
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              onClick={handleSignIn}
              className="px-8 py-6 rounded-full border-2 border-black text-black hover:bg-gray-50"
            >
              Sign in
            </Button>
            <Button 
              onClick={handleSignUp}
              className="px-8 py-6 rounded-full bg-black text-white hover:bg-gray-800"
            >
              Sign up
            </Button>
          </div>
        )}
      </div>

      {/* Click outside to close user menu */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </>
  )
} 