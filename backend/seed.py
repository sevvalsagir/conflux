# -*- coding: utf-8 -*-
"""
Conflux - Database Seed Script
Run: venv\Scripts\python seed.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from datetime import datetime, timedelta
from database import Base, engine, SessionLocal
import models
from auth import hash_password

print("Dropping and recreating all tables...")
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
print("Tables created.\n")

db = SessionLocal()
now = datetime.utcnow()

# =============================================================================
# 1. USERS
# =============================================================================
print("[1/6] Creating users...")

# --- Team Alpha (E-Commerce)
sarah   = models.User(email="sarah@conflux.com",   name="Sarah Mitchell",   hashed_password=hash_password("123456"), role="manager")
james   = models.User(email="james@conflux.com",   name="James Carter",    hashed_password=hash_password("123456"), role="member")
emily   = models.User(email="emily@conflux.com",   name="Emily Chen",      hashed_password=hash_password("123456"), role="member")
tom     = models.User(email="tom@conflux.com",     name="Tom Bradshaw",    hashed_password=hash_password("123456"), role="member")

# --- Team Beta (Mobile Banking)
david   = models.User(email="david@conflux.com",   name="David Nguyen",    hashed_password=hash_password("123456"), role="manager")
laura   = models.User(email="laura@conflux.com",   name="Laura Sanchez",   hashed_password=hash_password("123456"), role="member")
kevin   = models.User(email="kevin@conflux.com",   name="Kevin Park",      hashed_password=hash_password("123456"), role="member")

# --- Team Gamma (Internal Tools)
rachel  = models.User(email="rachel@conflux.com",  name="Rachel Thompson", hashed_password=hash_password("123456"), role="manager")
alex    = models.User(email="alex@conflux.com",    name="Alex Rivera",     hashed_password=hash_password("123456"), role="member")
nina    = models.User(email="nina@conflux.com",    name="Nina Patel",      hashed_password=hash_password("123456"), role="member")

# --- Stakeholders
investor = models.User(email="investor@conflux.com", name="Robert Harmon",  hashed_password=hash_password("123456"), role="stakeholder")
cto      = models.User(email="cto@conflux.com",      name="Angela Ford",    hashed_password=hash_password("123456"), role="stakeholder")

all_users = [sarah, james, emily, tom, david, laura, kevin, rachel, alex, nina, investor, cto]
db.add_all(all_users)
db.commit()
for u in all_users:
    db.refresh(u)

print("  sarah@conflux.com      (manager)     pw: 123456")
print("  james@conflux.com      (member)      pw: 123456")
print("  emily@conflux.com      (member)      pw: 123456")
print("  tom@conflux.com        (member)      pw: 123456")
print("  david@conflux.com      (manager)     pw: 123456")
print("  laura@conflux.com      (member)      pw: 123456")
print("  kevin@conflux.com      (member)      pw: 123456")
print("  rachel@conflux.com     (manager)     pw: 123456")
print("  alex@conflux.com       (member)      pw: 123456")
print("  nina@conflux.com       (member)      pw: 123456")
print("  investor@conflux.com   (stakeholder) pw: 123456")
print("  cto@conflux.com        (stakeholder) pw: 123456")


# =============================================================================
# 2. PROJECTS
# =============================================================================
print("\n[2/6] Creating projects...")

p1 = models.Project(
    name="ShopWave E-Commerce Platform",
    description="A full-featured e-commerce web application where users can browse products, manage carts, and complete purchases. Includes admin dashboard, order tracking, and Stripe payment integration.",
    owner_id=sarah.id, is_archived=False,
    created_at=now - timedelta(days=90),
)
p2 = models.Project(
    name="NeoBank Mobile App",
    description="A cross-platform mobile banking application for iOS and Android. Covers account summary, peer-to-peer transfers, push notifications, biometric login, and virtual card management.",
    owner_id=david.id, is_archived=False,
    created_at=now - timedelta(days=55),
)
p3 = models.Project(
    name="IntraFlow CRM",
    description="An internal CRM tool for the sales team to manage customer relationships, track opportunities through a pipeline, assign tasks, and set reminders.",
    owner_id=rachel.id, is_archived=False,
    created_at=now - timedelta(days=14),
)
p4 = models.Project(
    name="HealthTrack Patient Portal",
    description="A web portal allowing patients to book appointments, view lab results, message their doctors, and manage prescriptions online.",
    owner_id=sarah.id, is_archived=False,
    created_at=now - timedelta(days=40),
)
p5 = models.Project(
    name="LogiCore Warehouse System",
    description="An internal warehouse management system for tracking inventory levels, processing shipments, generating reports, and integrating with third-party logistics APIs.",
    owner_id=david.id, is_archived=True,
    created_at=now - timedelta(days=120),
)

all_projects = [p1, p2, p3, p4, p5]
db.add_all(all_projects)
db.commit()
for p in all_projects:
    db.refresh(p)

print("  ShopWave E-Commerce Platform")
print("  NeoBank Mobile App")
print("  IntraFlow CRM")
print("  HealthTrack Patient Portal")
print("  LogiCore Warehouse System (archived)")


# =============================================================================
# 3. MEMBERSHIPS
# =============================================================================
print("\n[3/6] Creating memberships...")

memberships = [
    # ShopWave
    models.ProjectMember(project_id=p1.id, user_id=sarah.id,    role=models.UserRole.manager),
    models.ProjectMember(project_id=p1.id, user_id=james.id,    role=models.UserRole.member),
    models.ProjectMember(project_id=p1.id, user_id=emily.id,    role=models.UserRole.member),
    models.ProjectMember(project_id=p1.id, user_id=tom.id,      role=models.UserRole.member),
    models.ProjectMember(project_id=p1.id, user_id=investor.id, role=models.UserRole.stakeholder),
    models.ProjectMember(project_id=p1.id, user_id=cto.id,      role=models.UserRole.stakeholder),
    # NeoBank
    models.ProjectMember(project_id=p2.id, user_id=david.id,    role=models.UserRole.manager),
    models.ProjectMember(project_id=p2.id, user_id=laura.id,    role=models.UserRole.member),
    models.ProjectMember(project_id=p2.id, user_id=kevin.id,    role=models.UserRole.member),
    models.ProjectMember(project_id=p2.id, user_id=emily.id,    role=models.UserRole.member),
    models.ProjectMember(project_id=p2.id, user_id=investor.id, role=models.UserRole.stakeholder),
    # IntraFlow CRM
    models.ProjectMember(project_id=p3.id, user_id=rachel.id,   role=models.UserRole.manager),
    models.ProjectMember(project_id=p3.id, user_id=alex.id,     role=models.UserRole.member),
    models.ProjectMember(project_id=p3.id, user_id=nina.id,     role=models.UserRole.member),
    models.ProjectMember(project_id=p3.id, user_id=cto.id,      role=models.UserRole.stakeholder),
    # HealthTrack
    models.ProjectMember(project_id=p4.id, user_id=sarah.id,    role=models.UserRole.manager),
    models.ProjectMember(project_id=p4.id, user_id=laura.id,    role=models.UserRole.member),
    models.ProjectMember(project_id=p4.id, user_id=alex.id,     role=models.UserRole.member),
    models.ProjectMember(project_id=p4.id, user_id=nina.id,     role=models.UserRole.member),
    models.ProjectMember(project_id=p4.id, user_id=investor.id, role=models.UserRole.stakeholder),
    # LogiCore
    models.ProjectMember(project_id=p5.id, user_id=david.id,    role=models.UserRole.manager),
    models.ProjectMember(project_id=p5.id, user_id=james.id,    role=models.UserRole.member),
    models.ProjectMember(project_id=p5.id, user_id=kevin.id,    role=models.UserRole.member),
    models.ProjectMember(project_id=p5.id, user_id=cto.id,      role=models.UserRole.stakeholder),
]
db.add_all(memberships)
db.commit()
print("  All memberships created.")


# =============================================================================
# 4. BASELINES, FEATURES & MILESTONES
# =============================================================================
print("\n[4/6] Creating baselines, features and milestones...")

# ── P1: ShopWave (LOCKED, 80 days ago) ──────────────────────────────────────
b1 = models.Baseline(
    project_id=p1.id, is_locked=True,
    locked_at=now - timedelta(days=80),
    snapshot={"features_count": 7, "total_effort_days": 105, "milestones_count": 4},
    created_at=now - timedelta(days=88),
)
db.add(b1); db.commit(); db.refresh(b1)

db.add_all([
    models.Feature(baseline_id=b1.id, name="User Registration & Authentication",  description="Email/password signup, JWT auth, password reset flow.",          effort_days=6,  status=models.FeatureStatus.completed),
    models.Feature(baseline_id=b1.id, name="Product Listing & Search",            description="Category filters, keyword search, sort by price/rating.",        effort_days=12, status=models.FeatureStatus.completed),
    models.Feature(baseline_id=b1.id, name="Shopping Cart & Checkout",            description="Add to cart, quantity management, Stripe payment integration.",   effort_days=22, status=models.FeatureStatus.completed),
    models.Feature(baseline_id=b1.id, name="Order Management",                    description="Order creation, status tracking, order history page.",            effort_days=15, status=models.FeatureStatus.in_progress),
    models.Feature(baseline_id=b1.id, name="Admin Dashboard",                     description="Product & order management panel for admins.",                    effort_days=20, status=models.FeatureStatus.in_progress),
    models.Feature(baseline_id=b1.id, name="Email Notifications",                 description="Order confirmation, shipping updates via SendGrid.",              effort_days=8,  status=models.FeatureStatus.planned),
    models.Feature(baseline_id=b1.id, name="Product Reviews & Ratings",           description="Star rating system, review submission, moderation queue.",        effort_days=10, status=models.FeatureStatus.planned),
])
db.add_all([
    models.Milestone(baseline_id=b1.id, name="MVP Launch",             due_date="2026-01-15", is_completed=True,  completed_at=now - timedelta(days=65)),
    models.Milestone(baseline_id=b1.id, name="Payment Integration",    due_date="2026-02-28", is_completed=True,  completed_at=now - timedelta(days=21)),
    models.Milestone(baseline_id=b1.id, name="Admin Panel Complete",   due_date="2026-04-10", is_completed=False),
    models.Milestone(baseline_id=b1.id, name="Production Release",     due_date="2026-05-30", is_completed=False),
])
db.commit()
print("  ShopWave: 7 features, 4 milestones (LOCKED)")

# ── P2: NeoBank (LOCKED, 45 days ago) ───────────────────────────────────────
b2 = models.Baseline(
    project_id=p2.id, is_locked=True,
    locked_at=now - timedelta(days=45),
    snapshot={"features_count": 6, "total_effort_days": 95, "milestones_count": 4},
    created_at=now - timedelta(days=52),
)
db.add(b2); db.commit(); db.refresh(b2)

db.add_all([
    models.Feature(baseline_id=b2.id, name="Account Overview Screen",    description="Balance display, recent transactions list, mini chart.",    effort_days=10, status=models.FeatureStatus.completed),
    models.Feature(baseline_id=b2.id, name="Fund Transfer",              description="Peer-to-peer transfers, bank wire, IBAN lookup.",            effort_days=18, status=models.FeatureStatus.in_progress),
    models.Feature(baseline_id=b2.id, name="Push Notifications",         description="Real-time transaction alerts and account activity.",         effort_days=10, status=models.FeatureStatus.in_progress),
    models.Feature(baseline_id=b2.id, name="Biometric Login",            description="Face ID and fingerprint authentication support.",            effort_days=12, status=models.FeatureStatus.planned),
    models.Feature(baseline_id=b2.id, name="Virtual Card Management",    description="Issue virtual cards, set limits, freeze/unfreeze.",          effort_days=20, status=models.FeatureStatus.planned),
    models.Feature(baseline_id=b2.id, name="Spending Analytics",         description="Monthly breakdown by category, bar & pie charts.",           effort_days=14, status=models.FeatureStatus.planned),
])
db.add_all([
    models.Milestone(baseline_id=b2.id, name="Internal Alpha",         due_date="2026-03-01", is_completed=True,  completed_at=now - timedelta(days=20)),
    models.Milestone(baseline_id=b2.id, name="Beta Testing",           due_date="2026-04-15", is_completed=False),
    models.Milestone(baseline_id=b2.id, name="Security Audit",         due_date="2026-05-20", is_completed=False),
    models.Milestone(baseline_id=b2.id, name="App Store Release",      due_date="2026-07-01", is_completed=False),
])
db.commit()
print("  NeoBank: 6 features, 4 milestones (LOCKED)")

# ── P3: IntraFlow CRM (NOT LOCKED - brand new) ──────────────────────────────
b3 = models.Baseline(
    project_id=p3.id, is_locked=False,
    created_at=now - timedelta(days=10),
)
db.add(b3); db.commit(); db.refresh(b3)

db.add_all([
    models.Feature(baseline_id=b3.id, name="Customer Database",          description="Full customer profile with contact info and history.",     effort_days=10, status=models.FeatureStatus.planned),
    models.Feature(baseline_id=b3.id, name="Opportunity Pipeline",        description="Kanban-style sales pipeline with deal stages.",            effort_days=14, status=models.FeatureStatus.planned),
    models.Feature(baseline_id=b3.id, name="Task & Reminder System",      description="Assign tasks to team members, calendar integration.",      effort_days=9,  status=models.FeatureStatus.planned),
    models.Feature(baseline_id=b3.id, name="Activity Feed",               description="Timeline of calls, emails, and meetings per customer.",    effort_days=7,  status=models.FeatureStatus.planned),
    models.Feature(baseline_id=b3.id, name="Reporting Dashboard",         description="Win/loss rates, pipeline value, revenue forecasts.",       effort_days=12, status=models.FeatureStatus.planned),
])
db.add_all([
    models.Milestone(baseline_id=b3.id, name="Initial Prototype",     due_date="2026-05-01", is_completed=False),
    models.Milestone(baseline_id=b3.id, name="User Acceptance Testing",due_date="2026-06-15", is_completed=False),
    models.Milestone(baseline_id=b3.id, name="Internal Launch",        due_date="2026-07-30", is_completed=False),
])
db.commit()
print("  IntraFlow CRM: 5 features, 3 milestones (NOT LOCKED - new project)")

# ── P4: HealthTrack (LOCKED, 30 days ago) ───────────────────────────────────
b4 = models.Baseline(
    project_id=p4.id, is_locked=True,
    locked_at=now - timedelta(days=30),
    snapshot={"features_count": 5, "total_effort_days": 80, "milestones_count": 3},
    created_at=now - timedelta(days=38),
)
db.add(b4); db.commit(); db.refresh(b4)

db.add_all([
    models.Feature(baseline_id=b4.id, name="Appointment Booking",        description="Book, reschedule and cancel doctor appointments.",          effort_days=14, status=models.FeatureStatus.in_progress),
    models.Feature(baseline_id=b4.id, name="Lab Results Viewer",         description="Display test results with reference ranges.",               effort_days=12, status=models.FeatureStatus.planned),
    models.Feature(baseline_id=b4.id, name="Doctor Messaging",           description="Secure in-app messaging between patients and doctors.",     effort_days=18, status=models.FeatureStatus.planned),
    models.Feature(baseline_id=b4.id, name="Prescription Management",    description="View active prescriptions, request refills.",               effort_days=16, status=models.FeatureStatus.planned),
    models.Feature(baseline_id=b4.id, name="Patient Profile & Insurance",description="Personal info, insurance details, medical history.",        effort_days=10, status=models.FeatureStatus.planned),
])
db.add_all([
    models.Milestone(baseline_id=b4.id, name="Core Features Done",     due_date="2026-05-15", is_completed=False),
    models.Milestone(baseline_id=b4.id, name="HIPAA Compliance Review", due_date="2026-06-30", is_completed=False),
    models.Milestone(baseline_id=b4.id, name="Public Beta",            due_date="2026-08-01", is_completed=False),
])
db.commit()
print("  HealthTrack: 5 features, 3 milestones (LOCKED)")

# ── P5: LogiCore (LOCKED, archived) ─────────────────────────────────────────
b5 = models.Baseline(
    project_id=p5.id, is_locked=True,
    locked_at=now - timedelta(days=110),
    snapshot={"features_count": 4, "total_effort_days": 60, "milestones_count": 2},
    created_at=now - timedelta(days=118),
)
db.add(b5); db.commit(); db.refresh(b5)

db.add_all([
    models.Feature(baseline_id=b5.id, name="Inventory Tracking",         description="Real-time stock levels across multiple warehouses.",        effort_days=15, status=models.FeatureStatus.completed),
    models.Feature(baseline_id=b5.id, name="Shipment Processing",        description="Create and track outbound shipments.",                      effort_days=18, status=models.FeatureStatus.completed),
    models.Feature(baseline_id=b5.id, name="Warehouse Reports",          description="Daily/weekly inventory and throughput reports.",            effort_days=12, status=models.FeatureStatus.completed),
    models.Feature(baseline_id=b5.id, name="3PL API Integration",        description="Sync data with FedEx, UPS and DHL APIs.",                  effort_days=15, status=models.FeatureStatus.completed),
])
db.add_all([
    models.Milestone(baseline_id=b5.id, name="System Go-Live",       due_date="2025-12-01", is_completed=True, completed_at=now - timedelta(days=50)),
    models.Milestone(baseline_id=b5.id, name="Handover to Ops Team", due_date="2025-12-31", is_completed=True, completed_at=now - timedelta(days=20)),
])
db.commit()
print("  LogiCore: 4 features, 2 milestones (LOCKED, archived)")


# =============================================================================
# 5. CHANGE REQUESTS
# =============================================================================
print("\n[5/6] Creating change requests...")

# ── ShopWave CRs ──────────────────────────────────────────────────────────────
cr1 = models.ChangeRequest(
    project_id=p1.id, submitted_by_id=james.id,
    title="Add Dark Mode Support",
    description="Multiple users have requested a dark theme. We should add a dark mode toggle that persists the user preference in localStorage. All UI components need to support Tailwind's dark: variant classes.",
    cr_type=models.CRType.feature_add, status=models.CRStatus.approved,
    ai_analysis={
        "timeline_impact": "+4 days",
        "risk_score": 0.22, "risk_level": "Low",
        "dependency_analysis": "All UI components must be audited. Design tokens need a dark palette. No backend changes required.",
        "alternative_suggestions": "Scope dark mode to main pages first (home, product list) and expand incrementally.",
    },
    decision_note="User demand is high and effort is reasonable. Scheduled for Sprint 5.",
    decided_by_id=sarah.id, decided_at=now - timedelta(days=30),
    created_at=now - timedelta(days=38), updated_at=now - timedelta(days=30),
)
cr2 = models.ChangeRequest(
    project_id=p1.id, submitted_by_id=emily.id,
    title="Product Comparison Feature",
    description="Allow users to select up to 3 products and compare them side-by-side on a dedicated comparison page. A floating comparison bar should appear at the bottom of the page when products are selected.",
    cr_type=models.CRType.feature_add, status=models.CRStatus.under_review,
    ai_analysis={
        "timeline_impact": "+9 days",
        "risk_score": 0.42, "risk_level": "Moderate",
        "dependency_analysis": "Product listing and detail pages need a new selection state. A dedicated comparison service is required on the backend.",
        "alternative_suggestions": "Start with a simpler 2-product comparison to reduce scope and ship faster.",
    },
    created_at=now - timedelta(days=12), updated_at=now - timedelta(days=10),
)
cr3 = models.ChangeRequest(
    project_id=p1.id, submitted_by_id=james.id,
    title="Move Admin Panel Deadline Forward by 4 Weeks",
    description="The client is requesting the admin panel to be delivered 4 weeks earlier than planned. This would compress 20 days of effort into approximately 2 weeks, requiring overtime or additional resources.",
    cr_type=models.CRType.timeline_change, status=models.CRStatus.rejected,
    ai_analysis={
        "timeline_impact": "-28 days compression",
        "risk_score": 0.81, "risk_level": "High",
        "dependency_analysis": "Email notifications module depends on admin panel. A rushed delivery could cascade delays into subsequent milestones.",
        "alternative_suggestions": "Deliver core admin features first (product CRUD) and defer advanced reporting to original deadline.",
    },
    decision_note="Risk is unacceptably high. Rushing this will compromise quality across dependent modules. We will not change the timeline.",
    decided_by_id=sarah.id, decided_at=now - timedelta(days=6),
    created_at=now - timedelta(days=18), updated_at=now - timedelta(days=6),
)
cr4 = models.ChangeRequest(
    project_id=p1.id, submitted_by_id=emily.id,
    title="Multi-Language Support (i18n)",
    description="The client has expanded to European markets and now needs English, French, and German support. All user-facing strings must be externalized into translation files and a language switcher added to the header.",
    cr_type=models.CRType.feature_add, status=models.CRStatus.submitted,
    ai_analysis=None,
    created_at=now - timedelta(days=3), updated_at=now - timedelta(days=3),
)
cr5 = models.ChangeRequest(
    project_id=p1.id, submitted_by_id=tom.id,
    title="Remove Guest Checkout Flow",
    description="Analytics show that guest checkouts have a very low conversion rate and create orphaned order records. Proposing to remove the guest checkout option and require user registration to purchase.",
    cr_type=models.CRType.feature_remove, status=models.CRStatus.deferred,
    ai_analysis={
        "timeline_impact": "-3 days (removal)",
        "risk_score": 0.55, "risk_level": "Moderate",
        "dependency_analysis": "Removing guest checkout may reduce funnel conversion. A/B test data should be gathered first before making a permanent removal.",
        "alternative_suggestions": "Consider a 'Quick Register' flow instead of full removal to lower friction.",
    },
    decision_note="Deferred until we have 60 days of conversion data. Will revisit in Q3.",
    decided_by_id=sarah.id, decided_at=now - timedelta(days=1),
    created_at=now - timedelta(days=9), updated_at=now - timedelta(days=1),
)

# ── NeoBank CRs ───────────────────────────────────────────────────────────────
cr6 = models.ChangeRequest(
    project_id=p2.id, submitted_by_id=kevin.id,
    title="Add Cryptocurrency Transfer Support",
    description="Integrate Bitcoin and Ethereum wallets so users can send and receive crypto directly in the app. Requires a blockchain node connection and a new compliance review.",
    cr_type=models.CRType.scope_change, status=models.CRStatus.rejected,
    ai_analysis={
        "timeline_impact": "+40 days (estimated)",
        "risk_score": 0.91, "risk_level": "Critical",
        "dependency_analysis": "Requires blockchain infrastructure, KYC upgrades, and legal/compliance review across all operating regions. Conflicts with current security audit scope.",
        "alternative_suggestions": "Consider as a standalone feature in a future V2 roadmap after regulatory clarity.",
    },
    decision_note="Out of scope for V1. Regulatory and security requirements alone would delay the entire release by 2 months. Formally rejected.",
    decided_by_id=david.id, decided_at=now - timedelta(days=10),
    created_at=now - timedelta(days=18), updated_at=now - timedelta(days=10),
)
cr7 = models.ChangeRequest(
    project_id=p2.id, submitted_by_id=laura.id,
    title="Prioritize Face ID Over Fingerprint Authentication",
    description="User research with 200 participants showed 71% prefer Face ID. Proposing to implement Face ID first in Sprint 4 and move fingerprint to Sprint 6, keeping total effort the same.",
    cr_type=models.CRType.feature_modify, status=models.CRStatus.approved,
    ai_analysis={
        "timeline_impact": "+1 day (reordering overhead)",
        "risk_score": 0.12, "risk_level": "Low",
        "dependency_analysis": "Sprint plan adjustments only. No architectural changes needed.",
        "alternative_suggestions": "Both can be developed in parallel if we split the task between two developers.",
    },
    decision_note="Makes sense given the research data. Sprint plan updated accordingly.",
    decided_by_id=david.id, decided_at=now - timedelta(days=20),
    created_at=now - timedelta(days=25), updated_at=now - timedelta(days=20),
)
cr8 = models.ChangeRequest(
    project_id=p2.id, submitted_by_id=emily.id,
    title="Add Bill Payment Module",
    description="Users should be able to pay utility bills (electricity, water, internet) directly from the app. Requires integration with at least 3 major bill payment providers.",
    cr_type=models.CRType.feature_add, status=models.CRStatus.under_review,
    ai_analysis={
        "timeline_impact": "+18 days",
        "risk_score": 0.58, "risk_level": "Moderate",
        "dependency_analysis": "Requires third-party provider contracts, new payment reconciliation logic, and updates to transaction history schema.",
        "alternative_suggestions": "Partner with a single aggregator API (e.g. Fawry or Stripe Billing) to reduce integration complexity.",
    },
    created_at=now - timedelta(days=8), updated_at=now - timedelta(days=6),
)
cr9 = models.ChangeRequest(
    project_id=p2.id, submitted_by_id=kevin.id,
    title="Extend Spending Analytics to Include Investment Tracking",
    description="The analytics screen should also show the user's investment portfolio performance alongside spending data. Would require a brokerage API integration.",
    cr_type=models.CRType.feature_modify, status=models.CRStatus.draft,
    ai_analysis=None,
    created_at=now - timedelta(hours=10), updated_at=now - timedelta(hours=10),
)

# ── HealthTrack CRs ───────────────────────────────────────────────────────────
cr10 = models.ChangeRequest(
    project_id=p4.id, submitted_by_id=laura.id,
    title="Add Telemedicine Video Call Feature",
    description="Patients should be able to conduct video consultations with doctors directly through the portal, eliminating the need for in-person visits for routine check-ups.",
    cr_type=models.CRType.feature_add, status=models.CRStatus.under_review,
    ai_analysis={
        "timeline_impact": "+25 days",
        "risk_score": 0.67, "risk_level": "High",
        "dependency_analysis": "Requires WebRTC or a third-party provider (Twilio/Agora), end-to-end encryption, and HIPAA-compliant recording storage.",
        "alternative_suggestions": "Integrate a white-labeled solution like Doxy.me to reduce build time by 60%.",
    },
    created_at=now - timedelta(days=14), updated_at=now - timedelta(days=12),
)
cr11 = models.ChangeRequest(
    project_id=p4.id, submitted_by_id=alex.id,
    title="Integrate Wearable Device Data (Apple Health / Google Fit)",
    description="Pull step counts, heart rate, and sleep data from Apple Health and Google Fit to give doctors a more complete picture of patient health.",
    cr_type=models.CRType.feature_add, status=models.CRStatus.submitted,
    ai_analysis=None,
    created_at=now - timedelta(days=4), updated_at=now - timedelta(days=4),
)
cr12 = models.ChangeRequest(
    project_id=p4.id, submitted_by_id=nina.id,
    title="Change Appointment Booking from Calendar to Chat-Based Flow",
    description="Replace the calendar picker with a conversational chatbot that guides patients through booking. Early testing shows 40% higher completion rates with conversational flows.",
    cr_type=models.CRType.feature_modify, status=models.CRStatus.rejected,
    ai_analysis={
        "timeline_impact": "+20 days (rework of existing feature)",
        "risk_score": 0.73, "risk_level": "High",
        "dependency_analysis": "The calendar-based booking is already 60% complete. A full rework at this stage would discard 8 days of completed work.",
        "alternative_suggestions": "Keep the calendar flow for now and add an optional chatbot as a secondary path in V2.",
    },
    decision_note="Too late in the development cycle to rework a near-complete feature. We'll evaluate a chatbot as a secondary option post-launch.",
    decided_by_id=sarah.id, decided_at=now - timedelta(days=2),
    created_at=now - timedelta(days=10), updated_at=now - timedelta(days=2),
)

# ── IntraFlow CRM CRs (new project, only drafts/submitted) ────────────────────
cr13 = models.ChangeRequest(
    project_id=p3.id, submitted_by_id=alex.id,
    title="Add Email Campaign Manager",
    description="Sales reps should be able to send bulk email campaigns to customer segments directly from the CRM without switching to a separate tool.",
    cr_type=models.CRType.feature_add, status=models.CRStatus.submitted,
    ai_analysis=None,
    created_at=now - timedelta(days=2), updated_at=now - timedelta(days=2),
)
cr14 = models.ChangeRequest(
    project_id=p3.id, submitted_by_id=nina.id,
    title="Slack Integration for Task Notifications",
    description="When a task is assigned or a deal stage changes, send an automatic notification to the relevant Slack channel.",
    cr_type=models.CRType.feature_add, status=models.CRStatus.draft,
    ai_analysis=None,
    created_at=now - timedelta(hours=5), updated_at=now - timedelta(hours=5),
)

all_crs = [cr1,cr2,cr3,cr4,cr5,cr6,cr7,cr8,cr9,cr10,cr11,cr12,cr13,cr14]
db.add_all(all_crs)
db.commit()
for cr in all_crs:
    db.refresh(cr)

print("  ShopWave:   5 CRs (approved, under_review, rejected, submitted, deferred)")
print("  NeoBank:    4 CRs (rejected, approved, under_review, draft)")
print("  HealthTrack:3 CRs (under_review, submitted, rejected)")
print("  IntraFlow:  2 CRs (submitted, draft)")


# =============================================================================
# 6. COMMENTS
# =============================================================================
print("\n[6/6] Creating comments...")

comments = [
    # CR1 - Dark Mode (ShopWave)
    models.CRComment(cr_id=cr1.id, user_id=sarah.id,  text="Using Tailwind's built-in dark: variant should keep this clean. Make sure the color palette is accessibility-compliant.",  created_at=now - timedelta(days=37)),
    models.CRComment(cr_id=cr1.id, user_id=james.id,  text="I'll store the preference in localStorage and sync it with a data-theme attribute on the root element.",                   created_at=now - timedelta(days=36)),
    models.CRComment(cr_id=cr1.id, user_id=emily.id,  text="I can prepare the Figma dark palette this week so dev has reference specs before starting.",                               created_at=now - timedelta(days=35)),
    models.CRComment(cr_id=cr1.id, user_id=tom.id,    text="Make sure charts and data visualizations also support dark backgrounds — those are often missed.",                          created_at=now - timedelta(days=34)),

    # CR2 - Product Comparison (ShopWave)
    models.CRComment(cr_id=cr2.id, user_id=sarah.id,  text="How are we handling this on mobile? Side-by-side won't work on small screens.",                                           created_at=now - timedelta(days=11)),
    models.CRComment(cr_id=cr2.id, user_id=emily.id,  text="On mobile we can switch to a tabbed layout — tap a product tab to view its specs. Actually might be cleaner on desktop too.", created_at=now - timedelta(days=10)),
    models.CRComment(cr_id=cr2.id, user_id=james.id,  text="Backend comparison endpoint is straightforward — just a batch product fetch. Frontend is the main effort here.",           created_at=now - timedelta(days=10)),

    # CR3 - Deadline Forward (ShopWave)
    models.CRComment(cr_id=cr3.id, user_id=james.id,  text="There's no way to safely deliver this in 2 weeks. The reporting module alone is at least 6 days of work.",               created_at=now - timedelta(days=17)),
    models.CRComment(cr_id=cr3.id, user_id=sarah.id,  text="I'll have a call with the client to manage expectations. We can offer an early preview of basic CRUD operations.",        created_at=now - timedelta(days=16)),
    models.CRComment(cr_id=cr3.id, user_id=tom.id,    text="Agreed. Cutting corners on the admin panel will create technical debt that slows us down in Q3.",                         created_at=now - timedelta(days=15)),

    # CR6 - Crypto (NeoBank)
    models.CRComment(cr_id=cr6.id, user_id=kevin.id,  text="Competing apps are already offering this. We risk losing the younger demographic if we don't move quickly.",              created_at=now - timedelta(days=17)),
    models.CRComment(cr_id=cr6.id, user_id=david.id,  text="I understand the competitive pressure, but we'd need regulatory approval in every market we operate in. That alone could take 6 months.", created_at=now - timedelta(days=16)),
    models.CRComment(cr_id=cr6.id, user_id=laura.id,  text="The security audit scope explicitly excludes blockchain. We'd need a separate audit which is expensive and time-consuming.", created_at=now - timedelta(days=15)),

    # CR7 - Face ID Priority (NeoBank)
    models.CRComment(cr_id=cr7.id, user_id=laura.id,  text="The research was conducted with users aged 18-45 — our core demographic. Face ID preference was consistent across age groups.", created_at=now - timedelta(days=24)),
    models.CRComment(cr_id=cr7.id, user_id=kevin.id,  text="I can take Face ID in Sprint 4 and hand off the fingerprint implementation docs to whoever picks it up in Sprint 6.",     created_at=now - timedelta(days=23)),

    # CR8 - Bill Payment (NeoBank)
    models.CRComment(cr_id=cr8.id, user_id=david.id,  text="Which providers are you targeting? The integration complexity varies wildly between aggregators.",                         created_at=now - timedelta(days=7)),
    models.CRComment(cr_id=cr8.id, user_id=emily.id,  text="I looked into Stripe Billing as an aggregator — it covers most major utility providers and the API is well-documented.",   created_at=now - timedelta(days=6)),

    # CR10 - Telemedicine (HealthTrack)
    models.CRComment(cr_id=cr10.id, user_id=sarah.id, text="This is a high-value feature but the HIPAA implications for video are significant. We need legal to sign off before we spec this.", created_at=now - timedelta(days=13)),
    models.CRComment(cr_id=cr10.id, user_id=laura.id, text="I've reached out to Twilio and Agora for enterprise pricing. Agora's SDK is simpler to integrate and already HIPAA-ready.", created_at=now - timedelta(days=12)),
    models.CRComment(cr_id=cr10.id, user_id=alex.id,  text="Using a white-label solution is definitely the right call here. Building WebRTC from scratch would blow the timeline.",    created_at=now - timedelta(days=11)),

    # CR12 - Chat-Based Booking (HealthTrack)
    models.CRComment(cr_id=cr12.id, user_id=nina.id,  text="The 40% completion rate improvement came from a study with a similar patient portal. I can share the source paper.",       created_at=now - timedelta(days=9)),
    models.CRComment(cr_id=cr12.id, user_id=sarah.id, text="The data is compelling but we're already 60% done with the calendar flow. The rework cost doesn't justify the gain at this point.", created_at=now - timedelta(days=8)),

    # CR13 - Email Campaign (IntraFlow)
    models.CRComment(cr_id=cr13.id, user_id=rachel.id,text="What email volume are we expecting? This affects whether we use SendGrid, Mailchimp or build a simple custom sender.",     created_at=now - timedelta(days=1)),
    models.CRComment(cr_id=cr13.id, user_id=alex.id,  text="Probably under 5k emails/month to start. SendGrid's free tier would cover us initially.",                                  created_at=now - timedelta(hours=20)),
]

db.add_all(comments)
db.commit()
print("  %d comments created." % len(comments))


# =============================================================================
# SUMMARY
# =============================================================================
print("\n" + "="*60)
print("  DATABASE SEED COMPLETE")
print("="*60)
print("\n  LOGIN ACCOUNTS (all passwords: 123456)")
print("  -" * 30)
print("  sarah@conflux.com      -> Manager  | ShopWave, HealthTrack")
print("  david@conflux.com      -> Manager  | NeoBank, LogiCore")
print("  rachel@conflux.com     -> Manager  | IntraFlow CRM")
print("  james@conflux.com      -> Member   | ShopWave, LogiCore")
print("  emily@conflux.com      -> Member   | ShopWave, NeoBank")
print("  tom@conflux.com        -> Member   | ShopWave")
print("  laura@conflux.com      -> Member   | NeoBank, HealthTrack")
print("  kevin@conflux.com      -> Member   | NeoBank, LogiCore")
print("  alex@conflux.com       -> Member   | IntraFlow, HealthTrack")
print("  nina@conflux.com       -> Member   | IntraFlow, HealthTrack")
print("  investor@conflux.com   -> Stakeholder (view-only)")
print("  cto@conflux.com        -> Stakeholder (view-only)")
print("\n  PROJECTS")
print("  -" * 30)
print("  ShopWave E-Commerce Platform   -> LOCKED | 7 features | 5 CRs")
print("  NeoBank Mobile App             -> LOCKED | 6 features | 4 CRs")
print("  HealthTrack Patient Portal     -> LOCKED | 5 features | 3 CRs")
print("  IntraFlow CRM                  -> OPEN   | 5 features | 2 CRs")
print("  LogiCore Warehouse System      -> LOCKED | 4 features | archived")
print("="*60 + "\n")

db.close()
