import "server-only";
import records from "../../../data/catalog.json";
import { publicCatalogProduct } from "./catalog-reader";

// The source file retains provenance for review/seed generation. It never
// belongs in a shared client module or serialized component props.
export function getLocalCatalog() {
  return records
    .filter(
      (p) =>
        (p.publicationStatus === "sample" &&
          p.verificationStatus === "needs_review") ||
        (p.publicationStatus === "published" &&
          p.verificationStatus === "verified"),
    )
    .map(publicCatalogProduct);
}
