import { useState, useRef } from 'react'

interface AudioUploadProps {
  onAudioUpload?: (file: File) => void
}

export default function AudioUpload({ onAudioUpload }: AudioUploadProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('audio/')) {
      setUploadedFile(file)
      onAudioUpload?.(file)
    } else {
      alert('Please select an audio file')
    }
  }

  const clearUpload = () => {
    setUploadedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUploadClick = () => {
    if (uploadedFile) {
      onAudioUpload?.(uploadedFile)
    }
  }

  return (
    <div className="p-4 bg-white border-b border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <h3 className="font-medium text-gray-800">Upload Audio</h3>
      </div>

      <div className="space-y-3">
        {/* File Upload Section */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
            id="audio-file-input"
          />
          <label
            htmlFor="audio-file-input"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {uploadedFile ? uploadedFile.name : 'Choose audio file'}
          </label>
          {uploadedFile && (
            <button
              onClick={clearUpload}
              className="px-2 py-2 text-gray-500 hover:text-red-500 transition-colors"
              title="Clear file"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Upload Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleUploadClick}
            disabled={!uploadedFile}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              uploadedFile
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Audio
          </button>
        </div>

        {/* Upload Status */}
        {uploadedFile && (
          <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            File selected: {uploadedFile.name}
          </div>
        )}
      </div>
    </div>
  )
}
