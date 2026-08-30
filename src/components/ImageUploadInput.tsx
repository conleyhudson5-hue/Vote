import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, X, Link as LinkIcon, Check, AlertCircle, RefreshCw } from 'lucide-react';

interface ImageUploadInputProps {
  label: string;
  value: string;
  onChange: (dataUrlOrUrl: string) => void;
  required?: boolean;
  helpText?: string;
}

export const ImageUploadInput: React.FC<ImageUploadInputProps> = ({
  label,
  value,
  onChange,
  required = false,
  helpText,
}) => {
  const [mode, setMode] = useState<'file' | 'url'>('file');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compress & resize image to prevent gigantic data URLs while maintaining high resolution
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (PNG, JPG, WebP, GIF, or SVG).');
      return;
    }

    // Limit to 10MB raw file before processing
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Image file is too large. Please select an image under 10MB.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) {
        setIsLoading(false);
        setErrorMessage('Failed to read image file.');
        return;
      }

      // If SVG or small image, store as is
      if (file.type === 'image/svg+xml' || file.size < 300 * 1024) {
        onChange(result);
        setIsLoading(false);
        return;
      }

      // Resize and compress via HTML5 canvas for optimal performance
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          onChange(compressedDataUrl);
        } else {
          onChange(result);
        }
        setIsLoading(false);
      };

      img.onerror = () => {
        setIsLoading(false);
        setErrorMessage('Failed to decode image.');
      };

      img.src = result;
    };

    reader.onerror = () => {
      setIsLoading(false);
      setErrorMessage('Error reading file from device.');
    };

    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleClear = () => {
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setErrorMessage(null);
  };

  return (
    <div className="space-y-1.5">
      {/* Label and Mode Toggle */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[10px]">
          <button
            type="button"
            onClick={() => setMode('file')}
            className={`flex items-center gap-1 rounded-md px-2 py-0.5 font-medium transition-all ${
              mode === 'file'
                ? 'bg-white text-[#0288D1] shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="h-3 w-3" />
            <span>Upload File</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`flex items-center gap-1 rounded-md px-2 py-0.5 font-medium transition-all ${
              mode === 'url'
                ? 'bg-white text-[#0288D1] shadow-2xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LinkIcon className="h-3 w-3" />
            <span>Image Link</span>
          </button>
        </div>
      </div>

      {/* Mode 1: File Upload / Drag & Drop */}
      {mode === 'file' ? (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/jpg, image/webp, image/gif, image/svg+xml"
            onChange={handleFileChange}
            className="hidden"
            id="admin-image-file-input"
          />

          {value ? (
            /* Selected / Uploaded Image Preview Box */
            <div className="relative flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50/40 p-2.5">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs">
                <img
                  src={value}
                  alt="Preview"
                  className="h-full w-full object-cover object-top"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
                  }}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="truncate">Image loaded & ready</span>
                </div>
                <p className="truncate text-[10px] text-slate-500 font-mono">
                  {value.startsWith('data:') ? 'Local file uploaded' : value}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 rounded-md border border-sky-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-[#0288D1] shadow-2xs hover:bg-sky-50 transition-colors"
                  >
                    <RefreshCw className="h-2.5 w-2.5" />
                    <span>Choose another file</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="rounded-md px-1.5 py-0.5 text-[10px] font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Empty Dropzone & Select Button */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition-all ${
                isDragging
                  ? 'border-[#29B6F6] bg-sky-50/80 scale-[0.99]'
                  : 'border-slate-300 bg-slate-50/70 hover:border-sky-300 hover:bg-sky-50/30'
              }`}
            >
              {isLoading ? (
                <div className="flex flex-col items-center py-2">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#29B6F6] border-t-transparent" />
                  <span className="mt-2 text-xs font-semibold text-slate-600">Processing image file...</span>
                </div>
              ) : (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-[#0288D1] shadow-2xs mb-2">
                    <Upload className="h-5 w-5" />
                  </div>
                  <button
                    type="button"
                    className="rounded-lg bg-[#29B6F6] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-[#0288D1] transition-colors pointer-events-none"
                  >
                    Select Image File from Device
                  </button>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    or drag and drop your photo here (PNG, JPG, WebP)
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Mode 2: Standard Link Input */
        <div className="space-y-2">
          <div className="relative">
            <input
              type="url"
              required={required}
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
                setErrorMessage(null);
              }}
              placeholder="https://images.unsplash.com/photo-..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 pr-8 text-xs text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {value && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1.5">
              <img
                src={value}
                alt="Link Preview"
                className="h-8 w-8 rounded object-cover border border-slate-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="truncate text-[10px] text-slate-500">{value}</span>
            </div>
          )}
        </div>
      )}

      {/* Error Notice */}
      {errorMessage && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {helpText && <p className="text-[10px] text-slate-400">{helpText}</p>}
    </div>
  );
};
