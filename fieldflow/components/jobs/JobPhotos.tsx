'use client'
import { useState, useRef } from 'react'
import toast from 'react-hot-toast'

interface Photo {
  id: string
  public_url: string
  photo_type: 'before' | 'after'
  caption: string | null
  created_at: string
}

interface JobPhotosProps {
  jobId: string
  companyId: string
  initialPhotos: Photo[]
}

export function JobPhotos({ jobId, companyId, initialPhotos }: JobPhotosProps) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [activeTab, setActiveTab] = useState<'before' | 'after'>('before')
  const [uploading, setUploading] = useState(false)
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const beforePhotos = photos.filter((p) => p.photo_type === 'before')
  const afterPhotos = photos.filter((p) => p.photo_type === 'after')
  const visiblePhotos = activeTab === 'before' ? beforePhotos : afterPhotos

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    setUploading(true)
    const uploadedPhotos: Photo[] = []

    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('photo_type', activeTab)

      try {
        const res = await fetch(`/api/jobs/${jobId}/photos`, {
          method: 'POST',
          body: formData,
        })
        if (!res.ok) {
          const data = await res.json()
          toast.error(`Failed to upload ${file.name}: ${data.error}`)
          continue
        }
        const photo = await res.json()
        uploadedPhotos.push(photo)
      } catch (err: any) {
        toast.error(`Error uploading ${file.name}`)
      }
    }

    if (uploadedPhotos.length > 0) {
      setPhotos((prev) => [...prev, ...uploadedPhotos])
      toast.success(
        `${uploadedPhotos.length} photo${uploadedPhotos.length > 1 ? 's' : ''} uploaded`
      )
    }

    setUploading(false)
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div>
      {/* Tab bar + upload button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {(['before', 'after'] as const).map((tab) => {
            const count = tab === 'before' ? beforePhotos.length : afterPhotos.length
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-brand text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                <span
                  className={`ml-1.5 text-xs ${
                    activeTab === tab ? 'text-white/80' : 'text-gray-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-secondary text-sm"
          >
            {uploading ? (
              <>
                <svg
                  className="animate-spin w-4 h-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Uploading...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                Upload {activeTab}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Photo grid */}
      {visiblePhotos.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-lg py-12 flex flex-col items-center justify-center text-center">
          <svg
            className="w-10 h-10 text-gray-300 mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm text-gray-500">
            No {activeTab} photos yet.{' '}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-brand hover:underline font-medium"
            >
              Upload photos
            </button>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {visiblePhotos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => setLightboxPhoto(photo)}
              className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.public_url}
                alt={photo.caption ?? `${photo.photo_type} photo`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              {photo.caption && (
                <div className="absolute bottom-0 inset-x-0 bg-black/50 px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs truncate">{photo.caption}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="relative max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxPhoto(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white"
              aria-label="Close"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxPhoto.public_url}
              alt={lightboxPhoto.caption ?? `${lightboxPhoto.photo_type} photo`}
              className="w-full rounded-lg max-h-[80vh] object-contain"
            />
            {lightboxPhoto.caption && (
              <p className="text-white/90 text-sm mt-2 text-center">{lightboxPhoto.caption}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
