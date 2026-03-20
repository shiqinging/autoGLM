import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Image as ImageIcon, Eye, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VisionCanvasProps {
  imageUrl?: string;
  className?: string;
}

export const VisionCanvas: React.FC<VisionCanvasProps> = ({ imageUrl, className }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setError('Failed to load image');
  };

  // If no image is provided, show placeholder
  if (!imageUrl) {
    return (
      <Card className={cn('w-full h-full flex flex-col glass border-zinc-800/80', className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30">
              <Eye className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <CardTitle className="text-zinc-100 text-base">Vision Canvas</CardTitle>
              <p className="text-xs text-zinc-500">Agent's visual perception</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 min-h-0 p-0">
          <div className="h-full w-full flex flex-col items-center justify-center border-t border-zinc-800/50 bg-zinc-950/30">
            <div className="relative">
              {/* Animated scanning effect */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full border-2 border-orange-500/20 animate-pulse" />
                <div className="absolute w-24 h-24 rounded-full border-2 border-orange-500/30 animate-ping" />
              </div>

              <div className="relative z-10 flex flex-col items-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 border border-zinc-700 flex items-center justify-center mb-4">
                  <Monitor className="w-8 h-8 text-zinc-600" />
                </div>

                <p className="text-sm text-zinc-400 font-medium">
                  Waiting for visual feed...
                </p>
                <p className="text-xs text-zinc-600 mt-1 text-center max-w-[200px]">
                  Agent screenshots will appear here during task execution
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Image display mode
  return (
    <Card className={cn('w-full h-full flex flex-col glass border-zinc-800/80', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30">
              <Eye className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <CardTitle className="text-zinc-100 text-base">Vision Canvas</CardTitle>
              <p className="text-xs text-zinc-500">Agent's visual perception</p>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              Loading...
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 p-0">
        <div className="h-full w-full border-t border-zinc-800/50 bg-zinc-950/30 relative overflow-hidden rounded-b-lg">
          {error ? (
            <div className="h-full w-full flex flex-col items-center justify-center text-zinc-600">
              <ImageIcon className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          ) : (
            <>
              {/* Loading Overlay */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 z-10">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-zinc-500">Loading image...</p>
                  </div>
                </div>
              )}

              {/* Image */}
              <img
                src={imageUrl}
                alt="Agent vision"
                className="w-full h-full object-contain"
                onLoad={handleImageLoad}
                onError={handleImageError}
                onLoadStart={() => setIsLoading(true)}
              />

              {/* Overlay Info (optional - can be enhanced with action coordinates) */}
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-zinc-900/80 backdrop-blur-sm rounded text-[10px] text-zinc-400 border border-zinc-800">
                Live View
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
