import React, { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { getAllMenus, saveMenu, deleteMenu, restoreMenu } from "@/services/api";
import { Pencil, Trash2, RefreshCcw  } from "lucide-react";

const MenuManagement: React.FC = () => {
  const [formData, setFormData] = useState({
    menuId: "",
    parentMenuId: "",
    menuTitle: "",
    menuUrl: "",
    iconClass: "",
    displayOrder: "",
    isActive: true,
  });

  const [menus, setMenus] = useState<any[]>([]);
  const [parentMenus, setParentMenus] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    try {
      const response = await getAllMenus();
      let allMenus: any[] = [];

      if (response?.data) {
        if (typeof response.data === "string") {
          try {
            allMenus = JSON.parse(response.data);
          } catch {
            allMenus = [];
          }
        } else if (Array.isArray(response.data)) {
          allMenus = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          allMenus = response.data.data;
        }
      }

      setMenus(allMenus);
      const topLevel = allMenus.filter((m: any) => !m.ParentMenuID);
      setParentMenus(topLevel);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load menus.",
        variant: "destructive",
      });
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggle = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isActive: checked }));
  };

  const resetForm = () => {
    setFormData({
      menuId: "",
      parentMenuId: "",
      menuTitle: "",
      menuUrl: "",
      iconClass: "",
      displayOrder: "",
      isActive: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        MenuID: formData.menuId ? Number(formData.menuId) : null,
        ParentMenuID: formData.parentMenuId
          ? Number(formData.parentMenuId)
          : null,
        MenuTitle: formData.menuTitle.trim(),
        MenuURL: formData.menuUrl.trim(),
        IconClass: formData.iconClass.trim(),
        DisplayOrder: Number(formData.displayOrder) || 0,
        IsActive: !!formData.isActive,
        CreatedBy: 1,
      };

      toast({
        title: isEditing ? "Updating menu..." : "Saving menu...",
      });

      await saveMenu(payload);

      toast({
        title: "Success",
        description: isEditing
          ? `Menu updated successfully`
          : `Menu saved successfully`,
      });

      resetForm();
      setIsEditing(false);
      fetchMenus();
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.response?.data?.message ||
          "Failed to save or update menu.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (menu: any) => {
    setFormData({
      menuId: menu.MenuID?.toString() || "",
      parentMenuId: menu.ParentMenuID?.toString() || "",
      menuTitle: menu.MenuTitle || "",
      menuUrl: menu.MenuURL || "",
      iconClass: menu.IconClass || "",
      displayOrder: menu.DisplayOrder?.toString() || "",
      isActive: menu.IsActive === true || menu.IsActive === 1,
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast({
      title: "Edit Mode",
      description: `You are now editing "${menu.MenuTitle}"`,
    });
  };

  const handleCancelEdit = () => {
    resetForm();
    setIsEditing(false);
    toast({ title: "Edit cancelled", description: "Form reset." });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this menu?")) return;
    try {
      await deleteMenu(id);
      toast({
        title: "Deleted",
        description: `Menu deleted successfully.`,
      });
      fetchMenus();
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete menu.",
        variant: "destructive",
      });
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await restoreMenu(id);
      toast({
        title: "Restored",
        description: `Menu restored successfully.`,
      });
      fetchMenus();
    } catch {
      toast({
        title: "Error",
        description: "Failed to restore menu.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-2">
        <h1 className="text-2xl font-bold text-[#bc3342]">
          Menu Management
        </h1>
      </div>


      {/* Compact Form */}
      <div className="kfc-card">
        <div className="kfc-card-header">
          {isEditing ? "Edit Menu" : "Add New Menu"}
        </div>

        <form onSubmit={handleSubmit} className="kfc-form p-4">
          {/* Parent Menu */}
          <div>
            <label className="kfc-label">Parent Menu (optional)</label>
            <select
              name="parentMenuId"
              value={formData.parentMenuId}
              onChange={handleChange}
              className="kfc-input"
            >
              <option value="">-- None (Top Level) --</option>
              {parentMenus.map((menu) => (
                <option key={menu.MenuID} value={menu.MenuID}>
                  {menu.MenuTitle}
                </option>
              ))}
            </select>
          </div>

          {/* Menu Title */}
          <div>
            <label className="kfc-label">Menu Title</label>
            <input
              type="text"
              name="menuTitle"
              value={formData.menuTitle}
              onChange={handleChange}
              className="kfc-input"
              placeholder="e.g. Menu Management"
              required
            />
          </div>

          {/* Menu URL */}
          <div>
            <label className="kfc-label">Menu URL</label>
            <input
              type="text"
              name="menuUrl"
              value={formData.menuUrl}
              onChange={handleChange}
              className="kfc-input"
              placeholder="/menu-management"
              required
            />
          </div>

          {/* Icon */}
          <div>
            <label className="kfc-label">Icon Class</label>
            <input
              type="text"
              name="iconClass"
              value={formData.iconClass}
              onChange={handleChange}
              className="kfc-input"
              placeholder="fa-solid fa-list"
            />
          </div>

          {/* Display Order */}
          <div>
            <label className="kfc-label">Display Order</label>
            <input
              type="number"
              name="displayOrder"
              min="1"
              value={formData.displayOrder}
              onChange={handleChange}
              className="kfc-input"
            />
          </div>

          {/* Active Toggle */}
          <div className="kfc-switch">
            <span>Active</span>
            <Switch checked={formData.isActive} onCheckedChange={handleToggle} />
          </div>

          {/* Buttons */}
          <div className="col-span-full flex justify-end gap-2 mt-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  className="kfc-btn-outline"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
                <button type="submit" className="kfc-btn">
                  Update Menu
                </button>
              </>
            ) : (
              <button type="submit" className="kfc-btn">
                Save Menu
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 🔽 Menu List Table */}
      <div className="kfc-card">
        <div className="kfc-card-header">Existing Menus</div>

        <div className="p-3 overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead className="bg-[#fff6f6] text-[#bc3342]">
              <tr>
                <th className="border px-3 py-2 text-left">#</th>
                <th className="border px-3 py-2 text-left">Menu Title</th>
                <th className="border px-3 py-2 text-left">URL</th>
                <th className="border px-3 py-2 text-left">Icon</th>
                <th className="border px-3 py-2 text-left">Parent Menu</th>
                <th className="border px-3 py-2 text-center">Active</th>
                <th className="border px-3 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {menus.length > 0 ? (
                menus.map((menu: any, index: number) => (
                  <tr
                    key={menu.MenuID}
                    className={
                      menu.IsActive
                        ? "bg-white hover:bg-gray-50"
                        : "bg-gray-100 text-gray-400 italic"
                    }
                  >
                    <td className="border px-3 py-1.5">{index + 1}</td>
                    <td className="border px-3 py-1.5 font-medium">
                      {menu.MenuTitle}
                    </td>
                    <td className="border px-3 py-1.5 text-gray-600">
                      {menu.MenuURL || "-"}
                    </td>
                    <td className="border px-3 py-1.5 text-gray-600">
                      {menu.IconClass || "-"}
                    </td>
                    <td className="border px-3 py-1.5 text-gray-600">
                      {menu.ParentMenuTitle || "-"}
                    </td>
                    <td className="border px-3 py-1.5 text-center">
                      {menu.IsActive ? (
                        <span className="text-green-600 font-semibold">✔</span>
                      ) : (
                        <span className="text-red-500 font-semibold">✖</span>
                      )}
                    </td>
                    <td className="border px-3 py-1.5 text-center space-x-2">
                      {menu.IsActive ? (
                        <>
  <button
    onClick={() => handleEdit(menu)}
    title="Edit"
    className="kfc-btn-outline p-1.5 rounded-md hover:border-[#bc3342] hover:text-[#bc3342]"
  >
    <Pencil className="w-4 h-4" />
  </button>

  <button
    onClick={() => handleDelete(menu.MenuID)}
    title="Delete"
    className="kfc-btn p-1.5 rounded-md bg-[#bc3342] hover:bg-[#a82d3a]"
  >
    <Trash2 className="w-4 h-4 text-white" />
  </button>
</>
                      ) : (
                        <button
  onClick={() => handleRestore(menu.MenuID)}
  title="Restore"
  className="kfc-btn p-1.5 rounded-md bg-green-600 hover:bg-green-700"
>
  <RefreshCcw className="w-4 h-4 text-white" />
</button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="border px-3 py-4 text-center text-gray-500"
                  >
                    No menus found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>


    </div>
  );
};

export default MenuManagement;
