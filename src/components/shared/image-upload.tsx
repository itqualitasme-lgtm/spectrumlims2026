"use client"

import { useState, useRef } from "react"
import { Upload, X, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { uploadImage } from "@/actions/upload"

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  folder?: string
  placeholder?: string
  label?: string
  className?: string
}

export function ImageUpload({
  value,
  onChange,
  folder = "uploads",
  placeholder = "Upload image or paste URL...",
  className,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folder", folder)
      const result = await uploadImage(formData)
      onChange(result.url)
      toast.success("Image uploaded")
    } catch (error: any) {
      toast.error(error.message || "Upload failed")
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div className={className}>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 px-3 shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 shrink-0 text-destructive hover:text-destructive"
            onClick={() => onChange("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {value && (
        <div className="mt-2 relative inline-block">
          <img
            src={value}
            alt="Preview"
            className="h-12 max-w-[200px] object-contain rounded border bg-white p-1"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none"
            }}
          />
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
