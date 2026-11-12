import React, { useState } from "react";
import { RefreshCcw } from "lucide-react";
import {
  hasAnyDashboardSection,
  resolveDashboardSections,
} from "./resolveDashboardSections";
import TechnicianWorkloadSection from "./sections/TechnicianWorkloadSection";
import BranchInventorySection from "./sections/BranchInventorySection";
import InventoryComplaintSection from "./sections/InventoryComplaintSection";

const GeneralDashboard: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const sections = resolveDashboardSections();
  const hasSections = hasAnyDashboardSection(sections);

  return (
    <div className="space-y-8 animate-fadeIn p-1">
      {/* <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#bc3342]">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Role-based overview of authorised inventory analytics.
          </p>
        </div>
        {hasSections && (
          <button
            type="button"
            className="kfc-btn-outline flex items-center gap-1"
            onClick={() => setRefreshKey((k) => k + 1)}
          >
            <RefreshCcw className="w-4 h-4" />
            Refresh All
          </button>
        )}
      </div> */}

      {!hasSections && (
        <div className="kfc-card p-8 text-center text-gray-600">
          <p className="font-medium text-gray-800">
            No dashboard sections available
          </p>
          <p className="text-sm mt-2">
            Your role does not have any authorised inventory dashboard sections.
            Contact an administrator to grant the relevant menu access.
          </p>
        </div>
      )}

      {sections.technicianWorkload && (
        <section className="space-y-4 border-t border-gray-100 pt-6 first:border-t-0 first:pt-0">
          <TechnicianWorkloadSection refreshKey={refreshKey} embedded />
        </section>
      )}

      {sections.branchInventory && (
        <section className="space-y-4 border-t border-gray-100 pt-6 first:border-t-0 first:pt-0">
          <BranchInventorySection refreshKey={refreshKey} embedded />
        </section>
      )}

      {/* Standalone complaints only when Branch Inventory (which embeds complaints) is absent. */}
      {sections.inventoryComplaint && !sections.branchInventory && (
        <section className="space-y-4 border-t border-gray-100 pt-6 first:border-t-0 first:pt-0">
          <InventoryComplaintSection refreshKey={refreshKey} embedded />
        </section>
      )}
    </div>
  );
};

export default GeneralDashboard;
