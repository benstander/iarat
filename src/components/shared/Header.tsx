import React from "react"
import { Button } from "@/components/ui/button"

export default function Header() {
  return (
    <div className="flex justify-between items-center pb-16 pl-16 pr-16">
      <h1 className="text-2xl font-bold text-black">Reelmixer</h1>
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