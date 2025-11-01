interface ProcessingAnimationProps {
  progress: number
  message?: string
}

export default function ProcessingAnimation({ progress, message }: ProcessingAnimationProps) {
  const getProcessingMessage = (progress: number) => {
    if (progress <= 20) return 'Uploading audio file...'
    if (progress <= 40) return 'Converting to text...'
    if (progress <= 60) return 'Analyzing content...'
    if (progress <= 80) return 'Generating insights...'
    if (progress < 100) return 'Finalizing results...'
    return 'Processing complete!'
  }

  const displayMessage = message || getProcessingMessage(progress)

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 p-8">
      <div className="text-center max-w-sm">
        {/* Main Processing Icon */}
        <div className="relative mb-6">
          <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-blue-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          
          {/* Spinning Ring */}
          <div className="absolute inset-0 w-20 h-20 mx-auto">
            <div className="w-full h-full border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        </div>

        {/* Processing Message */}
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Processing Audio
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          {displayMessage}
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Progress Percentage */}
        <div className="text-xs text-gray-500">
          {progress}% Complete
        </div>

        {/* Processing Steps Indicator */}
        <div className="flex justify-center space-x-2 mt-6">
          {[20, 40, 60, 80, 100].map((step) => (
            <div
              key={step}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                progress >= step 
                  ? 'bg-blue-600' 
                  : progress >= step - 20 
                    ? 'bg-blue-300 animate-pulse' 
                    : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Fun Processing Facts */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <div className="text-xs text-blue-700">
            <div className="flex items-center justify-center gap-1 mb-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Did you know?</span>
            </div>
            <p>
              {progress <= 40 && "AI can process speech 10x faster than humans can speak!"}
              {progress > 40 && progress <= 80 && "Modern AI can understand context and emotions in speech."}
              {progress > 80 && "Your audio insights will help build better professional connections."}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
