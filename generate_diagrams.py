"""
Conflux UML Diagram Generator
Run: python generate_diagrams.py
Outputs all diagrams as JPEG files into ./diagrams/
"""

import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import matplotlib.patheffects as pe
import numpy as np

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "diagrams")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ─── Color Palette ───────────────────────────────────────────────────────────
BG        = "#1a1a2e"
CARD      = "#16213e"
ACCENT    = "#0f3460"
BLUE      = "#4361ee"
GREEN     = "#06d6a0"
ORANGE    = "#f77f00"
RED       = "#e63946"
PURPLE    = "#7209b7"
YELLOW    = "#ffd166"
LIGHT     = "#e0e0e0"
GREY      = "#888888"
WHITE     = "#ffffff"

def save(fig, name):
    path = os.path.join(OUTPUT_DIR, name)
    fig.savefig(path, format="jpeg", dpi=150, bbox_inches="tight",
                facecolor=BG, edgecolor="none")
    plt.close(fig)
    print(f"  Saved: {name}")


def rounded_box(ax, x, y, w, h, color, label=None, fontsize=10,
                text_color=WHITE, radius=0.3, zorder=3):
    box = FancyBboxPatch((x - w/2, y - h/2), w, h,
                         boxstyle=f"round,pad=0.05,rounding_size={radius}",
                         linewidth=1.5, edgecolor=color,
                         facecolor=color + "33", zorder=zorder)
    ax.add_patch(box)
    if label:
        ax.text(x, y, label, ha="center", va="center",
                fontsize=fontsize, color=text_color,
                fontweight="bold", zorder=zorder+1,
                wrap=True)
    return box


def ellipse_box(ax, x, y, w, h, color, label, fontsize=9):
    ell = mpatches.Ellipse((x, y), w, h,
                           linewidth=1.5, edgecolor=color,
                           facecolor=color + "22", zorder=3)
    ax.add_patch(ell)
    ax.text(x, y, label, ha="center", va="center",
            fontsize=fontsize, color=WHITE, fontweight="bold", zorder=4,
            multialignment="center")


def actor(ax, x, y, label, color=BLUE):
    """Draw a stick-figure actor."""
    # Head
    head = plt.Circle((x, y + 0.8), 0.22, color=color, zorder=4)
    ax.add_patch(head)
    # Body
    ax.plot([x, x], [y + 0.58, y - 0.2], color=color, lw=2, zorder=4)
    # Arms
    ax.plot([x - 0.45, x + 0.45], [y + 0.2, y + 0.2], color=color, lw=2, zorder=4)
    # Legs
    ax.plot([x, x - 0.35], [y - 0.2, y - 0.7], color=color, lw=2, zorder=4)
    ax.plot([x, x + 0.35], [y - 0.2, y - 0.7], color=color, lw=2, zorder=4)
    # Label
    ax.text(x, y - 1.0, label, ha="center", va="top",
            fontsize=9, color=WHITE, fontweight="bold")


def arrow(ax, x1, y1, x2, y2, color=GREY, style="->", lw=1.2, label=None, label_offset=(0, 0.15)):
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle=style, color=color,
                                lw=lw, connectionstyle="arc3,rad=0.05"))
    if label:
        mx, my = (x1 + x2) / 2 + label_offset[0], (y1 + y2) / 2 + label_offset[1]
        ax.text(mx, my, label, ha="center", va="bottom",
                fontsize=7.5, color=YELLOW, style="italic")


def dashed_arrow(ax, x1, y1, x2, y2, color=GREY, label=None):
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle="->", color=color, lw=1.2,
                                linestyle="dashed",
                                connectionstyle="arc3,rad=0.05"))
    if label:
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2 + 0.12
        ax.text(mx, my, label, ha="center", va="bottom",
                fontsize=7.5, color=YELLOW, style="italic")


def section_title(ax, text, x=0.5, y=0.97):
    ax.text(x, y, text, transform=ax.transAxes,
            ha="center", va="top", fontsize=14,
            color=WHITE, fontweight="bold",
            bbox=dict(boxstyle="round,pad=0.3", facecolor=ACCENT, edgecolor=BLUE, lw=1.5))


# ═══════════════════════════════════════════════════════════════════════════════
# 4.1  USE CASE DIAGRAMS (4 separate diagrams)
# ═══════════════════════════════════════════════════════════════════════════════

def _uc_setup(title, w=16, h=12):
    fig, ax = plt.subplots(figsize=(w, h))
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)
    ax.set_xlim(0, w)
    ax.set_ylim(0, h)
    ax.axis("off")
    section_title(ax, title)
    return fig, ax


def _system_boundary(ax, x, y, w, h, label):
    b = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.1",
                       linewidth=2, edgecolor=BLUE, facecolor=BLUE + "0d", zorder=1)
    ax.add_patch(b)
    # Label is placed inside the top-left corner of the boundary (UML standard)
    ax.text(x + 0.25, y + h - 0.18, label,
            ha="left", va="top", fontsize=10, color=BLUE, fontweight="bold")


def _uc_ellipse(ax, x, y, label, color, w=3.4, h=0.72, fontsize=8.5):
    ell = mpatches.Ellipse((x, y), w, h,
                           linewidth=1.6, edgecolor=color,
                           facecolor=color + "25", zorder=3)
    ax.add_patch(ell)
    ax.text(x, y, label, ha="center", va="center",
            fontsize=fontsize, color=WHITE, fontweight="bold",
            zorder=4, multialignment="center")


def _connect(ax, ax_pos, uc_pos, color, lw=1.0):
    ax.plot([ax_pos[0], uc_pos[0]], [ax_pos[1], uc_pos[1]],
            color=color, lw=lw, alpha=0.55, zorder=2)


def _include_arrow(ax, p1, p2, label="<<include>>"):
    ax.annotate("", xy=p2, xytext=p1,
                arrowprops=dict(arrowstyle="->", color=PURPLE, lw=1.1,
                                linestyle="dashed",
                                connectionstyle="arc3,rad=0.08"))
    mx = (p1[0]+p2[0])/2 + 0.2
    my = (p1[1]+p2[1])/2 + 0.12
    ax.text(mx, my, label, fontsize=7.5, color=PURPLE, style="italic")


# ── UC #1 — Project Manager ───────────────────────────────────────────────────
def draw_uc_manager():
    fig, ax = _uc_setup("Use Case #1 — Project Manager", w=17, h=13)
    _system_boundary(ax, 3.0, 0.8, 12.5, 11.2, "Conflux Platform")

    actor(ax, 1.3, 6.5, "Project\nManager", GREEN)
    ap = (1.9, 6.5)   # actor connection point

    cases = [
        # (x, y, label, color)
        (7.0, 11.4, "Register / Login",              BLUE),
        (7.0, 10.4, "Manage Profile",                BLUE),
        (7.0,  9.3, "Create Project",                GREEN),
        (7.0,  8.2, "Archive Project",               GREEN),
        (7.0,  7.1, "Add / Remove Team Members",     GREEN),
        (7.0,  6.0, "Assign Member Roles",           GREEN),
        (7.0,  4.9, "Define Baseline\n(features & milestones)", GREEN),
        (7.0,  3.8, "Lock Baseline",                 GREEN),
        (12.0, 10.4, "Review Change Requests",       ORANGE),
        (12.0,  9.3, "Approve CR",                   ORANGE),
        (12.0,  8.2, "Reject CR",                    ORANGE),
        (12.0,  7.1, "Defer CR",                     ORANGE),
        (12.0,  6.0, "Provide Decision Note",        ORANGE),
        (12.0,  4.9, "View Drift Dashboard",         YELLOW),
        (12.0,  3.8, "View Project Roadmap",         YELLOW),
        (12.0,  2.7, "Monitor AI Analysis Results",  YELLOW),
        (7.0,   2.7, "View All CRs & Comments",      YELLOW),
        (7.0,   1.8, "Manage Feature Status",        GREEN),
    ]

    for (x, y, lbl, c) in cases:
        _uc_ellipse(ax, x, y, lbl, c)
        _connect(ax, ap, (x - 1.7, y), GREEN)

    # <<include>> links
    _include_arrow(ax, (7.0, 3.8), (7.0, 4.9), "<<include>>")   # lock includes define
    _include_arrow(ax, (12.0, 9.3), (12.0, 6.0), "<<include>>")  # approve includes note
    _include_arrow(ax, (12.0, 8.2), (12.0, 6.0), "<<include>>")  # reject includes note
    _include_arrow(ax, (12.0, 7.1), (12.0, 6.0), "<<include>>")  # defer includes note

    save(fig, "4_1_1_use_case_project_manager.jpg")


# ── UC #2 — Project Member ────────────────────────────────────────────────────
def draw_uc_member():
    fig, ax = _uc_setup("Use Case #2 — Project Member", w=17, h=13)
    _system_boundary(ax, 3.0, 0.8, 12.5, 11.2, "Conflux Platform")

    actor(ax, 1.3, 6.5, "Project\nMember", BLUE)
    ap = (1.9, 6.5)

    cases = [
        (7.0, 11.4, "Register / Login",               BLUE),
        (7.0, 10.4, "Manage Profile",                 BLUE),
        (7.0,  9.3, "View Project Dashboard",         YELLOW),
        (7.0,  8.2, "View Baseline",                  YELLOW),
        (7.0,  7.1, "View Project Roadmap",           YELLOW),
        (7.0,  6.0, "Create CR (Save as Draft)",      BLUE),
        (7.0,  4.9, "Submit Change Request",          BLUE),
        (7.0,  3.8, "Edit Draft CR",                  BLUE),
        (12.0, 10.4, "Add Comment to CR",             BLUE),
        (12.0,  9.3, "View CR Details & AI Analysis", YELLOW),
        (12.0,  8.2, "View Drift Indicator",          YELLOW),
        (12.0,  7.1, "View All CRs (project)",        YELLOW),
        (12.0,  6.0, "Update Feature Status",         BLUE),
        (12.0,  4.9, "View Team Members",             YELLOW),
        (12.0,  3.8, "View Milestones",               YELLOW),
        (7.0,   2.7, "Track Task Progress",           BLUE),
        (12.0,  2.7, "Receive CR Decision Updates",   YELLOW),
    ]

    for (x, y, lbl, c) in cases:
        _uc_ellipse(ax, x, y, lbl, c)
        _connect(ax, ap, (x - 1.7, y), BLUE)

    # Relationships between use cases
    # <<include>>: base case --dashed--> included case (arrow at included end)
    _include_arrow(ax, (7.0, 4.9), (7.0, 6.0), "<<include>>")   # Submit includes Create Draft

    # <<extend>>: extending case --dashed--> base case (arrow at base case end)
    # "View CR Details & AI Analysis" extends "Submit Change Request"
    _include_arrow(ax, (12.0, 9.3), (7.0, 4.9), "<<extend>>")

    save(fig, "4_1_2_use_case_project_member.jpg")


# ── UC #3 — Stakeholder ────────────────────────────────────────────────────────
def draw_uc_stakeholder():
    fig, ax = _uc_setup("Use Case #3 — Stakeholder", w=15, h=11)
    _system_boundary(ax, 2.8, 0.8, 10.8, 9.2, "Conflux Platform")

    actor(ax, 1.2, 5.5, "Stakeholder", ORANGE)
    ap = (1.8, 5.5)

    cases = [
        (7.0, 9.3,  "Register / Login",                BLUE),
        (7.0, 8.2,  "View Project Dashboard",          YELLOW),
        (7.0, 7.1,  "View Drift Indicator",            YELLOW),
        (7.0, 6.0,  "View Baseline (read-only)",       YELLOW),
        (7.0, 4.9,  "View Change Request List",        YELLOW),
        (7.0, 3.8,  "View CR Details & AI Analysis",  YELLOW),
        (7.0, 2.7,  "View Project Roadmap",            YELLOW),
        (11.0, 8.2, "Monitor Project Progress",        ORANGE),
        (11.0, 7.1, "View Milestone Status",           YELLOW),
        (11.0, 6.0, "View Feature Status",             YELLOW),
        (11.0, 4.9, "View Team Members",               YELLOW),
        (11.0, 3.8, "View Approved CRs",               YELLOW),
        (11.0, 2.7, "View Rejected / Deferred CRs",   YELLOW),
        (7.0,  1.7, "Submit a Change Request",         ORANGE),
    ]

    for (x, y, lbl, c) in cases:
        _uc_ellipse(ax, x, y, lbl, c)
        _connect(ax, ap, (x - 1.7, y), ORANGE)

    # Read-only note
    note_b = FancyBboxPatch((2.8, 0.1), 10.0, 0.55,
                            boxstyle="round,pad=0.05",
                            linewidth=1.2, edgecolor=ORANGE + "88",
                            facecolor=ORANGE + "15", zorder=3)
    ax.add_patch(note_b)
    ax.text(7.8, 0.38,
            "Note: Stakeholder has READ-ONLY access to all data views. "
            "They can submit CRs but cannot approve or manage projects.",
            ha="center", va="center", fontsize=8, color=LIGHT, zorder=4)

    save(fig, "4_1_3_use_case_stakeholder.jpg")


# ── UC #4 — System Automated Processes ───────────────────────────────────────
def draw_uc_system():
    fig, ax = _uc_setup("Use Case #4 — AI Analysis & Drift Tracking", w=16, h=11)
    _system_boundary(ax, 2.5, 0.8, 11.5, 9.2, "Conflux Platform")

    # External actors
    actor(ax, 1.0, 8.0, "Project\nMember",      BLUE)
    actor(ax, 1.0, 5.5, "Timer /\nScheduler",   ORANGE)
    actor(ax, 1.0, 3.0, "Project\nManager",      GREEN)
    ap_mem  = (1.65, 8.0)
    ap_tmr  = (1.65, 5.5)
    ap_pm   = (1.65, 3.0)

    # External system actor on right
    actor(ax, 14.8, 5.5, "OpenRouter\nAPI", PURPLE)
    ap_ai = (14.2, 5.5)

    # Use cases — triggered by Member (CR submission → AI analysis)
    cases_member = [
        (6.5, 9.0, "Submit Change\nRequest",              BLUE),
        (6.5, 7.8, "Trigger AI\nImpact Analysis",         PURPLE),
        (6.5, 6.6, "Graceful Degradation\n(timeout skip)", PURPLE),
    ]
    # Use cases — triggered by Timer/Scheduler (periodic drift recalc)
    cases_timer = [
        (6.5, 5.2, "Recalculate\nDrift Score",            ORANGE),
        (6.5, 4.0, "Categorize\nDrift Level",             ORANGE),
    ]
    # Use cases — triggered by Manager (baseline lock)
    cases_manager = [
        (6.5, 2.8, "Lock Baseline\n(reset drift)",        GREEN),
        (6.5, 1.7, "Update Drift\nDashboard",             GREEN),
    ]
    # Use cases that interact with OpenRouter API (right side)
    cases_right = [
        (11.5, 7.8, "Send CR Prompt\n+ Baseline Context",  YELLOW),
        (11.5, 6.6, "Receive Impact\nAnalysis (JSON)",     YELLOW),
        (11.5, 5.2, "Store ai_analysis\nin Database",      YELLOW),
    ]

    for (x, y, lbl, c) in cases_member:
        _uc_ellipse(ax, x, y, lbl, c)
        _connect(ax, ap_mem, (x - 1.7, y), BLUE)

    for (x, y, lbl, c) in cases_timer:
        _uc_ellipse(ax, x, y, lbl, c)
        _connect(ax, ap_tmr, (x - 1.7, y), ORANGE)

    for (x, y, lbl, c) in cases_manager:
        _uc_ellipse(ax, x, y, lbl, c)
        _connect(ax, ap_pm, (x - 1.7, y), GREEN)

    for (x, y, lbl, c) in cases_right:
        _uc_ellipse(ax, x, y, lbl, c)
        _connect(ax, ap_ai, (x + 1.7, y), PURPLE)

    # <<include>> arrows
    _include_arrow(ax, (6.5, 9.0), (6.5, 7.8))
    _include_arrow(ax, (6.5, 7.8), (6.5, 6.6))
    _include_arrow(ax, (6.5, 5.2), (6.5, 4.0))
    _include_arrow(ax, (6.5, 2.8), (6.5, 1.7))

    # Horizontal data flows (left→right)
    flows = [
        ((6.5, 7.8), (11.5, 7.8), "calls API"),
        ((11.5, 6.6), (6.5, 6.6), "returns JSON"),
        ((6.5, 5.2), (11.5, 5.2), "stores result"),
    ]
    for (p1, p2, lbl) in flows:
        ax.annotate("", xy=p2, xytext=p1,
                    arrowprops=dict(arrowstyle="->", color=GREY, lw=1.1,
                                    linestyle="dashed"))
        mx, my = (p1[0]+p2[0])/2, (p1[1]+p2[1])/2 + 0.14
        ax.text(mx, my, lbl, ha="center", fontsize=7.5, color=YELLOW, style="italic")

    save(fig, "4_1_4_use_case_system_automated.jpg")


# ═══════════════════════════════════════════════════════════════════════════════
# 4.2  CLASS DIAGRAM
# ═══════════════════════════════════════════════════════════════════════════════

def class_box(ax, x, y, name, attributes, methods, color,
              box_w=4.0, attr_h=0.32, method_h=0.32):
    """Draw a UML class box with header / attributes / methods sections."""
    n_attr   = len(attributes)
    n_method = len(methods)
    header_h = 0.55
    attrs_h  = max(n_attr * attr_h, 0.3)
    meths_h  = max(n_method * method_h, 0.3)
    total_h  = header_h + attrs_h + meths_h

    lx = x - box_w / 2
    by = y - total_h / 2

    # Outer border
    outer = FancyBboxPatch((lx, by), box_w, total_h,
                           boxstyle="round,pad=0.04",
                           linewidth=1.8, edgecolor=color,
                           facecolor=CARD, zorder=3)
    ax.add_patch(outer)

    # Header fill
    header = FancyBboxPatch((lx, by + total_h - header_h), box_w, header_h,
                            boxstyle="round,pad=0.04",
                            linewidth=0, edgecolor="none",
                            facecolor=color + "55", zorder=4)
    ax.add_patch(header)
    ax.text(x, by + total_h - header_h/2, name,
            ha="center", va="center", fontsize=9.5,
            color=WHITE, fontweight="bold", zorder=5)

    # Divider lines
    d1y = by + total_h - header_h
    d2y = by + meths_h
    ax.plot([lx, lx + box_w], [d1y, d1y], color=color, lw=1, zorder=4)
    ax.plot([lx, lx + box_w], [d2y, d2y], color=color, lw=1, zorder=4)

    # Attributes
    for i, attr in enumerate(attributes):
        ay = d1y - attr_h/2 - i * attr_h
        ax.text(lx + 0.15, ay, attr,
                ha="left", va="center", fontsize=7.5,
                color=LIGHT, fontfamily="monospace", zorder=5)

    # Methods
    for i, meth in enumerate(methods):
        my = d2y - method_h/2 - i * method_h
        ax.text(lx + 0.15, my, meth,
                ha="left", va="center", fontsize=7.5,
                color=GREEN, fontfamily="monospace", zorder=5)

    return (x, by), (x, by + total_h), (lx, by + total_h/2), (lx + box_w, by + total_h/2)


def draw_class_diagram():
    fig, ax = plt.subplots(figsize=(26, 18))
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)
    ax.set_xlim(0, 26)
    ax.set_ylim(0, 18)
    ax.axis("off")
    section_title(ax, "Conflux — Class Diagram")

    # ── Classes ──
    class_box(ax, 3.5, 14.5, "User",
        ["- id: Integer [PK]",
         "- email: String [unique]",
         "- hashed_password: String",
         "- name: String",
         "- role: String",
         "- created_at: DateTime"],
        ["+ register(email, pw, name): User",
         "+ login(email, pw): Token",
         "+ get_current_user(): User"],
        BLUE)

    class_box(ax, 10.0, 14.5, "Project",
        ["- id: Integer [PK]",
         "- name: String",
         "- description: Text",
         "- owner_id: Integer [FK]",
         "- is_archived: Boolean",
         "- created_at: DateTime"],
        ["+ create(name, desc): Project",
         "+ archive(): void",
         "+ add_member(user, role): void"],
        GREEN)

    class_box(ax, 16.5, 14.5, "ProjectMember",
        ["- id: Integer [PK]",
         "- project_id: Integer [FK]",
         "- user_id: Integer [FK]",
         "- role: UserRole",
         "- joined_at: DateTime"],
        ["+ change_role(new_role): void",
         "+ remove(): void"],
        YELLOW)

    class_box(ax, 3.5, 9.0, "Baseline",
        ["- id: Integer [PK]",
         "- project_id: Integer [FK]",
         "- is_locked: Boolean",
         "- locked_at: DateTime",
         "- snapshot: JSON",
         "- created_at: DateTime"],
        ["+ lock(): void",
         "+ calculate_drift(): DriftResult",
         "+ get_snapshot(): dict"],
        ORANGE)

    class_box(ax, 10.0, 9.0, "Feature",
        ["- id: Integer [PK]",
         "- baseline_id: Integer [FK]",
         "- name: String",
         "- description: Text",
         "- effort_days: Float",
         "- status: FeatureStatus",
         "- created_at: DateTime"],
        ["+ update(name, effort): void",
         "+ mark_done(): void"],
        BLUE)

    class_box(ax, 16.5, 9.0, "Milestone",
        ["- id: Integer [PK]",
         "- baseline_id: Integer [FK]",
         "- name: String",
         "- due_date: String",
         "- is_completed: Boolean",
         "- completed_at: DateTime"],
        ["+ complete(): void",
         "+ update(name, date): void"],
        GREEN)

    class_box(ax, 3.5, 3.5, "ChangeRequest",
        ["- id: Integer [PK]",
         "- project_id: Integer [FK]",
         "- submitted_by_id: Integer [FK]",
         "- title: String",
         "- description: Text",
         "- cr_type: CRType",
         "- status: CRStatus",
         "- ai_analysis: JSON",
         "- decision_note: Text",
         "- decided_by_id: Integer [FK]",
         "- decided_at: DateTime",
         "- created_at: DateTime"],
        ["+ submit(): void",
         "+ transition(status, note): void",
         "+ trigger_ai_analysis(): void"],
        PURPLE)

    class_box(ax, 10.5, 3.5, "CRComment",
        ["- id: Integer [PK]",
         "- cr_id: Integer [FK]",
         "- user_id: Integer [FK]",
         "- text: Text",
         "- created_at: DateTime"],
        ["+ add(text, user): Comment",
         "+ delete(): void"],
        RED)

    class_box(ax, 17.0, 3.5, "AIAnalysisResult",
        ["- timeline_impact: String",
         "- risk_score: Float  (0.0-1.0)",
         "- risk_level: String",
         "- dependency_analysis: String",
         "- alternative_suggestions: String"],
        ["+ analyze(cr, baseline): Result",
         "+ to_json(): dict"],
        YELLOW)

    # ── Enums ──
    enum_data = [
        (22.0, 14.0, "«enumeration»\nUserRole",
         ["manager", "member", "stakeholder"], GREEN),
        (22.0, 11.0, "«enumeration»\nCRStatus",
         ["draft", "submitted", "analyzing",
          "under_review", "approved", "rejected",
          "deferred", "in_progress", "done"], PURPLE),
        (22.0, 7.2,  "«enumeration»\nCRType",
         ["feature_add", "feature_remove",
          "feature_modify", "timeline_change",
          "scope_change", "other"], ORANGE),
        (22.0, 4.5,  "«enumeration»\nFeatureStatus",
         ["planned", "in_progress",
          "completed", "removed"], BLUE),
    ]
    for (ex, ey, ename, evals, ecolor) in enum_data:
        ew, eh = 3.4, 0.3 * len(evals) + 0.65
        ep = FancyBboxPatch((ex - ew/2, ey - eh/2), ew, eh,
                            boxstyle="round,pad=0.04",
                            linewidth=1.5, edgecolor=ecolor,
                            facecolor=ecolor + "22", zorder=3)
        ax.add_patch(ep)
        top = ey + eh/2
        ax.text(ex, top - 0.32, ename, ha="center", va="center",
                fontsize=8, color=ecolor, fontweight="bold", zorder=5)
        ax.plot([ex - ew/2, ex + ew/2], [top - 0.55, top - 0.55],
                color=ecolor, lw=0.8, zorder=4)
        for i, v in enumerate(evals):
            ax.text(ex, top - 0.72 - i*0.28, v,
                    ha="center", va="center", fontsize=7.5,
                    color=LIGHT, fontfamily="monospace", zorder=5)

    # ── Relationships ──
    # Arrow style: "->" = directed association (open arrowhead, NOT inheritance)
    # Multiplicity labels appear near each LINE END (UML standard)
    rel_style = dict(lw=1.2, zorder=2)

    # User owns Project  (1 → *)
    ax.annotate("", xy=(8.0, 14.5), xytext=(5.5, 14.5),
                arrowprops=dict(arrowstyle="->", color=GREEN, **rel_style))
    ax.text(5.7, 14.65, "1", fontsize=8, color=GREEN, fontweight="bold")   # source
    ax.text(7.7, 14.65, "*", fontsize=8, color=GREEN, fontweight="bold")   # target
    ax.text(6.5, 14.65, "owns", fontsize=7, color=GREEN, ha="center", style="italic")

    # Project has ProjectMember  (1 → *)
    ax.annotate("", xy=(14.5, 14.5), xytext=(12.0, 14.5),
                arrowprops=dict(arrowstyle="->", color=YELLOW, **rel_style))
    ax.text(12.2, 14.65, "1", fontsize=8, color=YELLOW, fontweight="bold")
    ax.text(14.2, 14.65, "*", fontsize=8, color=YELLOW, fontweight="bold")
    ax.text(13.2, 14.65, "has", fontsize=7, color=YELLOW, ha="center", style="italic")

    # Project has Baseline  (1 → 1)
    ax.plot([10.0, 10.0, 3.5, 3.5], [13.3, 12.8, 12.8, 10.8],
            color=ORANGE, lw=1.2, zorder=2)
    ax.annotate("", xy=(3.5, 10.8), xytext=(3.5, 11.0),
                arrowprops=dict(arrowstyle="->", color=ORANGE, lw=1.2))
    ax.text(10.2, 13.1, "1", fontsize=8, color=ORANGE, fontweight="bold")  # source (Project)
    ax.text(3.7,  11.0, "1", fontsize=8, color=ORANGE, fontweight="bold")  # target (Baseline)
    ax.text(6.5,  12.65, "has", fontsize=7, color=ORANGE, ha="center", style="italic")

    # Baseline has Feature  (1 → *)
    ax.annotate("", xy=(8.0, 9.0), xytext=(5.5, 9.0),
                arrowprops=dict(arrowstyle="->", color=BLUE, **rel_style))
    ax.text(5.7, 9.15, "1", fontsize=8, color=BLUE, fontweight="bold")
    ax.text(7.7, 9.15, "*", fontsize=8, color=BLUE, fontweight="bold")
    ax.text(6.8, 9.15, "has", fontsize=7, color=BLUE, ha="center", style="italic")

    # Baseline has Milestone  (1 → *)
    ax.annotate("", xy=(14.5, 9.0), xytext=(12.0, 9.0),
                arrowprops=dict(arrowstyle="->", color=GREEN, **rel_style))
    ax.text(12.2, 9.15, "1", fontsize=8, color=GREEN, fontweight="bold")
    ax.text(14.2, 9.15, "*", fontsize=8, color=GREEN, fontweight="bold")
    ax.text(13.2, 9.15, "has", fontsize=7, color=GREEN, ha="center", style="italic")

    # Project has ChangeRequest  (1 → *)
    ax.plot([10.0, 10.0, 3.5, 3.5], [7.7, 6.8, 6.8, 5.7],
            color=PURPLE, lw=1.2, zorder=2)
    ax.annotate("", xy=(3.5, 5.7), xytext=(3.5, 5.9),
                arrowprops=dict(arrowstyle="->", color=PURPLE, lw=1.2))
    ax.text(10.2, 7.5, "1", fontsize=8, color=PURPLE, fontweight="bold")
    ax.text(3.7,  5.75, "*", fontsize=8, color=PURPLE, fontweight="bold")
    ax.text(6.5,  6.65, "has", fontsize=7, color=PURPLE, ha="center", style="italic")

    # ChangeRequest has CRComment  (1 → *)
    ax.annotate("", xy=(8.5, 3.5), xytext=(5.5, 3.5),
                arrowprops=dict(arrowstyle="->", color=RED, **rel_style))
    ax.text(5.7, 3.65, "1", fontsize=8, color=RED, fontweight="bold")
    ax.text(8.2, 3.65, "*", fontsize=8, color=RED, fontweight="bold")
    ax.text(7.0, 3.65, "has", fontsize=7, color=RED, ha="center", style="italic")

    # ChangeRequest has AIAnalysisResult  (1 → 0..1)
    ax.annotate("", xy=(15.0, 3.5), xytext=(12.0, 3.5),
                arrowprops=dict(arrowstyle="->", color=YELLOW, **rel_style))
    ax.text(12.2, 3.65, "1", fontsize=8, color=YELLOW, fontweight="bold")
    ax.text(14.5, 3.65, "0..1", fontsize=7.5, color=YELLOW, fontweight="bold")
    ax.text(13.5, 3.65, "has", fontsize=7, color=YELLOW, ha="center", style="italic")

    # Enum connections (dashed)
    ax.plot([20.3, 19.0], [14.0, 14.5], color=GREEN+  "88", lw=1, ls="--", zorder=2)
    ax.plot([20.3, 16.5], [11.0, 7.5],  color=PURPLE+ "88", lw=1, ls="--", zorder=2)

    save(fig, "4_2_class_diagram.jpg")


# ═══════════════════════════════════════════════════════════════════════════════
# 4.3a  SEQUENCE DIAGRAM — User Registration & Login
# ═══════════════════════════════════════════════════════════════════════════════

def seq_box(ax, cx, y, w, h, label, color):
    b = FancyBboxPatch((cx - w/2, y - h/2), w, h,
                       boxstyle="round,pad=0.05", linewidth=1.5,
                       edgecolor=color, facecolor=color + "33", zorder=4)
    ax.add_patch(b)
    ax.text(cx, y, label, ha="center", va="center",
            fontsize=9, color=WHITE, fontweight="bold", zorder=5)


def seq_msg(ax, x1, x2, y, label, dashed=False, ret=False, color=LIGHT):
    style  = "->" if not ret else "<-"
    lstyle = "dashed" if dashed else "solid"
    ax.annotate("", xy=(x2, y), xytext=(x1, y),
                arrowprops=dict(arrowstyle=style, color=color, lw=1.2,
                                linestyle=lstyle))
    mx = (x1 + x2) / 2
    ax.text(mx, y + 0.1, label, ha="center", va="bottom",
            fontsize=8, color=YELLOW if not dashed else GREY)


def lifeline(ax, x, y_top, y_bot, color):
    ax.plot([x, x], [y_top, y_bot], color=color, lw=1,
            linestyle="dashed", zorder=2, alpha=0.6)


def activation(ax, x, y_top, y_bot, color):
    h = y_top - y_bot
    b = FancyBboxPatch((x - 0.12, y_bot), 0.24, h,
                       boxstyle="square,pad=0", linewidth=1,
                       edgecolor=color, facecolor=color + "55", zorder=3)
    ax.add_patch(b)


def _seq_frame(title, participants, figw=16, figh=10):
    """
    Helper: create fig+ax, draw participant boxes and full-height lifelines.
    participants = list of (x, label, color)
    Returns (fig, ax, bottom_y)
    """
    fig, ax = plt.subplots(figsize=(figw, figh))
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)
    ax.set_xlim(0, figw)
    ax.set_ylim(0, figh)
    ax.axis("off")
    section_title(ax, title)

    for (x, label, color) in participants:
        seq_box(ax, x, figh - 0.9, 2.6, 0.55, label, color)
        lifeline(ax, x, figh - 1.2, 0.4, color)

    return fig, ax


def draw_sequence_auth():
    # ── replaced by draw_sequence_login ──
    draw_sequence_login()


def draw_sequence_login():
    W, H = 16, 9
    parts = [
        (2.0,  "User",         BLUE),
        (6.0,  "Frontend",     GREEN),
        (10.5, "Backend",      ORANGE),
        (14.5, "Database",     PURPLE),
    ]
    fig, ax = _seq_frame("Sequence Diagram — User Login", parts, W, H)

    msgs = [
        # (from_x, to_x, label, dashed, is_return, y)
        (2.0,  6.0,  "Enter credentials and submit",             False, False, 7.5),
        (6.0,  10.5, "Send login request",                       False, False, 6.9),
        (10.5, 14.5, "Look up user by email",                    False, False, 6.3),
        (14.5, 10.5, "Return user record",                       True,  True,  5.7),
        (10.5, 10.5, "Verify password",                          False, False, 5.1),   # self-msg
        (10.5, 6.0,  "Return JWT access token",                  True,  True,  4.5),
        (6.0,  2.0,  "Store token, navigate to Dashboard",       True,  True,  3.9),
    ]
    for (x1, x2, lbl, dash, ret, y) in msgs:
        if x1 == x2:   # self-message
            ax.annotate("", xy=(x1 + 1.0, y - 0.2), xytext=(x1, y),
                        arrowprops=dict(arrowstyle="->", color=ORANGE, lw=1.3))
            ax.plot([x1, x1+1.0, x1+1.0], [y, y, y-0.2], color=ORANGE, lw=1.3)
            ax.text(x1 + 1.15, y - 0.1, lbl, fontsize=8.5, color=YELLOW, va="center")
        else:
            seq_msg(ax, x1, x2, y, lbl, dashed=dash, ret=ret)

    # activation bars
    for (x, ytop, ybot, c) in [
        (6.0,  7.6, 3.8, GREEN),
        (10.5, 7.0, 4.4, ORANGE),
        (14.5, 6.4, 5.6, PURPLE),
    ]:
        activation(ax, x, ytop, ybot, c)

    save(fig, "4_3a_sequence_login.jpg")


def draw_sequence_cr():
    # ── replaced by draw_sequence_cr_submit ──
    draw_sequence_cr_submit()


def draw_sequence_cr_submit():
    W, H = 18, 10
    parts = [
        (2.0,  "Member",       BLUE),
        (6.0,  "Frontend",     GREEN),
        (10.5, "Backend",      ORANGE),
        (14.5, "Database",     PURPLE),
        (17.5, "AI Service",   YELLOW),
    ]
    fig, ax = _seq_frame("Sequence Diagram — Change Request Submission & AI Analysis", parts, W, H)

    msgs = [
        (2.0,  6.0,  "Fill in CR form (title, description, type)",  False, False, 8.6),
        (6.0,  10.5, "Submit change request",                       False, False, 8.0),
        (10.5, 14.5, "Save CR with status: draft",                  False, False, 7.4),
        (14.5, 10.5, "Confirm saved",                               True,  True,  6.8),
        (2.0,  6.0,  "Click 'Submit for Review'",                   False, False, 6.2),
        (6.0,  10.5, "Update CR status to submitted",               False, False, 5.6),
        (10.5, 14.5, "Update status: analyzing",                    False, False, 5.0),
        (10.5, 17.5, "Trigger AI analysis (background)",            False, False, 4.4),
        (6.0,  2.0,  "Show 'Analyzing...' indicator",              True,  True,  3.8),
        (17.5, 14.5, "Fetch baseline features & milestones",        False, False, 3.1),
        (17.5, 17.5, "Generate impact analysis",                    False, False, 2.5),  # self
        (17.5, 14.5, "Save analysis, set status: under_review",     False, False, 1.9),
    ]
    for (x1, x2, lbl, dash, ret, y) in msgs:
        if x1 == x2:
            ax.annotate("", xy=(x1 + 0.9, y - 0.2), xytext=(x1, y),
                        arrowprops=dict(arrowstyle="->", color=YELLOW, lw=1.3))
            ax.plot([x1, x1+0.9, x1+0.9], [y, y, y-0.2], color=YELLOW, lw=1.3)
            ax.text(x1 + 1.05, y - 0.1, lbl, fontsize=8.5, color=YELLOW, va="center")
        else:
            seq_msg(ax, x1, x2, y, lbl, dashed=dash, ret=ret)

    for (x, ytop, ybot, c) in [
        (6.0,  8.7, 3.7, GREEN),
        (10.5, 8.1, 1.8, ORANGE),
        (14.5, 7.5, 1.8, PURPLE),
        (17.5, 4.3, 1.8, YELLOW),
    ]:
        activation(ax, x, ytop, ybot, c)

    save(fig, "4_3c_sequence_cr_submit.jpg")


def draw_sequence_project():
    W, H = 16, 9
    parts = [
        (2.0,  "Project Manager", BLUE),
        (6.0,  "Frontend",        GREEN),
        (10.5, "Backend",         ORANGE),
        (14.5, "Database",        PURPLE),
    ]
    fig, ax = _seq_frame("Sequence Diagram — Project Creation & Baseline Setup", parts, W, H)

    msgs = [
        (2.0,  6.0,  "Fill project form (name, description)",           False, False, 7.5),
        (6.0,  10.5, "Send create project request",                     False, False, 6.9),
        (10.5, 14.5, "Save project record",                             False, False, 6.3),
        (10.5, 14.5, "Create default baseline for project",             False, False, 5.7),
        (10.5, 14.5, "Add creator as Project Manager member",           False, False, 5.1),
        (14.5, 10.5, "Confirm all records saved",                       True,  True,  4.5),
        (10.5, 6.0,  "Return project data",                             True,  True,  3.9),
        (6.0,  2.0,  "Navigate to project dashboard",                   True,  True,  3.3),
        (2.0,  6.0,  "Add features, milestones to baseline",            False, False, 2.6),
        (2.0,  6.0,  "Lock baseline when planning is complete",         False, False, 2.0),
    ]
    for (x1, x2, lbl, dash, ret, y) in msgs:
        seq_msg(ax, x1, x2, y, lbl, dashed=dash, ret=ret)

    for (x, ytop, ybot, c) in [
        (6.0,  7.6, 1.9, GREEN),
        (10.5, 7.0, 4.4, ORANGE),
        (14.5, 6.4, 4.4, PURPLE),
    ]:
        activation(ax, x, ytop, ybot, c)

    save(fig, "4_3b_sequence_project.jpg")


def draw_sequence_cr_review():
    W, H = 16, 9
    parts = [
        (2.0,  "Project Manager", BLUE),
        (6.0,  "Frontend",        GREEN),
        (10.5, "Backend",         ORANGE),
        (14.5, "Database",        PURPLE),
    ]
    fig, ax = _seq_frame("Sequence Diagram — CR Review & Decision", parts, W, H)

    msgs = [
        (2.0,  6.0,  "Open change request detail page",                 False, False, 7.5),
        (6.0,  10.5, "Fetch CR details and AI analysis",                False, False, 6.9),
        (10.5, 14.5, "Query CR, comments, AI analysis",                 False, False, 6.3),
        (14.5, 10.5, "Return CR data",                                  True,  True,  5.7),
        (10.5, 6.0,  "Return full CR details",                          True,  True,  5.1),
        (6.0,  2.0,  "Display AI analysis and CR info",                 True,  True,  4.5),
        (2.0,  6.0,  "Write decision note, click Approve / Reject",     False, False, 3.8),
        (6.0,  10.5, "Send decision with note",                         False, False, 3.2),
        (10.5, 10.5, "Validate manager role & transition rules",        False, False, 2.7),  # self
        (10.5, 14.5, "Update CR status and decision note",              False, False, 2.1),
        (10.5, 6.0,  "Return updated CR",                               True,  True,  1.5),
    ]
    for (x1, x2, lbl, dash, ret, y) in msgs:
        if x1 == x2:
            ax.annotate("", xy=(x1 + 1.0, y - 0.2), xytext=(x1, y),
                        arrowprops=dict(arrowstyle="->", color=ORANGE, lw=1.3))
            ax.plot([x1, x1+1.0, x1+1.0], [y, y, y-0.2], color=ORANGE, lw=1.3)
            ax.text(x1 + 1.15, y - 0.1, lbl, fontsize=8.5, color=YELLOW, va="center")
        else:
            seq_msg(ax, x1, x2, y, lbl, dashed=dash, ret=ret)

    for (x, ytop, ybot, c) in [
        (6.0,  7.6, 1.4, GREEN),
        (10.5, 7.0, 1.4, ORANGE),
        (14.5, 6.4, 2.0, PURPLE),
    ]:
        activation(ax, x, ytop, ybot, c)

    save(fig, "4_3d_sequence_cr_review.jpg")


# ═══════════════════════════════════════════════════════════════════════════════
# 4.4  DATA FLOW DIAGRAM — Level 0 (Context) & Level 1
# ═══════════════════════════════════════════════════════════════════════════════

def dfd_entity(ax, x, y, label, color):
    b = FancyBboxPatch((x - 1.1, y - 0.38), 2.2, 0.76,
                       boxstyle="square,pad=0.05", linewidth=2,
                       edgecolor=color, facecolor=color + "33", zorder=3)
    ax.add_patch(b)
    ax.text(x, y, label, ha="center", va="center",
            fontsize=9, color=WHITE, fontweight="bold", zorder=4)


def dfd_process(ax, x, y, pid, label, color):
    circ = plt.Circle((x, y), 1.0, linewidth=1.8,
                      edgecolor=color, facecolor=color + "22", zorder=3)
    ax.add_patch(circ)
    ax.text(x, y + 0.18, pid, ha="center", va="center",
            fontsize=7.5, color=color, fontweight="bold", zorder=4)
    ax.text(x, y - 0.18, label, ha="center", va="center",
            fontsize=7.5, color=WHITE, zorder=4, multialignment="center")


def dfd_store(ax, x, y, label, color):
    ax.plot([x - 1.3, x + 1.3], [y + 0.28, y + 0.28], color=color, lw=2, zorder=3)
    ax.plot([x - 1.3, x + 1.3], [y - 0.28, y - 0.28], color=color, lw=2, zorder=3)
    ax.plot([x - 1.3, x - 1.3], [y - 0.28, y + 0.28], color=color, lw=1.2, zorder=3)
    rect = FancyBboxPatch((x - 1.3, y - 0.28), 2.6, 0.56,
                          boxstyle="square,pad=0", linewidth=0,
                          edgecolor="none", facecolor=color + "18", zorder=2)
    ax.add_patch(rect)
    ax.text(x, y, label, ha="center", va="center",
            fontsize=8.5, color=LIGHT, zorder=4)


def draw_dfd():
    # ── Level 0 ──
    fig0, ax0 = plt.subplots(figsize=(14, 10))
    fig0.patch.set_facecolor(BG)
    ax0.set_facecolor(BG)
    ax0.set_xlim(0, 14)
    ax0.set_ylim(0, 10)
    ax0.axis("off")
    section_title(ax0, "Data Flow Diagram — Level 0 (Context Diagram)")

    # Central system
    sys_circ = plt.Circle((7, 5), 2.2, linewidth=2.5,
                           edgecolor=BLUE, facecolor=BLUE + "22", zorder=3)
    ax0.add_patch(sys_circ)
    ax0.text(7, 5.2, "0", ha="center", fontsize=10, color=BLUE, fontweight="bold", zorder=4)
    ax0.text(7, 4.8, "Conflux\nPlatform", ha="center", fontsize=10,
             color=WHITE, fontweight="bold", zorder=4, multialignment="center")

    external = [
        (1.5, 8.5, "Project\nManager",  GREEN),
        (1.5, 5.0, "Project\nMember",   BLUE),
        (1.5, 1.5, "Stakeholder",        ORANGE),
        (12.5, 7.0, "OpenAI\nAPI",      PURPLE),
        (12.5, 3.0, "Browser\n(Client)", YELLOW),
    ]
    for (x, y, lbl, c) in external:
        dfd_entity(ax0, x, y, lbl, c)

    flows = [
        (2.6, 8.5, 4.8, 6.2,  "CR submissions, commands"),
        (4.8, 6.0, 2.6, 8.3,  "Dashboards, notifications"),
        (2.6, 5.0, 4.8, 5.2,  "Tasks, CRs, comments"),
        (4.8, 4.8, 2.6, 4.8,  "Status updates, data"),
        (2.6, 1.5, 4.8, 3.8,  "Monitoring requests"),
        (4.8, 3.6, 2.6, 1.7,  "Read-only views"),
        (9.2, 5.8, 11.4, 7.0, "CR text + baseline context"),
        (11.4,6.8, 9.2, 5.6,  "Impact analysis JSON"),
        (9.2, 4.2, 11.4,3.2,  "HTTP requests (REST API)"),
        (11.4,3.0, 9.2, 4.0,  "JSON responses"),
    ]
    for (x1, y1, x2, y2, lbl) in flows:
        arrow(ax0, x1, y1, x2, y2, color=GREY, label=lbl, label_offset=(0, 0.12))

    save(fig0, "4_4a_dfd_level0.jpg")

    # ── Level 1 ──
    fig1, ax1 = plt.subplots(figsize=(20, 14))
    fig1.patch.set_facecolor(BG)
    ax1.set_facecolor(BG)
    ax1.set_xlim(0, 20)
    ax1.set_ylim(0, 14)
    ax1.axis("off")
    section_title(ax1, "Data Flow Diagram — Level 1")

    # External entities
    dfd_entity(ax1, 1.2, 12.0, "Project Manager", GREEN)
    dfd_entity(ax1, 1.2,  7.0, "Project Member",  BLUE)
    dfd_entity(ax1, 1.2,  2.0, "Stakeholder",      ORANGE)
    dfd_entity(ax1, 18.8, 9.0, "OpenAI API",       PURPLE)

    # Processes
    dfd_process(ax1, 5.5, 12.0, "P1", "Auth &\nUser Mgmt",      BLUE)
    dfd_process(ax1, 10.0, 12.0, "P2", "Project &\nMember Mgmt", GREEN)
    dfd_process(ax1, 5.5,  7.0, "P3", "Baseline\nMgmt",         ORANGE)
    dfd_process(ax1, 10.0,  7.0, "P4", "Change\nRequest Flow",  PURPLE)
    dfd_process(ax1, 15.0,  9.0, "P5", "AI Impact\nAnalysis",   YELLOW)
    dfd_process(ax1, 10.0,  2.5, "P6", "Drift\nCalculation",    RED)
    dfd_process(ax1, 5.5,   2.5, "P7", "Dashboard &\nReporting",BLUE)

    # Data stores
    dfd_store(ax1, 5.5, 9.5, "D1: Users",             BLUE)
    dfd_store(ax1, 10.0, 9.5, "D2: Projects/Members", GREEN)
    dfd_store(ax1, 5.5,  4.5, "D3: Baselines",        ORANGE)
    dfd_store(ax1, 10.0, 4.5, "D4: Change Requests",  PURPLE)
    dfd_store(ax1, 15.0, 4.5, "D5: AI Analyses",      YELLOW)

    # Flow connections (simplified for readability)
    flow_lines = [
        # PM to processes
        (2.3, 12.0, 4.5, 12.0),
        (2.3, 11.8, 9.0, 12.0),
        (2.3, 11.6, 4.5, 7.2),
        (2.3, 11.5, 9.0, 7.2),
        # Member to processes
        (2.3,  7.0, 4.5,  7.0),
        (2.3,  6.8, 9.0,  7.0),
        # Stakeholder
        (2.3,  2.0, 4.5,  2.5),
        # Process to data stores
        (5.5, 11.0, 5.5, 9.78),
        (10.0, 11.0, 10.0, 9.78),
        (5.5,  6.0, 5.5, 4.78),
        (10.0, 6.0, 10.0, 4.78),
        (10.0, 8.0, 15.0, 9.0),
        (15.0, 8.0, 15.0, 4.78),
        (10.0, 4.5, 10.0, 3.5),
        (5.5,  4.5, 5.5,  3.5),
        (10.0, 1.5, 5.5, 1.5),
        # AI
        (16.0, 9.0, 18.0, 9.0),
        (18.0, 8.8, 16.0, 8.8),
    ]
    for (x1, y1, x2, y2) in flow_lines:
        ax1.annotate("", xy=(x2, y2), xytext=(x1, y1),
                     arrowprops=dict(arrowstyle="->", color=GREY,
                                     lw=1.0, alpha=0.7))

    save(fig1, "4_4b_dfd_level1.jpg")


# ═══════════════════════════════════════════════════════════════════════════════
# 4.5  STATE-TRANSITION DIAGRAM — Change Request
# ═══════════════════════════════════════════════════════════════════════════════

def draw_state_diagram():
    fig, ax = plt.subplots(figsize=(20, 15))
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)
    ax.set_xlim(0, 20)
    ax.set_ylim(-1.0, 14)   # extended to show final state below DONE
    ax.axis("off")
    section_title(ax, "State-Transition Diagram — Change Request Lifecycle")

    # States: (x, y, label, color)
    states = {
        "start":        (10.0, 12.8, "",               LIGHT),   # UML initial pseudostate
        "draft":        (10.0, 11.5, "DRAFT",           GREY),
        "submitted":    (10.0,  9.8, "SUBMITTED",       BLUE),
        "analyzing":    (10.0,  8.1, "ANALYZING",       YELLOW),
        "under_review": (10.0,  6.4, "UNDER REVIEW",    ORANGE),
        "approved":     (4.5,   4.2, "APPROVED",        GREEN),
        "rejected":     (10.0,  4.2, "REJECTED",        RED),
        "deferred":     (15.5,  4.2, "DEFERRED",        PURPLE),
        "in_progress":  (4.5,   2.0, "IN PROGRESS",     BLUE),
        "done":         (4.5,   0.6, "DONE",             GREEN),
        "end":          (4.5,  -0.5, "",               LIGHT),   # UML final state
    }

    for key, (x, y, lbl, color) in states.items():
        if key == "start":
            # UML initial pseudostate: solid filled black circle
            c = plt.Circle((x, y), 0.30, color=WHITE, zorder=5)
            ax.add_patch(c)
        elif key == "end":
            # UML final state: outer ring + inner filled circle
            outer = plt.Circle((x, y), 0.35, linewidth=2.5,
                               edgecolor=WHITE, facecolor="none", zorder=5)
            inner = plt.Circle((x, y), 0.20, color=WHITE, zorder=6)
            ax.add_patch(outer)
            ax.add_patch(inner)
        else:
            w = 3.2
            b = FancyBboxPatch((x - w/2, y - 0.38), w, 0.76,
                               boxstyle="round,pad=0.08,rounding_size=0.35",
                               linewidth=2, edgecolor=color,
                               facecolor=color + "33", zorder=4)
            ax.add_patch(b)
            ax.text(x, y, lbl, ha="center", va="center",
                    fontsize=10, color=WHITE, fontweight="bold", zorder=5)

    # Transitions
    transitions = [
        # (from_key, to_key, label, who, offset, curved)
        ("start",       "draft",        "CR created",                  "Member",  (0.15,  0),    False),
        ("draft",       "submitted",    "submit()",                    "Member",  (0.15,  0),    False),
        ("submitted",   "analyzing",    "auto-trigger AI",             "System",  (0.15,  0),    False),
        ("analyzing",   "under_review", "AI done / timeout (5s)",      "System",  (0.15,  0),    False),
        ("under_review","approved",     "approve(note)",               "PM",      (0,     0.12), True),
        ("under_review","rejected",     "reject(note)",                "PM",      (0,     0.12), False),
        ("under_review","deferred",     "defer(note)",                 "PM",      (0,     0.12), True),
        ("approved",    "in_progress",  "start work",                  "PM",      (-0.2,  0),    False),
        ("deferred",    "under_review", "re-evaluate",                 "PM",      (0.5,   0),    True),
        ("in_progress", "done",         "mark complete",               "PM",      (-0.2,  0),    False),
        ("done",        "end",          "",                            "System",  (0.15,  0),    False),
    ]

    def get_xy(key):
        x, y, _, _ = states[key]
        return x, y

    for (frm, to, lbl, who, off, curv) in transitions:
        x1, y1 = get_xy(frm)
        x2, y2 = get_xy(to)
        color_map = {"Member": BLUE, "System": YELLOW, "PM": GREEN}
        c = color_map.get(who, GREY)

        rad = "arc3,rad=-0.3" if curv else "arc3,rad=0.05"
        if frm == "deferred" and to == "under_review":
            rad = "arc3,rad=0.4"

        # Determine edge offsets (initial/final states are circles, others are rounded rects)
        src_offset = 0.30 if frm in ("start",) else 0.38
        dst_offset = 0.35 if to in ("end",) else (0.30 if to in ("start",) else 0.38)

        ax.annotate("", xy=(x2, y2 + dst_offset if y2 < y1 else y2 - dst_offset if y2 > y1 else y2),
                    xytext=(x1, y1 - src_offset if y2 < y1 else y1 + src_offset if y2 > y1 else y1),
                    arrowprops=dict(arrowstyle="-|>", color=c, lw=1.8,
                                    connectionstyle=rad))

        mx = (x1 + x2) / 2 + off[0]
        my = (y1 + y2) / 2 + off[1]
        ax.text(mx + 0.2, my, lbl,   fontsize=8, color=YELLOW, style="italic")
        ax.text(mx + 0.2, my - 0.22, f"[{who}]", fontsize=7.5, color=c)

    # Legend
    legend_items = [
        mpatches.Patch(facecolor=BLUE+"44",   edgecolor=BLUE,   label="Member action"),
        mpatches.Patch(facecolor=GREEN+"44",  edgecolor=GREEN,  label="Project Manager action"),
        mpatches.Patch(facecolor=YELLOW+"44", edgecolor=YELLOW, label="System (automated)"),
    ]
    ax.legend(handles=legend_items, loc="lower right", framealpha=0.2,
              facecolor=CARD, edgecolor=BLUE, labelcolor=WHITE, fontsize=9)

    # Guard note
    note = ("Guards:\n"
            "• draft → submitted : CR must have title + description\n"
            "• under_review → approved/rejected/deferred : decision_note required\n"
            "• analyzing → under_review : triggered by AI service or 5s timeout\n"
            "• Invalid transitions are blocked by the backend state machine")
    ax.text(0.3, 0.8, note, fontsize=8, color=LIGHT, va="bottom",
            bbox=dict(boxstyle="round", facecolor=CARD,
                      edgecolor=GREY, lw=1, alpha=0.9))

    save(fig, "4_5_state_transition_cr.jpg")


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("Generating Conflux UML Diagrams...")
    print(f"Output -> {OUTPUT_DIR}\n")

    draw_uc_manager()
    draw_uc_member()
    draw_uc_stakeholder()
    draw_uc_system()
    draw_class_diagram()
    draw_sequence_login()
    draw_sequence_project()
    draw_sequence_cr_submit()
    draw_sequence_cr_review()
    draw_dfd()
    draw_state_diagram()

    print(f"\nDone! {len(os.listdir(OUTPUT_DIR))} diagrams saved in ./diagrams/")
    print("\nFiles:")
    for f in sorted(os.listdir(OUTPUT_DIR)):
        print(f"  {f}")
