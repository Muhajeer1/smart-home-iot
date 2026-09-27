import { House } from "lucide-react";

export function Brand() {
  return (
    <span className="brand">
      <span className="brand-symbol">
        <House size={21} strokeWidth={1.8} />
      </span>
      <span>
        smart<span className="brand-light">home</span>
        <span className="brand-dot">.</span>
      </span>
    </span>
  );
}
