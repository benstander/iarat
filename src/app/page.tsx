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
import { Upload, FileText, Video, Link, Play, StickyNote } from "lucide-react"

export default function Home() {
  const [activeSection, setActiveSection] = useState<'pdf' | 'youtube' | 'notes' | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [youtubeLink, setYoutubeLink] = useState("")
  const [parsedTextContent, setParsedTextContent] = useState("")
  const [brainrotStyle, setBrainrotStyle] = useState("")
  const [backgroundVideo, setBackgroundVideo] = useState("")
  const [memeSfx, setMemeSfx] = useState(true)
  const [voiceover, setVoiceover] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedScript, setGeneratedScript] = useState("")

  const handleSectionToggle = (section: 'pdf' | 'youtube' | 'notes') => {
    setActiveSection(activeSection === section ? null : section)
  }

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
        // TODO: Process PDF and extract text (not using Vercel AI SDK)
        // setParsedTextContent(extractedText)
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.type === "application/pdf") {
        setUploadedFile(file)
        // TODO: Process PDF and extract text (not using Vercel AI SDK)
        // setParsedTextContent(extractedText)
      }
    }
  }

  const handleYoutubeLinkProcess = () => {
    if (youtubeLink.trim()) {
      // TODO: Process YouTube link and extract transcript (not using Vercel AI SDK)
      // setParsedTextContent(extractedTranscript)
      console.log("Processing YouTube link:", youtubeLink)
    }
  }

  const handleGenerate = async () => {
    if (!brainrotStyle || !parsedTextContent.trim()) {
      alert("Please select a brainrot style and provide text content!")
      return
    }

    setIsGenerating(true)
    setGeneratedScript("")

    try {
      const response = await fetch('/api/generate-video-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          textContent: parsedTextContent,
          brainrotStyle,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate script')
      }

      const data = await response.json()
      setGeneratedScript(data.script)
    } catch (error) {
      console.error('Error generating video script:', error)
      alert('Failed to generate video script. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-30">
      <div className="max-w-7xl mx-auto">
        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          {/* Left Column - Upload and Style Section */}
          <Card className="rounded-2xl shadow-2xl border border-gray-200 bg-white text-black h-[600px] flex flex-col">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="text-2xl font-bold text-black flex items-center gap-3">
                <Upload className="h-6 w-6" />
                Create Your Video
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="flex-1 space-y-6">
                {/* Three Section Blocks */}
                <div className="grid grid-cols-3 gap-3">
                  {/* PDF Block */}
                  <div
                    onClick={() => handleSectionToggle('pdf')}
                    className={`p-4 rounded-[8px] bg-gray-100 border cursor-pointer transition-all duration-200 text-center ${
                      activeSection === 'pdf'
                        ? 'border-black bg-gray-100'
                        : 'hover:bg-gray-200'
                    }`}
                  >
                    <FileText className="h-6 w-6 mx-auto mb-2 text-gray-600" />
                    <p className="text-sm font-medium text-gray-700">PDF</p>
                  </div>

                  {/* YouTube Block */}
                  <div
                    onClick={() => handleSectionToggle('youtube')}
                    className={`p-4 rounded-[8px] bg-gray-100 border cursor-pointer transition-all duration-200 text-center ${
                      activeSection === 'youtube'
                        ? 'border-black bg-gray-100'
                        : 'hover:bg-gray-200'
                    }`}
                  >
                    <Video className="h-6 w-6 mx-auto mb-2 text-gray-600" />
                    <p className="text-sm font-medium text-gray-700">YouTube</p>
                  </div>

                  {/* Notes Block */}
                  <div
                    onClick={() => handleSectionToggle('notes')}
                    className={`p-4 rounded-[8px] bg-gray-100 border cursor-pointer transition-all duration-200 text-center ${
                      activeSection === 'notes'
                        ? 'border-black bg-gray-100'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <StickyNote className="h-6 w-6 mx-auto mb-2 text-gray-600" />
                    <p className="text-sm font-medium text-gray-700">Notes</p>
                  </div>
                </div>

                {/* Conditional Sections Based on Active Selection */}
                {activeSection === 'pdf' && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <Label htmlFor="file-upload" className="text-sm font-medium text-gray-700">
                      PDF Upload (Drag & Drop or Click)
                    </Label>
                    <div
                      className={`relative border-2 border-dashed rounded-[10px] p-6 text-center transition-all duration-200 cursor-pointer ${
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
                          <Upload className="h-10 w-10 mx-auto text-gray-400" />
                          <p className="text-gray-700">
                            <span className="font-medium">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-sm text-gray-400">PDF files only</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeSection === 'youtube' && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <Label htmlFor="youtube-link" className="text-sm font-medium text-gray-700">
                      YouTube Link
                    </Label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="youtube-link"
                          type="url"
                          placeholder="https://youtube.com/watch?v=..."
                          value={youtubeLink}
                          onChange={(e) => setYoutubeLink(e.target.value)}
                          className="pl-10 rounded-[10px] bg-gray-100 border-gray-300 text-black placeholder:text-gray-400 focus:border-gray-500 focus:ring-gray-500"
                        />
                      </div>
                      <Button
                        onClick={handleYoutubeLinkProcess}
                        disabled={!youtubeLink.trim()}
                        variant="outline"
                        className="rounded-[10px] border-gray-300 text-gray-700 hover:bg-gray-100"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {activeSection === 'notes' && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <Label htmlFor="parsedTextContent" className="text-sm font-medium text-gray-700">
                      Text Content
                      <span className="text-xs text-gray-500 ml-2">(Auto-populated from PDF/YouTube or paste manually)</span>
                    </Label>
                    <Textarea
                      id="parsedTextContent"
                      placeholder="Text content will appear here after processing PDF/YouTube, or paste manually..."
                      value={parsedTextContent}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setParsedTextContent(e.target.value)}
                      className="min-h-32 rounded-[10px] bg-gray-100 border-gray-300 text-black placeholder:text-gray-400 focus:border-gray-500 focus:ring-gray-500"
                    />
                  </div>
                )}

                {/* Background Video Section */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-black">Background Video</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => setBackgroundVideo(backgroundVideo === 'subway-surfers' ? '' : 'subway-surfers')}
                      variant="outline"
                      className={`h-12 rounded-[8px] font-medium bg-gray-100 text-black ${
                        backgroundVideo === 'subway-surfers'
                          ? 'border-black'
                          : 'hover:bg-gray-200'
                      }`}
                    >
                      Subway Surfers
                    </Button>
                    <Button
                      onClick={() => setBackgroundVideo(backgroundVideo === 'minecraft-parkour' ? '' : 'minecraft-parkour')}
                      variant="outline"
                      className={`h-12 rounded-[8px] font-medium bg-gray-100 text-black ${
                        backgroundVideo === 'minecraft-parkour'
                          ? 'border-black'
                          : 'hover:bg-gray-200'
                      }`}
                    >
                      Minecraft Parkour
                    </Button>
                  </div>
                </div>

                {/* Generated Script Preview */}
                {generatedScript && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Generated Script 
                      <span className="text-xs text-green-600 ml-2">(✓ Generated via Vercel AI SDK + OpenAI)</span>
                    </Label>
                    <div className="bg-gray-100 rounded-[10px] p-4 max-h-40 overflow-y-auto">
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap">{generatedScript}</pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Generate Button - Always at Bottom */}
              <div className="pt-4 border-t border-gray-200 mt-auto">
                <Button
                  onClick={handleGenerate}
                  className="w-full h-14 rounded-[8px] font-semibold text-md"
                  variant="purple"
                  disabled={!parsedTextContent.trim() || !brainrotStyle || isGenerating}
                >
                  {isGenerating ? "Generating..." : "Generate Video"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Script Preview or iPhone Video Preview */}
          <div className="flex items-center justify-center">
            {generatedScript ? (
              <Card className="w-full h-[600px] rounded-2xl shadow-2xl border border-gray-200 bg-white">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-black flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Generated Script
                    <span className="text-xs text-green-600 font-normal ml-2">(Vercel AI SDK + OpenAI)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[500px] overflow-y-auto">
                  <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {generatedScript}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="bg-gray-800 rounded-[2.5rem] p-4 w-80 h-[600px] shadow-2xl">
                <div className="bg-black rounded-[2rem] w-full h-full flex items-center justify-center">
                  <p className="text-gray-400 text-center">
                    {isGenerating ? "Generating Script..." : "Video Preview\nComing Soon"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    )
  }
