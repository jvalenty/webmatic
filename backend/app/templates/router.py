from fastapi import APIRouter, HTTPException
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
from pydantic import BaseModel

from ..core.db import db
from .models import TemplateManifest
from ..projects.models import Project
from ..projects.services import compute_plan, doc_to_project

router = APIRouter()


async def _seed_templates_if_needed():
    count = await db.templates.estimated_document_count()
    if count and count > 0:
        return
    seeds: List[Dict[str, Any]] = [
        {
            "_id": str(uuid.uuid4()),
            "name": "SaaS CRM",
            "category": "Vertical",
            "description": "Multi-tenant CRM with contacts, companies, deals, pipelines, roles, and billing-ready hooks.",
            "tags": ["saas", "crm", "multitenant"],
            "prompts": {
                "system": "Architect a production-grade SaaS CRM with multi-tenancy, RBAC, and billing hooks.",
                "user": "Implement core CRM flows: contacts, companies, deals, pipelines, notes." 
            },
            "entities": [
                {"name": "Contact", "fields": ["name", "email", "phone", "company_id", "owner_id"]},
                {"name": "Company", "fields": ["name", "domain", "owner_id"]},
                {"name": "Deal", "fields": ["title", "value", "stage", "contact_id", "company_id"]},
            ],
            "api_endpoints": ["/contacts", "/companies", "/deals"],
            "ui_structure": ["Dashboard", "Contacts", "Companies", "Deals"],
            "integrations": ["auth", "stripe"],
            "acceptance_criteria": ["Create/edit contacts", "Stage transitions for deals", "Role-based access"],
            "tests": ["CRUD endpoints respond 2xx", "RBAC enforces permissions"],
            "version": "1.0.0",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        },
        {
            "_id": str(uuid.uuid4()),
            "name": "Billing SaaS",
            "category": "Vertical",
            "description": "Subscriptions, invoices, payments, dunning, and plan upgrades with audit logs.",
            "tags": ["billing", "saas", "finance"],
            "prompts": {
                "system": "Design a billing platform with subscriptions and invoices.",
                "user": "Support trials, proration, tax, and payment retries for failed invoices."
            },
            "entities": [
                {"name": "Customer", "fields": ["email", "name", "default_payment_method"]},
                {"name": "Subscription", "fields": ["plan", "status", "renew_at", "customer_id"]},
                {"name": "Invoice", "fields": ["amount", "status", "due_date", "customer_id"]},
            ],
            "api_endpoints": ["/customers", "/subscriptions", "/invoices"],
            "ui_structure": ["Subscriptions", "Invoices", "Payments", "Reports"],
            "integrations": ["stripe", "email"],
            "acceptance_criteria": ["Create subscription", "Generate invoice", "Retry failed payment"],
            "tests": ["Invoice totals match line items", "Subscription state machine transitions"],
            "version": "1.0.0",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        },
        {
            "_id": str(uuid.uuid4()),
            "name": "Analytics Dashboard",
            "category": "Vertical",
            "description": "Ingestion, transformation, and dashboarding with filters and sharing.",
            "tags": ["analytics", "dashboard"],
            "prompts": {
                "system": "Create an analytics dashboard app with ingestion and charting.",
                "user": "Provide time-series charts, cohort analysis, and exports."
            },
            "entities": [
                {"name": "Event", "fields": ["type", "user_id", "timestamp", "properties"]},
                {"name": "Dashboard", "fields": ["title", "widgets", "owner_id"]},
            ],
            "api_endpoints": ["/events", "/dashboards"],
            "ui_structure": ["Dashboards", "Events", "Explore"],
            "integrations": ["ingestion", "csv_export"],
            "acceptance_criteria": ["Ingest events", "Create dashboard", "Share link with filters"],
            "tests": ["Query latency under threshold", "Widget rendering smoke test"],
            "version": "1.0.0",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        },
    ]
    await db.templates.insert_many(seeds)


@router.get("/templates")
async def list_templates():
    await _seed_templates_if_needed()
    docs = await db.templates.find().sort("created_at", -1).to_list(100)
    out = []
    for d in docs:
        out.append({
            "id": d.get("_id"),
            "name": d.get("name"),
            "category": d.get("category"),
            "description": d.get("description"),
            "tags": d.get("tags", []),
        })
    return out


@router.get("/templates/{template_id}", response_model=TemplateManifest)
async def get_template(template_id: str):
    await _seed_templates_if_needed()
    d = await db.templates.find_one({"_id": template_id})
    if not d:
        raise HTTPException(status_code=404, detail="Template not found")
    # Normalize to pydantic model
    return TemplateManifest(
        id=d.get("_id"),
        name=d.get("name"),
        category=d.get("category"),
        description=d.get("description"),
        tags=d.get("tags", []),
        prompts=d.get("prompts", {}),
        entities=d.get("entities", []),
        api_endpoints=d.get("api_endpoints", []),
        ui_structure=d.get("ui_structure", []),
        integrations=d.get("integrations", []),
        acceptance_criteria=d.get("acceptance_criteria", []),
        tests=d.get("tests", []),
        version=d.get("version", "1.0.0"),
        created_at=d.get("created_at"),
        updated_at=d.get("updated_at"),
    )


class CreateFromTemplateRequest(TemplateManifest):
    pass

class CreateFromTemplatePayloadDict(BaseModel):
    template_id: str
    name: Optional[str] = None
    overrides: Optional[Dict[str, Any]] = None
    provider: Optional[str] = "auto"


@router.post("/projects/from-template", response_model=Project)
async def create_project_from_template(payload: CreateFromTemplatePayloadDict):
    await _seed_templates_if_needed()
    t = await db.templates.find_one({"_id": payload.template_id})
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")

    name = payload.name or t.get("name")
    # Compose description for planner: template desc + integrations + entities + overrides
    parts = [
        f"Template: {t.get('name')} ({t.get('category')})",
        t.get("description", ""),
        f"Integrations: {', '.join(t.get('integrations', []))}",
        f"Entities: {', '.join([e.get('name') for e in t.get('entities', [])])}",
    ]
    if payload.overrides:
        parts.append(f"Overrides: {payload.overrides}")
    composed_description = "\n".join([p for p in parts if p])

    project = Project(name=name, description=composed_description)
    doc = project.dict()
    doc["_id"] = project.id
    await db.projects.insert_one(doc)

    # Compute plan using provider
    plan, meta = await compute_plan(project.description, payload.provider)

    # Update project with plan
    await db.projects.update_one(
        {"_id": project.id},
        {"$set": {"plan": plan.dict(), "status": "planned", "updated_at": datetime.utcnow()}},
    )

    # Insert run record
    run_doc = {
        "_id": str(uuid.uuid4()),
        "project_id": project.id,
        "provider": meta.get("provider"),
        "mode": meta.get("mode"),
        "status": "success",
        "error": meta.get("error"),
        "plan_counts": {
            "frontend": len(plan.frontend or []),
            "backend": len(plan.backend or []),
            "database": len(plan.database or []),
        },
        "created_at": datetime.utcnow(),
    }
    await db.runs.insert_one(run_doc)

    # Return fresh project
    d = await db.projects.find_one({"_id": project.id})
    return doc_to_project(d)