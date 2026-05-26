"""
seed_demo.py
Creates demo users, a rich demo project, and change requests for live demo.
Idempotent — safe to run multiple times (skips if demo data already exists).
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from database import SessionLocal, Base, engine
import models
from passlib.context import CryptContext
from datetime import datetime, timedelta

Base.metadata.create_all(bind=engine)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def seed():
    db = SessionLocal()
    try:
        # Idempotency check
        if db.query(models.User).filter(models.User.email == "manager@conflux.demo").first():
            print("[seed] Demo data already exists — skipping.")
            return

        print("[seed] Creating demo users...")
        manager = models.User(
            name="Alex Chen",
            email="manager@conflux.demo",
            hashed_password=pwd_context.hash("demo1234"),
        )
        member = models.User(
            name="Jamie Park",
            email="member@conflux.demo",
            hashed_password=pwd_context.hash("demo1234"),
        )
        stakeholder = models.User(
            name="Sam Rivera",
            email="stakeholder@conflux.demo",
            hashed_password=pwd_context.hash("demo1234"),
        )
        for u in [manager, member, stakeholder]:
            db.add(u)
        db.flush()

        print("[seed] Creating demo project...")
        project = models.Project(
            name="E-Commerce Platform Redesign",
            description=(
                "Complete redesign of our e-commerce platform to improve UX, "
                "performance, and mobile experience. Target: 40% increase in "
                "checkout conversion rate."
            ),
            owner_id=manager.id,
        )
        db.add(project)
        db.flush()

        # Project members
        db.add(models.ProjectMember(project_id=project.id, user_id=manager.id,     role=models.UserRole.manager))
        db.add(models.ProjectMember(project_id=project.id, user_id=member.id,      role=models.UserRole.member))
        db.add(models.ProjectMember(project_id=project.id, user_id=stakeholder.id, role=models.UserRole.stakeholder))
        db.flush()

        print("[seed] Creating baseline...")
        now = datetime.utcnow()
        baseline = models.Baseline(
            project_id=project.id,
            is_locked=True,
            locked_at=now - timedelta(days=30),
        )
        db.add(baseline)
        db.flush()

        # Features
        features = [
            ("User Authentication & RBAC",      "JWT-based auth with role-based access control and session management.",           10, "completed"),
            ("Product Catalog & Search",         "Full-text product search with filters, sorting, and paginated results.",         15, "in_progress"),
            ("Shopping Cart & Checkout",         "Multi-step checkout flow with order summary, address autofill, and validation.", 12, "planned"),
            ("Payment Gateway Integration",      "Stripe integration with webhooks for payment confirmation and refunds.",          8, "planned"),
            ("Admin Dashboard & Analytics",      "Sales analytics, inventory management, and user administration panel.",          10, "planned"),
            ("Mobile Responsive Design",         "Fully responsive UI optimised for all screen sizes and touch interactions.",      7, "completed"),
            ("Performance Optimisation",         "CDN setup, image lazy loading, API response caching, and bundle splitting.",      5, "planned"),
        ]
        for name, desc, effort, status in features:
            db.add(models.Feature(
                baseline_id=baseline.id,
                name=name,
                description=desc,
                effort_days=effort,
                status=models.FeatureStatus[status],
            ))

        # Milestones
        milestones = [
            ("Alpha Release",      (now - timedelta(days=45)).strftime("%Y-%m-%d"), True,  now - timedelta(days=45)),
            ("Beta Release",       (now + timedelta(days=15)).strftime("%Y-%m-%d"), False, None),
            ("Production Launch",  (now + timedelta(days=60)).strftime("%Y-%m-%d"), False, None),
        ]
        for name, due, completed, completed_at in milestones:
            db.add(models.Milestone(
                baseline_id=baseline.id,
                name=name,
                due_date=due,
                is_completed=completed,
                completed_at=completed_at,
            ))
        db.flush()

        print("[seed] Creating change requests...")

        # CR 1 — Approved, with AI analysis
        cr1 = models.ChangeRequest(
            project_id=project.id,
            submitted_by_id=member.id,
            title="Add Social Login (Google & GitHub)",
            description=(
                "Users are dropping off during registration. Analytics show 38% of visitors "
                "abandon the signup form. Adding Google and GitHub OAuth would reduce friction "
                "and is expected to increase signups by 25-30% based on industry benchmarks."
            ),
            cr_type=models.CRType.feature_add,
            status=models.CRStatus.approved,
            ai_analysis={
                "timeline_impact": "+3-4 days",
                "risk_score": 0.22,
                "risk_level": "Low",
                "dependency_analysis": (
                    "Affects User Authentication & RBAC feature only. OAuth2 libraries integrate "
                    "cleanly alongside existing JWT auth. No impact on checkout, payment, or admin features."
                ),
                "alternative_suggestions": (
                    "Consider adding Google login only first — covers ~72% of social login demand "
                    "at roughly half the implementation effort."
                ),
            },
            decision_note=(
                "Approved. High value, low risk. Jamie to implement Google login first, "
                "GitHub can follow in a subsequent sprint."
            ),
            decided_by_id=manager.id,
            decided_at=now - timedelta(days=10),
        )
        db.add(cr1)

        # CR 2 — Under review (awaiting manager decision), with AI analysis
        cr2 = models.ChangeRequest(
            project_id=project.id,
            submitted_by_id=member.id,
            title="Redesign Checkout Flow — Reduce to 2 Steps",
            description=(
                "Current 5-step checkout has a 68% abandonment rate at step 3 (shipping address). "
                "Proposal: consolidate to a 2-step flow — (1) address + shipping, (2) payment + review. "
                "Include browser autofill support and saved addresses for returning customers."
            ),
            cr_type=models.CRType.feature_modify,
            status=models.CRStatus.under_review,
            ai_analysis={
                "timeline_impact": "+5-7 days",
                "risk_score": 0.52,
                "risk_level": "Medium",
                "dependency_analysis": (
                    "Directly impacts Shopping Cart & Checkout (12 days). Payment Gateway Integration "
                    "will need adjustments for saved payment methods. Beta Release milestone is at risk "
                    "of slipping by approximately 1 week."
                ),
                "alternative_suggestions": (
                    "1) Reduce to 3 steps instead of 2 — lower risk, still meaningful UX improvement. "
                    "2) A/B test the redesigned flow on 20% of traffic before full rollout."
                ),
            },
        )
        db.add(cr2)

        # CR 3 — Rejected
        cr3 = models.ChangeRequest(
            project_id=project.id,
            submitted_by_id=stakeholder.id,
            title="Real-Time Inventory Tracking with Supplier Integration",
            description=(
                "Request for a real-time inventory dashboard with WebSocket-based stock updates, "
                "automated low-stock alerts, and direct integration with our three main suppliers' APIs. "
                "This would give operations full visibility into stock levels without manual checks."
            ),
            cr_type=models.CRType.feature_add,
            status=models.CRStatus.rejected,
            ai_analysis={
                "timeline_impact": "+15-20 days",
                "risk_score": 0.83,
                "risk_level": "High",
                "dependency_analysis": (
                    "Requires new WebSocket infrastructure, significantly expands Admin Dashboard scope, "
                    "and introduces three external supplier API dependencies. Production Launch would "
                    "likely slip by 3-4 weeks."
                ),
                "alternative_suggestions": (
                    "Implement a polling-based inventory view (refresh every 30s) within the existing "
                    "Admin Dashboard — achieves ~80% of the business value at under 20% of the effort."
                ),
            },
            decision_note=(
                "Rejected for this release cycle. Scope is too large and the risk score is high. "
                "The polling-based alternative in the AI suggestion is worth implementing as part of "
                "the Admin Dashboard. Full real-time integration is a v2.1 item."
            ),
            decided_by_id=manager.id,
            decided_at=now - timedelta(days=5),
        )
        db.add(cr3)

        # CR 4 — Deferred
        cr4 = models.ChangeRequest(
            project_id=project.id,
            submitted_by_id=member.id,
            title="Extend Beta Release Deadline by 2 Weeks",
            description=(
                "The Shopping Cart and Payment Gateway features are running behind schedule due to "
                "unexpected complexity in the Stripe webhook integration. Requesting a 14-day extension "
                "on the Beta Release milestone to ensure a quality build."
            ),
            cr_type=models.CRType.timeline_change,
            status=models.CRStatus.deferred,
            ai_analysis={
                "timeline_impact": "+14 days to Beta milestone",
                "risk_score": 0.38,
                "risk_level": "Medium",
                "dependency_analysis": (
                    "Directly affects Beta Release milestone. Production Launch would shift accordingly "
                    "unless the team recovers time. No feature scope is changed."
                ),
                "alternative_suggestions": (
                    "Ship Beta without saved payment methods (implement in a hotfix before Production "
                    "Launch). This keeps the milestone intact and reduces Stripe integration complexity."
                ),
            },
            decision_note=(
                "Deferred — team review scheduled for Monday. We will assess whether the scope "
                "reduction alternative is viable before agreeing to any deadline change."
            ),
            decided_by_id=manager.id,
            decided_at=now - timedelta(days=2),
        )
        db.add(cr4)

        # CR 5 — Draft (visible only to member perspective)
        cr5 = models.ChangeRequest(
            project_id=project.id,
            submitted_by_id=member.id,
            title="Add Dark Mode Support to Storefront",
            description=(
                "Dark mode is the most-requested feature in our user feedback surveys (34% of respondents). "
                "Implementation using CSS custom properties and a theme toggle in user preferences. "
                "No backend changes required."
            ),
            cr_type=models.CRType.feature_add,
            status=models.CRStatus.draft,
        )
        db.add(cr5)
        db.flush()

        # Comments
        print("[seed] Adding comments...")
        db.add(models.CRComment(
            cr_id=cr2.id,
            user_id=stakeholder.id,
            text=(
                "From a business perspective, reducing checkout abandonment is our highest priority "
                "right now. The 68% drop-off is costing us significantly every week. I strongly support this change."
            ),
        ))
        db.add(models.CRComment(
            cr_id=cr2.id,
            user_id=member.id,
            text=(
                "I've already prototyped the 2-step flow locally. Address autofill via the browser "
                "native API is straightforward. The main complexity is saved payment methods — "
                "that's where the extra days come from."
            ),
        ))
        db.add(models.CRComment(
            cr_id=cr3.id,
            user_id=manager.id,
            text=(
                "Agreed with the AI analysis on this one. Let's document the supplier API specs "
                "now so we're ready to pick this up post-launch."
            ),
        ))
        db.add(models.CRComment(
            cr_id=cr1.id,
            user_id=stakeholder.id,
            text="Great news — this has been a recurring ask from enterprise clients as well.",
        ))

        db.commit()
        print("[seed] ✓ Demo data created successfully!")
        print("[seed]   manager@conflux.demo     / demo1234  (Project Manager)")
        print("[seed]   member@conflux.demo      / demo1234  (Project Member)")
        print("[seed]   stakeholder@conflux.demo / demo1234  (Stakeholder)")

    except Exception as e:
        db.rollback()
        print(f"[seed] ERROR: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
