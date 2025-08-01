"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth-context'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { signIn, signUp, signInWithGoogle, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check URL params to determine if it's login or signup
  useEffect(() => {
    const mode = searchParams.get('mode')
    if (mode === 'signup') {
      setIsLogin(false)
    } else {
      setIsLogin(true)
    }
  }, [searchParams])

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      router.push('/')
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = isLogin 
        ? await signIn(email, password)
        : await signUp(email, password)
      
      if (error) {
        setError(error.message)
      } else {
        if (!isLogin) {
          setError('')
          alert('Check your email for the confirmation link!')
        } else {
          router.push('/')
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')
    
    try {
      const { error } = await signInWithGoogle()
      if (error) {
        setError(error.message)
      } else {
        router.push('/')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setError('')
  }

  const switchMode = () => {
    setIsLogin(!isLogin)
    resetForm()
    // Update URL without causing navigation
    const newUrl = isLogin ? '/auth?mode=signup' : '/auth'
    window.history.replaceState({}, '', newUrl)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center px-8 py-6">
        <Link href="/" className="text-2xl font-bold text-black">
          recaps
        </Link>
      </div>

      {/* Auth Form */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-[550px] border border-gray-200 rounded-xl shadow-md bg-white">
          <div className="p-12">
            {/* Header */}
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {isLogin ? 'Welcome back' : 'Create account'}
              </h1>
              <p className="text-gray-600 text-lg">
                {isLogin 
                  ? 'Enter your email below to sign in to your account' 
                  : 'Enter your email below to create your account'
                }
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 block">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-black focus:ring-black py-3 px-4 text-base"
                  required
                  autoComplete="email"
                />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </Label>
                  {isLogin && (
                    <button
                      type="button"
                      className="text-sm text-gray-500 hover:text-black transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-black focus:ring-black py-3 px-4 text-base"
                  required
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-4 rounded-lg">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-black hover:bg-gray-800 text-white py-4 rounded-lg font-medium transition-colors text-base"
                disabled={loading}
              >
                {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
              </Button>
            </form>

            {/* Divider
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-gray-500">Or continue with</span>
              </div>
            </div> */}

            {/* Google Sign In
            <Button
              variant="outline"
              type="button"
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="w-full py-4 rounded-lg font-medium border-gray-300 hover:bg-gray-50 transition-colors text-base"
            >
              <svg
                className="mr-3 h-5 w-5"
                viewBox="0 0 24 24"
              >
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button> */}

            {/* Toggle between login/signup */}
            <div className="text-center mt-8">
              <button
                type="button"
                onClick={switchMode}
                className="text-sm text-gray-600 hover:text-black transition-colors"
              >
                {isLogin 
                  ? "Don't have an account? Sign up" 
                  : "Already have an account? Sign in"
                }
              </button>
            </div>
          </div>

          {/* Back to home */}
          <div className="text-center pb-8">
            <Link 
              href="/" 
              className="text-sm text-gray-500 hover:text-black transition-colors"
            >
              ← Back to recaps
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 