import React from "react";
import InventoryModal from "@/pages/Inventory/components/InventoryModal";

type DashboardStatusDetailModalProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
};

const DashboardStatusDetailModal: React.FC<DashboardStatusDetailModalProps> = ({
  title,
  open,
  onClose,
  children,
  wide = true,
}) => {
  if (!open) return null;

  return (
    <InventoryModal title={title} onClose={onClose} wide={wide}>
      {children}
    </InventoryModal>
  );
};

export default DashboardStatusDetailModal;
