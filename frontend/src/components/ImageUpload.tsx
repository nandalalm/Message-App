import { useState } from "react";
import { Plus, X, Loader2, Upload } from "lucide-react";
import { ImageApi } from "../services";
import type { ImageUploadData } from "../types/image";
import { useToast } from "../hooks/useToast";

interface ImagePreview {
  file: File;
  preview: string;
  id: string;
}

interface ImageUploadProps {
  onUpload: () => void;
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
}

const ImageUpload = ({ onUpload, onUploadStart, onUploadEnd }: ImageUploadProps) => {
  const [selectedImages, setSelectedImages] = useState<ImagePreview[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const { show } = useToast();
  const [errorText, setErrorText] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newImages: ImagePreview[] = [];
    Array.from(files).forEach((file) => {
      const id = Math.random().toString(36).substr(2, 9);

      let preview = '';
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      }

      newImages.push({
        file,
        preview,
        id
      });
    });

    setSelectedImages(prev => [...prev, ...newImages]);
    setErrorText("");
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeImage = (id: string) => {
    setSelectedImages(prev => {
      const imageToRemove = prev.find(img => img.id === id);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      return prev.filter(img => img.id !== id);
    });
  };

  const handleUpload = async () => {
    if (selectedImages.length === 0) {
      show('Please select at least one image to upload', 'error');
      return;
    }

    const invalidFiles: string[] = [];

    selectedImages.forEach((img, index) => {
      const fileNumber = index + 1;

      if (!img.file.type.startsWith('image/')) {
        invalidFiles.push(`File ${fileNumber}: "${img.file.name}" is not a valid image file`);
      }
    });

    if (invalidFiles.length > 0) {
      const errorMessage = invalidFiles.length === 1
        ? invalidFiles[0]
        : `Please fix the following errors:\n• ${invalidFiles.join('\n• ')}`;

      show(errorMessage, 'error');
      return;
    }

    try {
      setIsUploading(true);
      onUploadStart?.();

      const uploadData: ImageUploadData[] = selectedImages.map(img => ({
        file: img.file
      }));

      await ImageApi.uploadImages(uploadData);

      onUpload();

      selectedImages.forEach(img => URL.revokeObjectURL(img.preview));
      setSelectedImages([]);
      show('Images uploaded successfully!', 'success');
    } catch (error) {
      console.error(error);
      show('Upload failed. Please try again.', 'error');
    } finally {
      setIsUploading(false);
      onUploadEnd?.();
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Add Media</h2>

      {/* File Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
          }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-700 mb-2">
          Drop media here or click to select
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Support for multiple images (JPG, PNG, GIF, WebP)
        </p>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md cursor-pointer inline-block transition-colors shadow"
        >
          Select Media
        </label>
        {errorText && (
          <p className="mt-3 text-sm text-red-600">{errorText}</p>
        )}
      </div>

      {/* Selected Images Preview */}
      {selectedImages.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-4">Selected Media ({selectedImages.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {selectedImages.map((image) => (
              <div key={image.id} className={`border rounded-xl p-3 ${!image.file.type.startsWith('image/') ? 'bg-red-50 border-red-200' : 'bg-gray-50/70'}`}>
                <div className="relative mb-2">
                  {image.file.type.startsWith('image/') ? (
                    <img
                      src={image.preview}
                      alt="Preview"
                      className="w-full h-28 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-28 bg-red-100 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-red-500 text-2xl mb-1">⚠️</div>
                        <div className="text-red-600 text-xs">Invalid file type</div>
                        <div className="text-red-500 text-xs">{image.file.type || 'Unknown'}</div>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => removeImage(image.id)}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 shadow"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center gap-2 shadow"
            >
              {isUploading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Plus size={20} />
              )}
              {isUploading ? 'Uploading...' : `Upload ${selectedImages.length} Item${selectedImages.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
