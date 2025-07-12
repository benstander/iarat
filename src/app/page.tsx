"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

import { Switch } from "@/components/ui/switch"
import { Upload, FileText, Video, Link, StickyNote } from "lucide-react"

export default function Home() {
  const [activeSection, setActiveSection] = useState<'pdf' | 'youtube' | 'notes' | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [youtubeLink, setYoutubeLink] = useState("")
  const [parsedTextContent, setParsedTextContent] = useState("")

  const [backgroundVideo, setBackgroundVideo] = useState("")
  const [memeSfx, setMemeSfx] = useState(true)
  const [voiceover, setVoiceover] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState("")

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
      }
    }
  }

  const processPDF = async (file: File) => {
    if (!backgroundVideo) {
      alert("Please select a background video first!")
      return
    }

    setIsGenerating(true)
    setGeneratedVideoUrl("")
    
    try {
      const formData = new FormData()
      formData.append('pdf', file)

      const response = await fetch('/api/pdf-upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to process PDF')
      }

      const data = await response.json()
      console.log(`Successfully generated script from PDF: ${data.fileName} (${data.pageCount} pages)`)
      
      // Now generate the video with the script
      await generateVideoWithScript(data.script)
    } catch (error) {
      console.error('Error processing PDF:', error)
      alert('Failed to process PDF. Please try again.')
      setUploadedFile(null)
      setIsGenerating(false)
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

  const handleYoutubeLinkProcess = async () => {
    if (!youtubeLink.trim()) {
      alert("Please enter a YouTube URL!")
      return
    }
    
    if (!backgroundVideo) {
      alert("Please select a background video first!")
      return
    }

    setIsGenerating(true)
    setGeneratedVideoUrl("")
    
    try {
      // First transcribe the YouTube video
      const transcribeResponse = await fetch('/api/youtube-transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          youtubeUrl: youtubeLink,
        }),
      })

      if (!transcribeResponse.ok) {
        throw new Error('Failed to transcribe YouTube video')
      }

      const transcribeData = await transcribeResponse.json()
      console.log("Successfully transcribed YouTube video")

      // Then generate script from transcript
      const scriptResponse = await fetch('/api/generate-video-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          textContent: transcribeData.transcript,
        }),
      })

      if (!scriptResponse.ok) {
        throw new Error('Failed to generate script')
      }

      const scriptData = await scriptResponse.json()
      console.log("Successfully generated script from YouTube video")
      
      // Now generate the video with the script
      await generateVideoWithScript(scriptData.script)
    } catch (error) {
      console.error('Error processing YouTube video:', error)
      alert('Failed to process YouTube video. Please check the URL and try again.')
      setIsGenerating(false)
    }
  }

  const generateVideoWithScript = async (script: string) => {
    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: script,
          backgroundVideo: backgroundVideo === 'subway-surfers' ? 'subway' : 'minecraft',
          voiceEnabled: voiceover,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate video')
      }

      const data = await response.json()
      setGeneratedVideoUrl(data.videoUrl)
      alert('Video generated successfully!')
    } catch (error) {
      console.error('Error generating video:', error)
      alert('Failed to generate video. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerate = async () => {
    if (!parsedTextContent.trim()) {
      alert("Please provide text content!")
      return
    }

    if (!backgroundVideo) {
      alert("Please select a background video first!")
      return
    }

    setIsGenerating(true)
    setGeneratedVideoUrl("")

    try {
      const response = await fetch('/api/generate-video-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          textContent: parsedTextContent,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate script')
      }

      const data = await response.json()
      console.log("Successfully generated script from notes")
      
      // Now generate the video with the script
      await generateVideoWithScript(data.script)
    } catch (error) {
      console.error('Error generating video script:', error)
      alert('Failed to generate video script. Please try again.')
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
                    <div className="relative">
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
                  </div>
                )}

                {activeSection === 'notes' && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <Label htmlFor="parsedTextContent" className="text-sm font-medium text-gray-700">
                      Manual Text Input
                    </Label>
                    <Textarea
                      id="parsedTextContent"
                      placeholder="Paste your course notes, lecture content, or any text you want to convert to brainrot..."
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

                {/* Voice & Audio Section */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-black">Voice & Audio</Label>
                  <div className="flex items-center justify-between p-3 bg-gray-100 rounded-[8px]">
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="voiceover" className="text-sm font-medium text-black">
                        AI Voiceover
                      </Label>
                    </div>
                    <Switch
                      id="voiceover"
                      checked={voiceover}
                      onCheckedChange={setVoiceover}
                    />
                  </div>
                </div>


              </div>

              {/* Generate Video Button - For all sections */}
              <div className="pt-4 border-t border-gray-200 mt-auto">
                <Button
                  onClick={() => {
                    if (activeSection === 'pdf' && uploadedFile) {
                      processPDF(uploadedFile)
                    } else if (activeSection === 'youtube' && youtubeLink.trim()) {
                      handleYoutubeLinkProcess()
                    } else if (activeSection === 'notes' && parsedTextContent.trim()) {
                      handleGenerate()
                    }
                  }}
                  className="w-full h-14 rounded-[8px] font-semibold text-md"
                  variant="purple"
                  disabled={
                    isGenerating || 
                    !backgroundVideo ||
                    (activeSection === 'pdf' && !uploadedFile) ||
                    (activeSection === 'youtube' && !youtubeLink.trim()) ||
                    (activeSection === 'notes' && !parsedTextContent.trim())
                  }
                >
                  {isGenerating ? "Generating Video..." : "Generate Brainrot Video"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Right Column - iPhone Video Preview */}
          <div className="flex items-center justify-center">
            <div className="bg-gray-800 rounded-[2.5rem] p-4 w-80 h-[600px] shadow-2xl">
              <div className="bg-black rounded-[2rem] w-full h-full flex items-center justify-center relative overflow-hidden">
                {generatedVideoUrl ? (
                  <div className="w-full h-full relative">
                    <video
                      controls
                      autoPlay
                      muted
                      loop
                      className="w-full h-full object-cover rounded-[2rem]"
                      src={generatedVideoUrl}
                      onError={(e) => {
                        console.error('Video playback error:', e);
                        // Fallback to show error message
                      }}
                    >
                      Your browser does not support the video tag.
                    </video>
                    {/* Success overlay */}
                    <div className="absolute top-4 left-4 right-4">
                      <div className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium">
                        ✅ Video Generated Successfully!
                      </div>
                    </div>
                    {/* Download button */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <a
                        href={generatedVideoUrl}
                        download
                        className="w-full bg-white text-black px-4 py-2 rounded-lg text-sm font-medium text-center block hover:bg-gray-100 transition-colors"
                      >
                        📥 Download Video
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <p className="text-gray-400 text-center whitespace-pre-line text-lg">
                      {isGenerating 
                        ? "🔥 Creating Your\nBrainrot Video...\n\n⚡ This might take a few minutes" 
                        : "📱 Upload content &\nselect background to\nget started"}
                    </p>
                    {isGenerating && (
                      <div className="mt-6 space-y-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                        <div className="text-sm text-gray-500">
                          Generating voice... Rendering video...
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    )
  }
