import React, { useEffect, useRef, useState } from "react";
import {
  MAINTENANCE_IMAGE_ACCEPT,
  validateMaintenanceImageFile,
} from "../constants";

type MaintenanceImagePickerProps = {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
  onError?: (message: string) => void;
};

const MaintenanceImagePicker: React.FC<MaintenanceImagePickerProps> = ({
  label,
  file,
  onChange,
  onError,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    if (!selected) {
      onChange(null);
      return;
    }
    const error = validateMaintenanceImageFile(selected);
    if (error) {
      onError?.(error);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    onChange(selected);
  };

  const handleRemove = () => {
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <label className="kfc-label">{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept={MAINTENANCE_IMAGE_ACCEPT}
        className="kfc-input"
        onChange={handleSelect}
      />
      {previewUrl && (
        <div className="mt-2 space-y-2">
          <img
            src={previewUrl}
            alt={`${label} preview`}
            className="max-h-40 rounded border object-contain bg-gray-50"
          />
          <button
            type="button"
            className="kfc-btn-outline"
            onClick={handleRemove}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
};

export default MaintenanceImagePicker;
