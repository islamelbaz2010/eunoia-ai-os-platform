import type {
  KnowledgeEntity,
  KnowledgeEntityType,
  KnowledgeRelationship,
  KnowledgeRelationshipType,
  RelationshipSubjectType,
} from "../types";

// ─── Co-occurrence rules ──────────────────────────────────────────────────────
// When both entity types appear in the same document, infer this relationship.

interface CoOccurrenceRule {
  readonly subjectType: KnowledgeEntityType;
  readonly objectType: KnowledgeEntityType;
  readonly relationshipType: KnowledgeRelationshipType;
  readonly baseConfidence: number;
}

const CO_OCCURRENCE_RULES: readonly CoOccurrenceRule[] = [
  {
    subjectType: "Company",
    objectType: "Service",
    relationshipType: "company_owns_service",
    baseConfidence: 0.7,
  },
  {
    subjectType: "Company",
    objectType: "Client",
    relationshipType: "company_worked_with_client",
    baseConfidence: 0.7,
  },
  {
    subjectType: "Person",
    objectType: "Company",
    relationshipType: "person_works_at_company",
    baseConfidence: 0.65,
  },
];

// ─── Document-reference rules ────────────────────────────────────────────────
// When the document contains an entity of these types, record a reference.

interface DocRefRule {
  readonly objectType: KnowledgeEntityType;
  readonly relationshipType: KnowledgeRelationshipType;
  readonly baseConfidence: number;
}

const DOC_REF_RULES: readonly DocRefRule[] = [
  {
    objectType: "Service",
    relationshipType: "document_references_service",
    baseConfidence: 0.8,
  },
  {
    objectType: "Client",
    relationshipType: "document_references_client",
    baseConfidence: 0.8,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bestByConfidence(entities: KnowledgeEntity[]): KnowledgeEntity {
  return entities.reduce((a, b) =>
    a.confidence >= b.confidence ? a : b
  );
}

function makeRelationship(params: {
  type: KnowledgeRelationshipType;
  subjectType: RelationshipSubjectType;
  subject: string;
  objectType: KnowledgeEntityType;
  object: string;
  confidence: number;
}): KnowledgeRelationship {
  return {
    type: params.type,
    subjectType: params.subjectType,
    subject: params.subject,
    objectType: params.objectType,
    object: params.object,
    confidence: Math.min(params.confidence, 1),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Infers relationships from entity co-occurrence within a document.
 * All relationships are probabilistic — confidence reflects extraction
 * quality of both endpoints and the base rule weight.
 *
 * documentId is used as the subject of document-reference relationships.
 */
export function buildRelationships(
  entities: readonly KnowledgeEntity[],
  documentId: string
): KnowledgeRelationship[] {
  const relationships: KnowledgeRelationship[] = [];

  const byType = new Map<KnowledgeEntityType, KnowledgeEntity[]>();
  for (const entity of entities) {
    const list = byType.get(entity.type) ?? [];
    list.push(entity);
    byType.set(entity.type, list);
  }

  // Entity-to-entity co-occurrence relationships
  for (const rule of CO_OCCURRENCE_RULES) {
    const subjects = byType.get(rule.subjectType);
    const objects = byType.get(rule.objectType);
    if (!subjects?.length || !objects?.length) continue;

    const subject = bestByConfidence(subjects);
    const object = bestByConfidence(objects);

    relationships.push(
      makeRelationship({
        type: rule.relationshipType,
        subjectType: rule.subjectType,
        subject: subject.value,
        objectType: rule.objectType,
        object: object.value,
        confidence:
          Math.min(subject.confidence, object.confidence) * rule.baseConfidence,
      })
    );
  }

  // Document-to-entity reference relationships
  for (const rule of DOC_REF_RULES) {
    const objects = byType.get(rule.objectType);
    if (!objects?.length) continue;

    const object = bestByConfidence(objects);
    relationships.push(
      makeRelationship({
        type: rule.relationshipType,
        subjectType: "Document",
        subject: documentId,
        objectType: rule.objectType,
        object: object.value,
        confidence: object.confidence * rule.baseConfidence,
      })
    );
  }

  return relationships;
}
