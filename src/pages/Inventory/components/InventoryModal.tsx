import React from "react";
import { X } from "lucide-react";

type InventoryModalProps = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
};

const InventoryModal: React.FC<InventoryModalProps> = ({
  title,
  onClose,
  children,
  wide = false,
}) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50 p-4">
      <div
        className={`bg-white rounded-lg shadow-lg ${
          wide ? "w-[900px]" : "w-[560px]"
        } max-w-[95%] max-h-[90vh] overflow-y-auto relative`}
      >
        <div className="flex justify-between items-center border-b px-4 py-2 sticky top-0 bg-white z-10">
          <h2 className="font-semibold text-gray-700">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-red-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

export default InventoryModal;
