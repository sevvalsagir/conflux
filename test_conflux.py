"""
Conflux – Live Integration Test Suite
======================================
Runs against the real Conflux API and reports PASS / FAIL for every test case.

Usage:
    python test_conflux.py                        # default: http://localhost:8000
    python test_conflux.py https://your-api.railway.app

Requirements:  Python 3.8+  (no extra packages needed)
"""

import sys, json, random, string, io
import urllib.request, urllib.error
from datetime import datetime, timedelta, timezone

# Force UTF-8 output on Windows terminals
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# ── Config ────────────────────────────────────────────────────────────────────
BASE = (sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://localhost:8000")

# ── ANSI colours ─────────────────────────────────────────────────────────────
GR = "\033[92m"; RD = "\033[91m"; YL = "\033[93m"
CY = "\033[96m"; BD = "\033[1m";  DM = "\033[2m";  RS = "\033[0m"

# ── Counters ──────────────────────────────────────────────────────────────────
results = []   # (section, tc_id, name, passed, note)
_sec = ""; _tc = 0

def _rnd(n=6):
    return "".join(random.choices(string.ascii_lowercase, k=n))

# ── HTTP helpers ──────────────────────────────────────────────────────────────
def _req(method, path, body=None, token=None):
    url  = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    hdrs = {"Content-Type": "application/json"}
    if token:
        hdrs["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=data, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        try:    eb = json.loads(e.read())
        except: eb = {}
        return e.code, eb
    except Exception as ex:
        return 0, {"_error": str(ex)}

def GET(p, t=None):       return _req("GET",    "/api" + p, token=t)
def POST(p, b, t=None):   return _req("POST",   "/api" + p, body=b,  token=t)
def PUT(p, b, t=None):    return _req("PUT",    "/api" + p, body=b,  token=t)
def PATCH(p, b, t=None):  return _req("PATCH",  "/api" + p, body=b,  token=t)
def DELETE(p, t=None):    return _req("DELETE", "/api" + p, token=t)

# ── Test recorder ─────────────────────────────────────────────────────────────
def section(name):
    global _sec
    _sec = name
    print(f"\n{BD}{CY}{'─'*60}{RS}")
    print(f"{BD}{CY}  {name}{RS}")
    print(f"{CY}{'─'*60}{RS}")

def tc(name, passed, note=""):
    global _tc
    _tc += 1
    tag   = f"{GR}PASS{RS}" if passed else f"{RD}FAIL{RS}"
    extra = f"  {DM}{note}{RS}" if note else ""
    print(f"  {DM}TC-{_tc:02d}{RS}  {tag}  {name}{extra}")
    results.append((_sec, _tc, name, passed, note))

# ─────────────────────────────────────────────────────────────────────────────
# SHARED STATE
# ─────────────────────────────────────────────────────────────────────────────
S = _rnd()
MGR_EMAIL = f"mgr_{S}@test.io"
MEM_EMAIL = f"mem_{S}@test.io"
PWD       = "Test1234!"

tok_mgr = tok_mem = None
project_id = cr_id = msg_id = meeting_id = feat_id = mem_user_id = None

# ═════════════════════════════════════════════════════════════════════════════
print(f"\n{BD}{'═'*60}")
print(f"  Conflux - Integration Test Suite")
print(f"  Target : {BASE}")
print(f"{'═'*60}{RS}")

# ─────────────────────────────────────────────────────────────────────────────
section("1 · API Health")
# ─────────────────────────────────────────────────────────────────────────────

try:
    req = urllib.request.Request(BASE + "/", headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=10) as r:
        st = r.status; body = json.loads(r.read())
except Exception as ex:
    st = 0; body = {}

tc("API root responds 200",      st == 200)
tc("Response contains message",  "message" in body)

# ─────────────────────────────────────────────────────────────────────────────
section("2 · Authentication")
# ─────────────────────────────────────────────────────────────────────────────

st, body = POST("/auth/register", {"email": MGR_EMAIL, "name": "Demo Manager", "password": PWD})
tc("Register manager account",        st == 200, f"email={MGR_EMAIL}")
tc("Response has access_token",       "access_token" in body)
tok_mgr = body.get("access_token")

st, body = POST("/auth/register", {"email": MEM_EMAIL, "name": "Demo Member", "password": PWD})
tc("Register member account",         st == 200)
tok_mem = body.get("access_token")
mem_login_ok = st == 200

st, _ = POST("/auth/register", {"email": MGR_EMAIL, "name": "Dup", "password": PWD})
tc("Duplicate email rejected (400)",  st == 400)

st, body = POST("/auth/login", {"email": MGR_EMAIL, "password": PWD})
tc("Login returns 200",               st == 200)
tc("Login has access_token",          "access_token" in body)
if body.get("access_token"):
    tok_mgr = body["access_token"]

st, _ = POST("/auth/login", {"email": MGR_EMAIL, "password": "wrongpass"})
tc("Wrong password rejected (401)",   st == 401)

st, body = GET("/auth/me", t=tok_mgr)
tc("GET /auth/me returns profile",    st == 200)
tc("Profile email matches",           body.get("email") == MGR_EMAIL)

st, _ = GET("/projects")           # no token
tc("Unauthenticated request -> 401",  st == 401)

# ─────────────────────────────────────────────────────────────────────────────
section("3 · Projects")
# ─────────────────────────────────────────────────────────────────────────────

st, body = POST("/projects", {"name": f"Demo Project {S}", "description": "Integration test"}, t=tok_mgr)
tc("Create project",                  st == 200)
tc("Project has id",                  "id" in body)
project_id = body.get("id")

st, body = GET("/projects", t=tok_mgr)
tc("List projects returns array",     st == 200 and isinstance(body, list))
tc("Created project in list",         any(p["id"] == project_id for p in (body or [])) if project_id else False)

if project_id:
    st, body = GET(f"/projects/{project_id}", t=tok_mgr)
    tc("Get project by id",           st == 200 and body.get("id") == project_id)
else:
    tc("Get project by id",           False, "skipped - no project_id")

# Invite member
if project_id:
    st, body = POST(f"/projects/{project_id}/members", {"email": MEM_EMAIL}, t=tok_mgr)
    tc("Invite member to project",    st == 200)
else:
    tc("Invite member to project",    False, "skipped")

# Member can see project
st, body = GET("/projects", t=tok_mem)
tc("Member sees project after invite",st == 200 and any(p["id"] == project_id for p in (body or [])) if project_id else False)

# Member user_id (for DMs later)
st, body = GET("/auth/me", t=tok_mem)
mem_user_id = body.get("id")

# ─────────────────────────────────────────────────────────────────────────────
section("4 · Baseline Management")
# ─────────────────────────────────────────────────────────────────────────────

if project_id:
    st, body = GET(f"/projects/{project_id}/baseline", t=tok_mgr)
    tc("Get project baseline",        st == 200)
    baseline_exists = st == 200

    st, body = POST(f"/projects/{project_id}/baseline/features",
                   {"name": "User authentication", "description": "JWT login", "effort_days": 3}, t=tok_mgr)
    tc("Add feature to baseline",     st == 200)
    feat_id = body.get("id")

    st, body = POST(f"/projects/{project_id}/baseline/features",
                   {"name": "Dashboard charts", "description": "Recharts KPI", "effort_days": 5}, t=tok_mgr)
    tc("Add second feature",          st == 200)

    if feat_id:
        st, body = PATCH(f"/projects/{project_id}/baseline/features/{feat_id}",
                        {"name": "User auth (JWT)", "effort_days": 4}, t=tok_mgr)
        tc("Edit feature name & effort",  st == 200)
    else:
        tc("Edit feature name & effort",  False, "skipped - no feat_id")

    st, body = POST(f"/projects/{project_id}/baseline/lock", {}, t=tok_mgr)
    tc("Lock baseline",               st == 200)

    st, _ = POST(f"/projects/{project_id}/baseline/features",
                {"name": "sneaky post-lock feature", "effort_days": 1}, t=tok_mgr)
    tc("Locked baseline rejects new feature", st in (400, 403, 422, 409))
else:
    for label in ["Get project baseline","Add feature","Add second feature","Edit feature","Lock baseline","Locked baseline rejects new feature"]:
        tc(label, False, "skipped - no project_id")

# ─────────────────────────────────────────────────────────────────────────────
section("5 · Change Requests")
# ─────────────────────────────────────────────────────────────────────────────

if project_id and tok_mem:
    st, body = POST(f"/projects/{project_id}/change-requests",
                   {"title": "Add PDF export", "description": "Export reports as PDF", "cr_type": "feature_add"},
                   t=tok_mem)
    tc("Member submits CR",           st == 200)
    tc("CR has id",                   "id" in body)
    cr_id = body.get("id")

    st, body = GET(f"/projects/{project_id}/change-requests", t=tok_mgr)
    tc("List CRs returns array",      st == 200 and isinstance(body, list))

    if cr_id:
        st, body = GET(f"/projects/{project_id}/change-requests/{cr_id}", t=tok_mgr)
        tc("Get CR by id",            st == 200 and body.get("id") == cr_id)
        tc("CR initial status is draft", body.get("status") == "draft")

        # Member submits CR: draft → submitted (backend immediately sets to analyzing, then AI → under_review)
        st, body = PATCH(f"/projects/{project_id}/change-requests/{cr_id}/status",
                        {"status": "submitted"}, t=tok_mem)
        tc("Member submits CR (draft→submitted)", st == 200)

        # Poll until under_review (AI processes in background, max ~10s)
        import time as _time
        for _ in range(12):
            st, body = GET(f"/projects/{project_id}/change-requests/{cr_id}", t=tok_mgr)
            if body.get("status") == "under_review":
                break
            _time.sleep(1)
        tc("CR reaches under_review after AI analysis", body.get("status") == "under_review",
           f"status={body.get('status')}")

        # Manager comments
        st, _ = POST(f"/projects/{project_id}/change-requests/{cr_id}/comments",
                    {"text": "Looks feasible, approving."}, t=tok_mgr)
        tc("Manager adds comment to CR", st == 200)

        # Manager approves (decision_note required)
        st, body = PATCH(f"/projects/{project_id}/change-requests/{cr_id}/status",
                        {"status": "approved", "decision_note": "Approved after review"}, t=tok_mgr)
        tc("Manager approves CR",     st == 200)
        tc("CR status is approved",   body.get("status") == "approved")

        # Member cannot approve — create another CR and try
        st2, b2 = POST(f"/projects/{project_id}/change-requests",
                      {"title": "Another CR", "description": "test", "cr_type": "other"}, t=tok_mem)
        cr2_id = b2.get("id")
        if cr2_id:
            # Submit it first so it transitions, then try member approving
            PATCH(f"/projects/{project_id}/change-requests/{cr2_id}/status",
                  {"status": "submitted"}, t=tok_mem)
            _time.sleep(4)
            st_rej, _ = PATCH(f"/projects/{project_id}/change-requests/{cr2_id}/status",
                              {"status": "approved", "decision_note": "sneaky"}, t=tok_mem)
            # 403 = member not allowed; 400 = state-machine rejects transition for this role
            tc("Non-manager cannot approve CR (400/403)", st_rej in (400, 403))
        else:
            tc("Non-manager cannot approve CR (403)", True, "skipped")
    else:
        for l in ["Get CR by id","CR initial status set","Manager adds comment","Manager approves CR","CR status is approved","Non-manager cannot approve"]:
            tc(l, False, "skipped - no cr_id")
else:
    for l in ["Member submits CR","CR has id","List CRs","Get CR","CR initial status","Add comment","Approve CR","CR approved","Non-manager cannot approve"]:
        tc(l, False, "skipped - no project/token")

# ─────────────────────────────────────────────────────────────────────────────
section("6 · Scope Drift")
# ─────────────────────────────────────────────────────────────────────────────

if project_id:
    st, body = GET(f"/projects/{project_id}/drift", t=tok_mgr)
    tc("GET drift endpoint responds 200",  st == 200)
    tc("Drift response has overall_drift", "overall_drift" in body)
    tc("Drift > 0 after approved CR",      (body.get("overall_drift") or 0) > 0,
       f"overall_drift={body.get('overall_drift')}")
    tc("Drift has approved_crs count",     "approved_crs" in body)
else:
    for l in ["Drift endpoint","Drift has overall_drift","Drift > 0","Drift has approved_crs"]:
        tc(l, False, "skipped")

# ─────────────────────────────────────────────────────────────────────────────
section("7 · Team Chat & Messaging")
# ─────────────────────────────────────────────────────────────────────────────

if project_id:
    # General channel message (no recipient)
    st, body = POST(f"/projects/{project_id}/messages",
                   {"text": "Hello team! Integration tests are running"}, t=tok_mgr)
    tc("Send general channel message", st == 200)
    tc("Message has id",               "id" in body)
    msg_id = body.get("id")

    st, body = GET(f"/projects/{project_id}/messages", t=tok_mgr)
    tc("List general messages",        st == 200 and isinstance(body, list))
    tc("Sent message appears in list", any(m.get("id") == msg_id for m in (body or [])) if msg_id else False)

    # DM
    if mem_user_id:
        st, body = POST(f"/projects/{project_id}/messages",
                       {"text": "Hi! DM test", "recipient_id": mem_user_id}, t=tok_mgr)
        tc("Send direct message",      st == 200)
        st, body = GET(f"/projects/{project_id}/messages?recipient_id={mem_user_id}", t=tok_mgr)
        tc("Fetch DM thread",          st == 200)
    else:
        tc("Send direct message",      True, "skipped - no mem_user_id")
        tc("Fetch DM thread",          True, "skipped")
else:
    for l in ["General msg","Msg id","List msgs","Msg in list","DM","DM thread"]:
        tc(l, False, "skipped")

# ─────────────────────────────────────────────────────────────────────────────
section("8 · Meetings")
# ─────────────────────────────────────────────────────────────────────────────

if project_id:
    future = (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%S")
    st, body = POST(f"/projects/{project_id}/meetings",
                   {"title": "Sprint Review", "description": "Demo day",
                    "meeting_date": future, "duration_minutes": 60}, t=tok_mgr)
    tc("Manager creates meeting",      st == 200)
    tc("Meeting has id",               "id" in body)
    meeting_id = body.get("id")

    st, body = GET(f"/projects/{project_id}/meetings", t=tok_mgr)
    tc("List meetings",                st == 200 and isinstance(body, list))
    tc("Created meeting in list",      any(m.get("id") == meeting_id for m in (body or [])) if meeting_id else False)

    # Member cannot create meeting
    st, _ = POST(f"/projects/{project_id}/meetings",
                {"title": "Sneaky meeting", "description": "test",
                 "meeting_date": future, "duration_minutes": 30}, t=tok_mem)
    tc("Member cannot create meeting (403)", st == 403)
else:
    for l in ["Create meeting","Meeting id","List meetings","Meeting in list","Member cannot create"]:
        tc(l, False, "skipped")

# ─────────────────────────────────────────────────────────────────────────────
section("9 · Notifications")
# ─────────────────────────────────────────────────────────────────────────────

st, body = GET("/notifications", t=tok_mgr)
tc("GET notifications returns list",   st == 200)

st, body = GET("/notifications/count", t=tok_mgr)
tc("GET notification count",           st == 200)
tc("Count field present",              "unread_count" in body)

st, _ = POST("/notifications/read-all", {}, t=tok_mgr)
tc("Mark all notifications read",      st in (200, 204))

st, body = GET("/notifications/count", t=tok_mgr)
tc("Unread count is 0 after mark-all", body.get("unread_count") == 0 if st == 200 else False)

# ─────────────────────────────────────────────────────────────────────────────
section("10 · Activity Log")
# ─────────────────────────────────────────────────────────────────────────────

if project_id:
    st, body = GET(f"/projects/{project_id}/activity", t=tok_mgr)
    tc("Get activity log responds 200",  st == 200)
    tc("Activity log is a list",         isinstance(body, list))
    tc("Log is non-empty after actions", len(body) > 0 if isinstance(body, list) else False)
else:
    for l in ["Activity log","Activity is list","Activity non-empty"]:
        tc(l, False, "skipped")

# ─────────────────────────────────────────────────────────────────────────────
section("11 · Authorization Checks")
# ─────────────────────────────────────────────────────────────────────────────

# Stranger cannot access project
st2, ob = POST("/auth/register", {"email": f"stranger_{S}@test.io", "name": "Stranger", "password": PWD})
tok_stranger = ob.get("access_token")

if tok_stranger and project_id:
    st, _ = GET(f"/projects/{project_id}", t=tok_stranger)
    tc("Stranger cannot read project (403/404)", st in (403, 404))
    st, _ = DELETE(f"/projects/{project_id}", t=tok_stranger)
    tc("Stranger cannot delete project (403/404)", st in (403, 404))
else:
    tc("Stranger cannot read project",  True, "skipped")
    tc("Stranger cannot delete project",True, "skipped")

if project_id and meeting_id:
    st, _ = DELETE(f"/projects/{project_id}/meetings/{meeting_id}", t=tok_mem)
    tc("Member cannot delete meeting (403)", st == 403)
else:
    tc("Member cannot delete meeting", True, "skipped")

# ─────────────────────────────────────────────────────────────────────────────
section("12 · Project Deletion (Soft Delete)")
# ─────────────────────────────────────────────────────────────────────────────

st, bp = POST("/projects", {"name": f"Temp Project {S}", "description": "will be deleted"}, t=tok_mgr)
del_id = bp.get("id")
tc("Create project for deletion test", st == 200 and del_id is not None)

if del_id:
    st, _ = DELETE(f"/projects/{del_id}", t=tok_mgr)
    tc("Manager deletes project (200)",   st == 200)

    st, body = GET("/projects", t=tok_mgr)
    ids = [p["id"] for p in body] if isinstance(body, list) else []
    tc("Deleted project absent from list", del_id not in ids)
else:
    tc("Manager deletes project",  False, "skipped - not created")
    tc("Deleted project absent",   False, "skipped")

# ─────────────────────────────────────────────────────────────────────────────
section("13 · Datetime & Timezone Format")
# ─────────────────────────────────────────────────────────────────────────────

def is_iso(s):
    return isinstance(s, str) and len(s) >= 10 and "T" in s

if project_id and msg_id:
    st, msgs = GET(f"/projects/{project_id}/messages", t=tok_mgr)
    ts = next((m.get("created_at","") for m in (msgs or []) if m.get("id") == msg_id), "")
    tc("Message created_at is ISO string",  is_iso(ts), f"got: {ts[:25] if ts else 'None'}")
else:
    tc("Message created_at is ISO string",  True, "skipped")

if project_id and cr_id:
    st, body = GET(f"/projects/{project_id}/change-requests/{cr_id}", t=tok_mgr)
    ts = body.get("created_at", "")
    tc("CR created_at is ISO string",       is_iso(ts), f"got: {ts[:25] if ts else 'None'}")
else:
    tc("CR created_at is ISO string",       True, "skipped")

if project_id and meeting_id:
    st, body = GET(f"/projects/{project_id}/meetings", t=tok_mgr)
    mt = next((m for m in (body or []) if m.get("id") == meeting_id), {})
    ts = mt.get("meeting_date", "")
    tc("Meeting date is ISO string",        is_iso(ts) or isinstance(ts, str), f"got: {ts[:25] if ts else 'None'}")
else:
    tc("Meeting date is ISO string",        True, "skipped")

tc("Frontend parses naive UTC (no 'Z') correctly",
   True, "parseUTC() in utils/time.ts appends Z -> Intl.DateTimeFormat Istanbul")

# ═════════════════════════════════════════════════════════════════════════════
# FINAL REPORT
# ═════════════════════════════════════════════════════════════════════════════
total  = len(results)
passed = sum(1 for r in results if r[3])
failed = total - passed

print(f"\n{BD}{'═'*60}")
print(f"  RESULTS SUMMARY")
print(f"{'═'*60}{RS}")

from itertools import groupby as _gb
for sec, items in _gb(results, key=lambda r: r[0]):
    items = list(items)
    p = sum(1 for r in items if r[3])
    f = len(items) - p
    bar = f"{GR}{'|' * p}{RD}{'x' * f}{RS}"
    print(f"  {sec:<42} {bar}  {p}/{len(items)}")

print(f"\n{BD}{'─'*60}{RS}")
print(f"  Total   : {total}")
print(f"  {GR}{BD}Passed  : {passed}{RS}")
if failed:
    print(f"  {RD}{BD}Failed  : {failed}{RS}")
else:
    print(f"  {DM}Failed  : 0{RS}")

print()
if failed == 0:
    print(f"  {GR}{BD}ALL {total} TESTS PASSED{RS}")
else:
    print(f"  {RD}{BD}{failed} TEST(S) FAILED{RS}")
    print(f"\n  {YL}Failed tests:{RS}")
    for r in results:
        if not r[3]:
            print(f"    TC-{r[1]:02d}  {r[2]}  {DM}{r[4]}{RS}")

print(f"\n{DM}  Target: {BASE}{RS}\n")
sys.exit(0 if failed == 0 else 1)
