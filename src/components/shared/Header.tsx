import React from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Header() {
  return (
    <div className="flex justify-between items-center pb-16 pl-16 pr-16">
      <Link href="/components/states/LandingPage" className="text-2xl font-bold text-black">recaps</Link>
      <div className="flex gap-4">
        <Button variant="outline" className="px-8 py-6 rounded-full border-2 border-black text-black hover:bg-gray-50">
          Sign in
        </Button>
        <Button className="px-8 py-6 rounded-full bg-black text-white hover:bg-gray-800">
          Sign up
        </Button>
      </div>
    </div>
  )
} 