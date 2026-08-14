import { NavbarProductSearch } from "@/app/ui/nova/navbar-product-search";

export default function Search({ disabled = false }: Readonly<{ disabled?: boolean }>) {
  return <NavbarProductSearch variant="catalog" disabled={disabled} />;
}
