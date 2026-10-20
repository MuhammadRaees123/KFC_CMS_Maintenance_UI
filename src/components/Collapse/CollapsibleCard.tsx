import { useRef, useState, useEffect } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

export default function CollapsibleSection({ title, children }) {
  const [open, setOpen] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-adjust height on open
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    if (open) {
      el.style.height = el.scrollHeight + "px";
      el.style.opacity = "1";

      // Set to auto after animation ends
      const t = setTimeout(() => {
        el.style.height = "auto";
      }, 350);

      return () => clearTimeout(t);
    } else {
      el.style.height = el.scrollHeight + "px";
      el.style.opacity = "0";

      requestAnimationFrame(() => {
        el.style.height = "0px";
      });
    }
  }, [open]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">

      {/* --- HEADER BAR --- */}
      <div
        className="px-4 py-3 flex justify-between items-center border-b cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <h2 className="text-lg font-semibold tracking-wide text-red-700 uppercase text-center">
          {title}
        </h2>

        {/* ICON */}
        <div className="transition-transform duration-300">
          {open ? (
            <ChevronUp className="text-red-600 w-5 h-5" />
          ) : (
            <ChevronDown className="text-red-600 w-5 h-5" />
          )}
        </div>
      </div>

      {/* --- COLLAPSIBLE CONTENT --- */}
      <div
        ref={contentRef}
        style={{
          height: open ? "auto" : "0px",
          overflow: "hidden",
          opacity: open ? 1 : 0,
          transition: "height 0.35s ease, opacity 0.35s ease"
        }}
      >
        <div className="px-4 py-4">{children}</div>
      </div>
    </div>
  );
}
