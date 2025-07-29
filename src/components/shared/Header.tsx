"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { User, LogOut, Crown, ExternalLink } from "lucide-react"
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

  const handleUpgradePlan = () => {
    // Add upgrade plan logic here
    setShowUserMenu(false)
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
                className="flex items-center gap-2 px-2 py-2 hover:bg-gray-50 rounded-md transition-colors"
              >
                <div className="w-12 h-12 bg-white border-black border-2 rounded-md flex items-center justify-center hover:bg-gray-50">
                  <User className="w-4 h-4 text-black" />
                </div>
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  {/* User Email */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 mb-2">
                      <User className="w-4 h-4 text-gray-900" />
                      <div className="text-sm font-regular text-gray-900">{user.email}
                      </div>
                  </div>
                  
                  {/* Menu Items */}
                  <div className="py-1">
                    {/* Upgrade Plan */}
                    <button
                      onClick={handleUpgradePlan}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                    >
                      <Crown className="w-4 h-4" />
                      Upgrade plan
                    </button>
                    
                    {/* Log Out */}
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Log out
                    </button>
                  </div>
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