import { useEffect, useRef, useState } from "react";
import { useFacility } from "@/contexts/FacilityContext";
import "./FacilitySelector.css";

export default function FacilitySelector() {
  const { facilities, selectedFacilityId, setSelectedFacilityId } = useFacility();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = facilities.find((f) => String(f.id) === selectedFacilityId);

  useEffect(() => {
    if (!open) return;

    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const handleSelect = (id: string) => {
    setSelectedFacilityId(id);
    setOpen(false);
  };

  return (
    <div className="fsel" ref={ref}>
      <span className="fsel__label">Filial</span>
      <button
        type="button"
        className="fsel__trigger"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="fsel__value">{selected ? selected.name : "Selecionar filial"}</span>
        <svg
          className={`fsel__chevron ${open ? "fsel__chevron--open" : ""}`}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <ul className="fsel__menu" role="listbox">
          {facilities.length === 0 ? (
            <li className="fsel__empty">Nenhuma filial</li>
          ) : (
            facilities.map((facility) => (
              <li
                key={facility.id}
                role="option"
                aria-selected={String(facility.id) === selectedFacilityId}
              >
                <button
                  type="button"
                  className={`fsel__option ${String(facility.id) === selectedFacilityId ? "fsel__option--active" : ""}`}
                  onClick={() => handleSelect(String(facility.id))}
                >
                  {facility.name}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
