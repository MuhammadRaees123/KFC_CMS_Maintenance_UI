import React, { useState } from "react";
import InventoryModal from "./InventoryModal";
import { resolveMaintenanceImageUrl } from "../constants";

type MaintenanceImageDisplayProps = {
  label: string;
  path?: string | null;
  emptyText?: string;
};

const MaintenanceImageDisplay: React.FC<MaintenanceImageDisplayProps> = ({
  label,
  path,
  emptyText = "No image available",
}) => {
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  const url = resolveMaintenanceImageUrl(path);

  if (!url || broken) {
    return (
      <div>
        <strong>{label}:</strong>{" "}
        <span className="text-gray-500">{emptyText}</span>
      </div>
    );
  }

  return (
    <div>
      <strong>{label}:</strong>
      <div className="mt-1">
        <button
          type="button"
          className="block border rounded overflow-hidden bg-gray-50 hover:opacity-90"
          onClick={() => setOpen(true)}
          title="View image"
        >
          <img
            src={url}
            alt={label}
            className="h-24 w-24 object-cover"
            onError={() => setBroken(true)}
          />
        </button>
      </div>
      {open && (
        <InventoryModal title={label} onClose={() => setOpen(false)} wide>
          <div className="flex justify-center">
            <img
              src={url}
              alt={label}
              className="max-h-[70vh] max-w-full object-contain"
              onError={() => {
                setBroken(true);
                setOpen(false);
              }}
            />
          </div>
        </InventoryModal>
      )}
    </div>
  );
};

export default MaintenanceImageDisplay;
