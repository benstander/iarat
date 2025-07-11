"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Upload, FileText, Video } from "lucide-react"

export default function Home() {
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [notes, setNotes] = useState("")
  const [brainrotStyle, setBrainrotStyle] = useState("")
  const [backgroundVideo, setBackgroundVideo] = useState("")
  const [memeSfx, setMemeSfx] = useState(true)
  const [voiceover, setVoiceover] = useState(true)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type === "application/pdf") {
        setUploadedFile(file)
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.type === "application/pdf") {
        setUploadedFile(file)
      }
    }
  }

  const handleGenerate = () => {
    console.log("Generating video with:", {
      file: uploadedFile,
      notes,
      brainrotStyle,
      backgroundVideo,
      memeSfx,
      voiceover,
    })
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">Brainrot Generator</h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Turn your boring lectures into absolute cinema. No cap. 🔥
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Left Column - Upload Section */}
          <Card className="rounded-2xl shadow-2xl border border-gray-200 bg-white text-black">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-black flex items-center gap-2">
                <Upload className="h-6 w-6" />
                Upload Your Boring Stuff
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="file-upload" className="text-sm font-medium text-gray-700">
                  PDF Upload (Drag & Drop or Click)
                </Label>
                <div
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${
                    dragActive
                      ? "border-black bg-gray-100"
                      : uploadedFile
                        ? "border-green-400 bg-green-100"
                        : "border-gray-300 hover:border-gray-400 hover:bg-gray-100"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("file-upload")?.click()}
                >
                  <Input id="file-upload" type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                  {uploadedFile ? (
                    <div className="flex items-center justify-center gap-2 text-green-700">
                      <FileText className="h-8 w-8" />
                      <span className="font-medium">{uploadedFile.name}</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-12 w-12 mx-auto text-gray-400" />
                      <p className="text-gray-700">
                        <span className="font-medium">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-sm text-gray-400">PDF files only</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes/YouTube Input */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
                  Paste Your Notes or YouTube Link
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Drop your lecture notes here or paste a YouTube link... we'll make it slap different 💯"
                  value={notes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                  className="min-h-32 rounded-xl bg-gray-100 border-gray-300 text-black placeholder:text-gray-400 focus:border-gray-500 focus:ring-gray-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Filter Panel */}
          <Card className="rounded-2xl shadow-2xl border border-gray-200 bg-white text-black">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-black flex items-center gap-2">
                <Video className="h-6 w-6" />
                Choose Your Chaos Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Brainrot Style */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Brainrot Style</Label>
                <Select value={brainrotStyle} onValueChange={setBrainrotStyle}>
                  <SelectTrigger className="rounded-xl bg-gray-200 border-gray-300 text-black focus:border-gray-500 focus:ring-gray-500">
                    <SelectValue placeholder="Pick your vibe ✨" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-200 border-gray-300">
                    <SelectItem value="slay-core" className="text-black hover:bg-gray-300">
                      Slay-core 💅
                    </SelectItem>
                    <SelectItem value="sigma-grindset" className="text-black hover:bg-gray-300">
                      Sigma Grindset 🗿
                    </SelectItem>
                    <SelectItem value="wholesome" className="text-black hover:bg-gray-300">
                      Wholesome 🥺
                    </SelectItem>
                    <SelectItem value="redpill" className="text-black hover:bg-gray-300">
                      Redpill 💊
                    </SelectItem>
                    <SelectItem value="academic-weapon" className="text-black hover:bg-gray-300">
                      Academic Weapon 🎯
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Background Video */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Background Video</Label>
                <Select value={backgroundVideo} onValueChange={setBackgroundVideo}>
                  <SelectTrigger className="rounded-xl bg-gray-200 border-gray-300 text-black focus:border-gray-500 focus:ring-gray-500">
                    <SelectValue placeholder="Choose your distraction 📱" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-200 border-gray-300">
                    <SelectItem value="subway-surfers" className="text-black hover:bg-gray-300">
                      Subway Surfers 🚇
                    </SelectItem>
                    <SelectItem value="minecraft-parkour" className="text-black hover:bg-gray-300">
                      Minecraft Parkour 🧱
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Switches */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-100 border border-gray-300">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-700">Add Meme SFX</Label>
                    <p className="text-xs text-gray-400">Vine booms, airhorns, the works</p>
                  </div>
                  <Switch checked={memeSfx} onCheckedChange={setMemeSfx} />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-100 border border-gray-300">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-700">Include Voiceover</Label>
                    <p className="text-xs text-gray-400">AI narrator that actually gets it</p>
                  </div>
                  <Switch checked={voiceover} onCheckedChange={setVoiceover} />
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                className="w-full h-12 rounded-xl bg-black text-white font-semibold text-lg"
                disabled={!uploadedFile && !notes}
              >
                Generate Video
              </Button>

              {!uploadedFile && !notes && (
                <p className="text-xs text-gray-400 text-center">Upload a file or add notes to get started</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
