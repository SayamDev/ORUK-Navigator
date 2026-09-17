import type { CatalogueService } from "@/domain/catalogue";

export interface CatalogueRepository {
  listActive(): Promise<CatalogueService[]>;
  findActiveBySlug(slug: string): Promise<CatalogueService | null>;
  findActiveByPublicId(publicId: string): Promise<CatalogueService | null>;
}
