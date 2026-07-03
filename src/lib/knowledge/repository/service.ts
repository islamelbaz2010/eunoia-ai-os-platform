import type { KnowledgeAsset, KnowledgeCategory, Department, Industry } from "../types";
import type {
  SourceRecord,
  KnowledgeObject,
  AssetVersion,
  AssetFilter,
  AssetPatch,
  SaveOptions,
  UpdateOptions,
  SaveResult,
  UpdateResult,
  AssetIndex,
  EntityIndex,
  RelationshipIndex,
  SourceIndex,
  CategoryIndex,
  DepartmentIndex,
  IndustryIndex,
} from "./types";

// ─── Mutable builder types used only within buildIndexes ──────────────────────

interface EntityEntry {
  entityId: string;
  entityType: string;
  assetIds: string[];
  occurrenceCount: number;
  confidence: number;
}

interface RelEntry {
  relationshipType: string;
  subjectValue: string;
  objectValue: string;
  assetIds: string[];
  count: number;
}

// ─── KnowledgeRepository ──────────────────────────────────────────────────────

export class KnowledgeRepository {
  private assets = new Map<string, KnowledgeAsset>();
  private versions = new Map<string, AssetVersion[]>(); // assetId → history
  private sources = new Map<string, SourceRecord>();
  private objects = new Map<string, KnowledgeObject[]>(); // assetId → objects
  private hashIndex = new Map<string, string>();           // hash → assetId
  private canonicalIndex = new Map<string, string>();      // canonicalId → assetId

  // ─── Asset CRUD ──────────────────────────────────────────────────────────────

  saveAsset(asset: KnowledgeAsset, options: SaveOptions = {}): SaveResult {
    const duplicateId = this.hashIndex.get(asset.hash);
    const wasDuplicate = duplicateId !== undefined && duplicateId !== asset.id;
    const isNew = !this.assets.has(asset.id);

    this.assets.set(asset.id, asset);
    this.hashIndex.set(asset.hash, asset.id);
    this.canonicalIndex.set(asset.canonicalId, asset.id);

    const version: AssetVersion = {
      version: asset.assetVersion,
      assetId: asset.id,
      canonicalId: asset.canonicalId,
      hash: asset.hash,
      etag: asset.etag,
      createdAt: new Date().toISOString(),
      createdBy: options.createdBy ?? null,
      changeNote: options.changeNote ?? null,
      processingStatus: asset.processingStatus,
      validationStatus: asset.validationStatus,
      asset,
    };

    const history = this.versions.get(asset.id) ?? [];
    history.push(version);
    this.versions.set(asset.id, history);

    return { asset, version, isNew, wasDuplicate };
  }

  updateAsset(
    id: string,
    patch: AssetPatch,
    options: UpdateOptions = {}
  ): UpdateResult {
    const current = this.assets.get(id);
    if (!current) throw new Error(`Asset not found: ${id}`);

    const history = this.versions.get(id) ?? [];
    const previousVersion = history[history.length - 1];
    if (!previousVersion) throw new Error(`Version history missing for: ${id}`);

    const newVersionNumber = current.assetVersion + 1;
    const updated: KnowledgeAsset = {
      ...current,
      assetVersion: newVersionNumber,
      etag: `${current.hash}:${newVersionNumber}`,
      processingStatus: patch.processingStatus ?? current.processingStatus,
      validationStatus: patch.validationStatus ?? current.validationStatus,
      visibility: patch.visibility ?? current.visibility,
      classification: patch.classification ?? current.classification,
      securityLevel: patch.securityLevel ?? current.securityLevel,
      sourceId:
        patch.sourceId !== undefined ? patch.sourceId : current.sourceId,
      reviewedBy:
        patch.reviewedBy !== undefined ? patch.reviewedBy : current.reviewedBy,
      approvedBy:
        patch.approvedBy !== undefined ? patch.approvedBy : current.approvedBy,
      publishedAt:
        patch.publishedAt !== undefined
          ? patch.publishedAt
          : current.publishedAt,
    };

    this.assets.set(id, updated);

    const newVersion: AssetVersion = {
      version: newVersionNumber,
      assetId: id,
      canonicalId: updated.canonicalId,
      hash: updated.hash,
      etag: updated.etag,
      createdAt: new Date().toISOString(),
      createdBy: options.updatedBy ?? null,
      changeNote: options.changeNote ?? patch.changeNote ?? null,
      processingStatus: updated.processingStatus,
      validationStatus: updated.validationStatus,
      asset: updated,
    };

    history.push(newVersion);
    this.versions.set(id, history);

    return { asset: updated, previousVersion, newVersion };
  }

  deleteAsset(id: string): boolean {
    const asset = this.assets.get(id);
    if (!asset) return false;
    this.assets.delete(id);
    this.hashIndex.delete(asset.hash);
    this.canonicalIndex.delete(asset.canonicalId);
    this.versions.delete(id);
    this.objects.delete(id);
    return true;
  }

  archiveAsset(id: string, archivedBy?: string): KnowledgeAsset {
    return this.updateAsset(
      id,
      { processingStatus: "Archived", changeNote: "Archived" },
      { updatedBy: archivedBy }
    ).asset;
  }

  publishAsset(id: string, publishedBy?: string): KnowledgeAsset {
    return this.updateAsset(
      id,
      {
        processingStatus: "Published",
        approvedBy: publishedBy ?? null,
        publishedAt: new Date().toISOString(),
        changeNote: "Published",
      },
      { updatedBy: publishedBy }
    ).asset;
  }

  // ─── Queries ─────────────────────────────────────────────────────────────────

  getAsset(id: string): KnowledgeAsset | null {
    return this.assets.get(id) ?? null;
  }

  getAssetByCanonicalId(canonicalId: string): KnowledgeAsset | null {
    const id = this.canonicalIndex.get(canonicalId);
    if (!id) return null;
    return this.assets.get(id) ?? null;
  }

  getAssetHistory(id: string): AssetVersion[] {
    return this.versions.get(id) ?? [];
  }

  listAssets(filter: AssetFilter = {}): KnowledgeAsset[] {
    return Array.from(this.assets.values()).filter((a) => {
      if (filter.category !== undefined && a.category !== filter.category)
        return false;
      if (filter.assetType !== undefined && a.assetType !== filter.assetType)
        return false;
      if (
        filter.department !== undefined &&
        a.metadata.department !== filter.department
      )
        return false;
      if (
        filter.industry !== undefined &&
        a.metadata.industry !== filter.industry
      )
        return false;
      if (
        filter.language !== undefined &&
        a.metadata.language !== filter.language
      )
        return false;
      if (
        filter.processingStatus !== undefined &&
        a.processingStatus !== filter.processingStatus
      )
        return false;
      if (
        filter.validationStatus !== undefined &&
        a.validationStatus !== filter.validationStatus
      )
        return false;
      if (filter.visibility !== undefined && a.visibility !== filter.visibility)
        return false;
      if (
        filter.securityLevel !== undefined &&
        a.securityLevel !== filter.securityLevel
      )
        return false;
      if (
        filter.classification !== undefined &&
        a.classification !== filter.classification
      )
        return false;
      if (filter.sourceId !== undefined && a.sourceId !== filter.sourceId)
        return false;
      if (
        filter.dateAfter !== undefined &&
        a.metadata.modified < filter.dateAfter
      )
        return false;
      if (
        filter.dateBefore !== undefined &&
        a.metadata.modified > filter.dateBefore
      )
        return false;
      if (
        filter.minConfidence !== undefined &&
        a.scores.confidence < filter.minConfidence
      )
        return false;
      return true;
    });
  }

  // ─── Source management ───────────────────────────────────────────────────────

  saveSource(source: SourceRecord): void {
    this.sources.set(source.id, source);
  }

  getSource(id: string): SourceRecord | null {
    return this.sources.get(id) ?? null;
  }

  listSources(): SourceRecord[] {
    return Array.from(this.sources.values());
  }

  // ─── Knowledge Object management ─────────────────────────────────────────────

  saveObject(obj: KnowledgeObject): void {
    const list = this.objects.get(obj.assetId) ?? [];
    list.push(obj);
    this.objects.set(obj.assetId, list);
  }

  getObjectsByAsset(assetId: string): KnowledgeObject[] {
    return this.objects.get(assetId) ?? [];
  }

  // ─── Index building ──────────────────────────────────────────────────────────

  buildIndexes(): {
    assets: AssetIndex[];
    entities: EntityIndex[];
    relationships: RelationshipIndex[];
    sources: SourceIndex[];
    categories: CategoryIndex[];
    departments: DepartmentIndex[];
    industries: IndustryIndex[];
  } {
    const allAssets = Array.from(this.assets.values());

    const assets: AssetIndex[] = allAssets.map((a) => ({
      assetId: a.id,
      canonicalId: a.canonicalId,
      title: a.title,
      assetType: a.assetType,
      category: a.category,
      department: a.metadata.department,
      industry: a.metadata.industry,
      language: a.metadata.language,
      processingStatus: a.processingStatus,
      visibility: a.visibility,
      keywords: [...a.keywords.primary, ...a.keywords.secondary],
      createdAt: a.metadata.created,
      modifiedAt: a.metadata.modified,
    }));

    // Entity index
    const entityMap = new Map<string, EntityEntry>();
    for (const asset of allAssets) {
      for (const entity of asset.entities) {
        const key = `${entity.type}::${entity.normalized}`;
        const existing = entityMap.get(key);
        if (existing) {
          existing.assetIds.push(asset.id);
          existing.occurrenceCount += entity.occurrences;
        } else {
          entityMap.set(key, {
            entityId: entity.normalized,
            entityType: entity.type,
            assetIds: [asset.id],
            occurrenceCount: entity.occurrences,
            confidence: entity.confidence,
          });
        }
      }
    }
    const entities: EntityIndex[] = Array.from(entityMap.values());

    // Relationship index
    const relMap = new Map<string, RelEntry>();
    for (const asset of allAssets) {
      for (const rel of asset.relationships) {
        const key = `${rel.type}::${rel.subject}::${rel.object}`;
        const existing = relMap.get(key);
        if (existing) {
          existing.assetIds.push(asset.id);
          existing.count++;
        } else {
          relMap.set(key, {
            relationshipType: rel.type,
            subjectValue: rel.subject,
            objectValue: rel.object,
            assetIds: [asset.id],
            count: 1,
          });
        }
      }
    }
    const relationships: RelationshipIndex[] = Array.from(relMap.values());

    // Source index
    const sourceEntries: SourceIndex[] = Array.from(this.sources.values()).map(
      (src) => ({
        sourceId: src.id,
        sourceType: src.type,
        checksum: src.checksum,
        assetIds: allAssets
          .filter((a) => a.sourceId === src.id)
          .map((a) => a.id),
      })
    );

    // Category, department, industry indexes
    const catMap = new Map<string, string[]>();
    const deptMap = new Map<string, string[]>();
    const indMap = new Map<string, string[]>();
    for (const asset of allAssets) {
      (catMap.get(asset.category) ?? catMap.set(asset.category, []).get(asset.category)!).push(asset.id);
      (deptMap.get(asset.metadata.department) ?? deptMap.set(asset.metadata.department, []).get(asset.metadata.department)!).push(asset.id);
      (indMap.get(asset.metadata.industry) ?? indMap.set(asset.metadata.industry, []).get(asset.metadata.industry)!).push(asset.id);
    }

    const categories: CategoryIndex[] = Array.from(catMap.entries()).map(
      ([category, ids]) => ({
        category: category as KnowledgeCategory,
        assetCount: ids.length,
        assetIds: ids,
      })
    );
    const departments: DepartmentIndex[] = Array.from(deptMap.entries()).map(
      ([dept, ids]) => ({
        department: dept as Department,
        assetCount: ids.length,
        assetIds: ids,
      })
    );
    const industries: IndustryIndex[] = Array.from(indMap.entries()).map(
      ([ind, ids]) => ({
        industry: ind as Industry,
        assetCount: ids.length,
        assetIds: ids,
      })
    );

    return {
      assets,
      entities,
      relationships,
      sources: sourceEntries,
      categories,
      departments,
      industries,
    };
  }

  // ─── Utility ─────────────────────────────────────────────────────────────────

  size(): number {
    return this.assets.size;
  }

  clear(): void {
    this.assets.clear();
    this.versions.clear();
    this.sources.clear();
    this.objects.clear();
    this.hashIndex.clear();
    this.canonicalIndex.clear();
  }
}
