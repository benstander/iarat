import React, { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Link, FileText, X } from "lucide-react"
import ProgressBar from "@/components/ui/ProgressBar"

interface LandingPageProps {
  lectureLink: string
  setLectureLink: (link: string) => void
  uploadedFile: File | null
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  processInput: () => void
  isProcessing: boolean
  removeUploadedFile: () => void // Added prop
}

export default function LandingPage({
  lectureLink,
  setLectureLink,
  uploadedFile,
  handleFileUpload,
  processInput,
  isProcessing,
  removeUploadedFile // Added prop
}: LandingPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRemoveFile = () => {
    removeUploadedFile();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center min-h-[66vh]">
      {/* Left Column */}
      <div className="space-y-20 pl-16">
        <div className="gap-6 flex flex-col">
          <h2 className="text-4xl font-bold leading-tight">
            Turn your lecture into<br />
            engaging, <span className="text-pink-500">brainrot</span> reels.
          </h2>
          <p className="text-2xl text-gray-700">
            Doomscroll your way to a distinction.
          </p>
        </div>

        <div className="space-y-4">
          {/* File Upload Display (fixed height to prevent layout shift) */}
          <div style={{ minHeight: 42 }}>
            {uploadedFile ? (
              <div className="bg-gray-50 border rounded-full px-6 py-4 inline-flex items-center gap-4">
                <FileText className="w-4 h-4 text-gray-600" />
                <span className="text-gray-700 text-sm font-medium">{uploadedFile.name}</span>
                <button
                  type="button"
                  aria-label="Remove uploaded file"
                  onClick={handleRemoveFile}
                  className="p-1 rounded-full hover:bg-gray-50 hover:border-gray-400"
                  style={{ lineHeight: 0 }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : null}
          </div>
          
          <div className="flex gap-4">
            <div className="relative flex-[2]">
              <Link className="absolute left-5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-700"/>
              <Input
                placeholder="Paste your lecture link"
                value={lectureLink}
                onChange={(e) => setLectureLink(e.target.value)}
                className="py-6 px-12 text-md border border-gray-500 text-gray-700 rounded-full w-full hover:border-gray-400"
              />
            </div>
            <span className="flex items-center text-black text-lg">or</span>
            <div className="relative">
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer hover:bg-gray-50"
                ref={fileInputRef}
              />
              <Button 
                variant="outline" 
                className={`px-8 py-6 text-sm rounded-full hover:bg-gray-50 hover:border-gray-400 flex items-center ${
                  uploadedFile 
                    ? 'border-2 border-pink-500 hover:border-pink-600'
                    : 'border border-gray-500 text-gray-700 hover:border-gray-400'
                }`}
              >

                Upload files
              </Button>
            </div>
          </div>

          <Button
            onClick={processInput}
            disabled={isProcessing || (!lectureLink.trim() && !uploadedFile)}
            className="w-full py-7 text-md font-semibold rounded-full bg-gradient-to-r from-pink-400 to-pink-600 text-white hover:from-pink-500 hover:to-pink-700 disabled:opacity-50"
          >
            {isProcessing ? "Splitting into topics..." : "Convert to Brainrot"}
          </Button>
        </div>
      </div>

      {/* Right Column - Video Preview */}
      <div className="flex justify-end pr-16">
        <div className="w-74 h-[540px] rounded-2xl overflow-hidden shadow-2xl">
          <video
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            src="https://fvosffjhogwahewymkjj.supabase.co/storage/v1/object/public/generated-videos//video_1752327164073_topic3.mp4"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </div>
  )
} 