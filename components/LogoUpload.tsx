'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

interface LogoUploadProps {
  currentLogoUrl: string | null;
  programId: string;
  onUploadSuccess: (logoUrl: string) => void;
  onDeleteSuccess: () => void;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];

export function LogoUpload({
  currentLogoUrl,
  programId,
  onUploadSuccess,
  onDeleteSuccess,
}: LogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentLogoUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(`Invalid file type. Allowed: PNG, JPG, SVG`);
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File size exceeds 2MB limit`);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/theme/upload?programId=${programId}`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload logo');
      }

      toast.success('Logo uploaded successfully');
      onUploadSuccess(data.logo_url);
      setPreview(data.logo_url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload logo');
      // Reset preview on error
      setPreview(currentLogoUrl);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!currentLogoUrl) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/theme/upload?programId=${programId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete logo');
      }

      toast.success('Logo deleted successfully');
      onDeleteSuccess();
      setPreview(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete logo');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`Invalid file type. Allowed: PNG, JPG, SVG`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File size exceeds 2MB limit`);
        return;
      }
      handleUpload(file);
    }
  };

  return (
    <div className="space-y-4">
      <Label>Logo</Label>
      <div
        className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/svg+xml"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading || isDeleting}
        />
        {preview ? (
          <div className="space-y-3">
            <div className="relative mx-auto h-32 w-32 flex items-center justify-center bg-muted rounded-lg">
              <Image
                src={preview}
                alt="Logo preview"
                fill
                className="object-contain p-2"
                unoptimized
              />
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                disabled={isUploading || isDeleting}
              >
                <Upload className="mr-2 h-4 w-4" />
                {isUploading ? 'Uploading...' : 'Replace'}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                disabled={isUploading || isDeleting}
              >
                <X className="mr-2 h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Click to replace or drag and drop a new image
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Click to upload or drag and drop</p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG, SVG up to 2MB
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading}
              onClick={(e) => e.stopPropagation()}
            >
              {isUploading ? 'Uploading...' : 'Select File'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

