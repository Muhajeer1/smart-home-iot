import { Link } from "react-router-dom";
import { ChevronRight, House } from "lucide-react";

export function Breadcrumbs({
  items,
}: {
  items: { label: string; to?: string }[];
}) {
  return (
    <nav className="space-breadcrumbs" aria-label="Breadcrumb">
      <ol>
        <li>
          <Link to="/homes">
            <House size={15} />
            My homes
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index}>
            <ChevronRight size={14} />
            {item.to ? (
              <Link to={item.to}>{item.label}</Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
