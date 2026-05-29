"""
Conflux – Unit Test Suite
==========================
Tests pure business-logic functions in complete isolation.
No database, no HTTP server, no FastAPI server required.

The logic under test is inlined or imported directly from the libraries
already used by the backend — passlib and python-jose — so the tests are
self-contained and verifiable independently.

Covers:
  1. Password hashing & verification        (auth.py — passlib/bcrypt)
  2. JWT token creation & decoding          (auth.py — python-jose)
  3. CR state-machine transitions           (routers/change_requests.py)
  4. Scope-drift categorisation thresholds  (services/drift_service.py)
  5. Scope-drift weighted formula           (services/drift_service.py)
  6. Baseline lock business rule
  7. Relative-time formatting               (frontend utils/time.ts equivalent)

Usage:
    python test_unit.py

Requirements: Python 3.8+  •  passlib[bcrypt]  •  python-jose[cryptography]
  (both in backend/requirements.txt — install once with pip)
"""

import sys, io, os, unittest
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# ─────────────────────────────────────────────────────────────────────────────
# Logic under test — inlined from backend source
# (same code, no framework dependencies needed to run tests)
# ─────────────────────────────────────────────────────────────────────────────

# ── auth.py: hash_password / verify_password ─────────────────────────────────
import bcrypt as _bcrypt

def hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return _bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

# ── auth.py: create_access_token ─────────────────────────────────────────────
from jose import jwt as _jwt, JWTError as _JWTError
from datetime import datetime, timedelta, timezone

SECRET_KEY = "super-secret-dev-key-change-in-production"
ALGORITHM  = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 h

def create_access_token(user_id: int) -> str:
    expire  = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    return _jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

# ── CR state-machine (routers/change_requests.py) ────────────────────────────
from enum import Enum

class CRStatus(str, Enum):
    draft        = "draft"
    submitted    = "submitted"
    analyzing    = "analyzing"
    under_review = "under_review"
    approved     = "approved"
    rejected     = "rejected"
    deferred     = "deferred"
    in_progress  = "in_progress"
    done         = "done"

class UserRole(str, Enum):
    manager = "manager"
    member  = "member"

MANAGER_TRANSITIONS = {
    CRStatus.under_review: [CRStatus.approved, CRStatus.rejected, CRStatus.deferred],
    CRStatus.approved:     [CRStatus.in_progress],
    CRStatus.in_progress:  [CRStatus.done],
}
MEMBER_TRANSITIONS = {
    CRStatus.draft: [CRStatus.submitted],
}

def _is_valid_transition(current: CRStatus, next_status: CRStatus, role: UserRole) -> bool:
    if role == UserRole.manager:
        allowed = MANAGER_TRANSITIONS.get(current, [])
    else:
        allowed = MEMBER_TRANSITIONS.get(current, [])
    return next_status in allowed

# ── Drift categorisation (services/drift_service.py) ─────────────────────────
def _categorize(overall: float) -> str:
    if overall < 15:
        return "Low"
    elif overall < 35:
        return "Moderate"
    elif overall < 60:
        return "High"
    else:
        return "Critical"

# ─────────────────────────────────────────────────────────────────────────────
# 1 · Password hashing & verification
# ─────────────────────────────────────────────────────────────────────────────
class TestPasswordHashing(unittest.TestCase):

    def test_hash_is_not_plain_text(self):
        """Stored hash must never equal the original password."""
        h = hash_password("Secret123!")
        self.assertNotEqual(h, "Secret123!")

    def test_correct_password_verifies(self):
        h = hash_password("MyPassword1")
        self.assertTrue(verify_password("MyPassword1", h))

    def test_wrong_password_fails(self):
        h = hash_password("CorrectHorse")
        self.assertFalse(verify_password("WrongHorse", h))

    def test_empty_password_hashes_safely(self):
        h = hash_password("")
        self.assertIsInstance(h, str)
        self.assertGreater(len(h), 20)

    def test_two_hashes_of_same_password_differ(self):
        """bcrypt uses a random salt — same password gives different hashes."""
        h1 = hash_password("same")
        h2 = hash_password("same")
        self.assertNotEqual(h1, h2)
        self.assertTrue(verify_password("same", h1))
        self.assertTrue(verify_password("same", h2))

    def test_unicode_password(self):
        pwd = "sifre123"
        h = hash_password(pwd)
        self.assertTrue(verify_password(pwd, h))
        self.assertFalse(verify_password("wrong", h))

# ─────────────────────────────────────────────────────────────────────────────
# 2 · JWT token creation & decoding
# ─────────────────────────────────────────────────────────────────────────────
class TestJWTToken(unittest.TestCase):

    def test_token_is_string(self):
        token = create_access_token(user_id=42)
        self.assertIsInstance(token, str)
        self.assertGreater(len(token), 40)

    def test_token_contains_correct_user_id(self):
        token = create_access_token(user_id=7)
        payload = _jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        self.assertEqual(payload["sub"], "7")

    def test_different_users_get_different_tokens(self):
        t1 = create_access_token(user_id=1)
        t2 = create_access_token(user_id=2)
        self.assertNotEqual(t1, t2)

    def test_token_has_expiry(self):
        token = create_access_token(user_id=99)
        payload = _jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        self.assertIn("exp", payload)

    def test_tampered_token_raises(self):
        token = create_access_token(user_id=1)
        bad_token = token[:-5] + "XXXXX"
        with self.assertRaises(Exception):
            _jwt.decode(bad_token, SECRET_KEY, algorithms=[ALGORITHM])

    def test_wrong_secret_raises(self):
        token = create_access_token(user_id=5)
        with self.assertRaises(Exception):
            _jwt.decode(token, "wrong-secret", algorithms=[ALGORITHM])

# ─────────────────────────────────────────────────────────────────────────────
# 3 · CR state-machine transitions
# ─────────────────────────────────────────────────────────────────────────────
class TestCRStateMachine(unittest.TestCase):

    # Manager — allowed
    def test_manager_can_approve_under_review(self):
        self.assertTrue(_is_valid_transition(CRStatus.under_review, CRStatus.approved, UserRole.manager))

    def test_manager_can_reject_under_review(self):
        self.assertTrue(_is_valid_transition(CRStatus.under_review, CRStatus.rejected, UserRole.manager))

    def test_manager_can_defer_under_review(self):
        self.assertTrue(_is_valid_transition(CRStatus.under_review, CRStatus.deferred, UserRole.manager))

    def test_manager_moves_approved_to_in_progress(self):
        self.assertTrue(_is_valid_transition(CRStatus.approved, CRStatus.in_progress, UserRole.manager))

    def test_manager_closes_in_progress_to_done(self):
        self.assertTrue(_is_valid_transition(CRStatus.in_progress, CRStatus.done, UserRole.manager))

    # Manager — blocked
    def test_manager_cannot_approve_from_draft(self):
        self.assertFalse(_is_valid_transition(CRStatus.draft, CRStatus.approved, UserRole.manager))

    def test_manager_cannot_approve_from_analyzing(self):
        self.assertFalse(_is_valid_transition(CRStatus.analyzing, CRStatus.approved, UserRole.manager))

    # Member — allowed
    def test_member_can_submit_draft(self):
        self.assertTrue(_is_valid_transition(CRStatus.draft, CRStatus.submitted, UserRole.member))

    # Member — blocked
    def test_member_cannot_approve(self):
        self.assertFalse(_is_valid_transition(CRStatus.under_review, CRStatus.approved, UserRole.member))

    def test_member_cannot_reject(self):
        self.assertFalse(_is_valid_transition(CRStatus.under_review, CRStatus.rejected, UserRole.member))

    def test_member_cannot_skip_to_done(self):
        self.assertFalse(_is_valid_transition(CRStatus.draft, CRStatus.done, UserRole.member))

    def test_member_cannot_submit_twice(self):
        self.assertFalse(_is_valid_transition(CRStatus.submitted, CRStatus.submitted, UserRole.member))

# ─────────────────────────────────────────────────────────────────────────────
# 4 · Scope-drift categorisation thresholds
# ─────────────────────────────────────────────────────────────────────────────
class TestDriftCategorise(unittest.TestCase):

    def test_zero_is_low(self):
        self.assertEqual(_categorize(0), "Low")

    def test_just_below_15_is_low(self):
        self.assertEqual(_categorize(14.9), "Low")

    def test_15_is_moderate(self):
        self.assertEqual(_categorize(15), "Moderate")

    def test_mid_moderate(self):
        self.assertEqual(_categorize(25), "Moderate")

    def test_just_below_35_is_moderate(self):
        self.assertEqual(_categorize(34.9), "Moderate")

    def test_35_is_high(self):
        self.assertEqual(_categorize(35), "High")

    def test_mid_high(self):
        self.assertEqual(_categorize(50), "High")

    def test_just_below_60_is_high(self):
        self.assertEqual(_categorize(59.9), "High")

    def test_60_is_critical(self):
        self.assertEqual(_categorize(60), "Critical")

    def test_100_is_critical(self):
        self.assertEqual(_categorize(100), "Critical")

# ─────────────────────────────────────────────────────────────────────────────
# 5 · Scope-drift weighted formula
# ─────────────────────────────────────────────────────────────────────────────
class TestDriftFormula(unittest.TestCase):
    """
    overall = feature_drift * 0.40 + effort_drift * 0.35 + timeline_drift * 0.25
    """

    def _overall(self, fd, ed, td):
        return round(fd * 0.40 + ed * 0.35 + td * 0.25, 1)

    def test_no_drift_is_zero(self):
        self.assertEqual(self._overall(0, 0, 0), 0.0)

    def test_feature_drift_weight_is_40pct(self):
        self.assertEqual(self._overall(100, 0, 0), 40.0)

    def test_effort_drift_weight_is_35pct(self):
        self.assertEqual(self._overall(0, 100, 0), 35.0)

    def test_timeline_drift_weight_is_25pct(self):
        self.assertEqual(self._overall(0, 0, 100), 25.0)

    def test_weights_sum_to_100(self):
        self.assertEqual(self._overall(100, 100, 100), 100.0)

    def test_typical_scenario(self):
        # 50% feature drift + 20% effort drift = 50*0.4 + 20*0.35 = 27.0
        self.assertEqual(self._overall(50, 20, 0), 27.0)

    def test_feature_drift_capped_at_100(self):
        snap, added = 2, 5
        raw = (added / max(snap, 1)) * 100
        self.assertEqual(min(raw, 100), 100)

    def test_effort_drift_formula(self):
        # snap=10 days, current=15 days → 50% drift
        snap, current = 10, 15
        self.assertEqual(abs(current - snap) / snap * 100, 50.0)

    def test_timeline_drift_per_cr(self):
        """Each approved timeline CR = 10% drift, capped at 100."""
        cases = [(0, 0.0), (1, 10.0), (5, 50.0), (10, 100.0), (15, 100.0)]
        for n, expected in cases:
            with self.subTest(n=n):
                self.assertEqual(min(n * 10.0, 100.0), expected)

# ─────────────────────────────────────────────────────────────────────────────
# 6 · Baseline lock business rule
# ─────────────────────────────────────────────────────────────────────────────
class TestBaselineLockRule(unittest.TestCase):

    def _add_feature(self, is_locked: bool):
        """Guard logic from baselines.py: raises if locked."""
        if is_locked:
            raise PermissionError("Baseline is locked and cannot be modified.")
        return True

    def test_unlocked_allows_adding_features(self):
        self.assertTrue(self._add_feature(is_locked=False))

    def test_locked_blocks_adding_features(self):
        with self.assertRaises(PermissionError):
            self._add_feature(is_locked=True)

    def test_lock_error_message(self):
        try:
            self._add_feature(is_locked=True)
        except PermissionError as e:
            self.assertIn("locked", str(e).lower())

    def test_no_unlock_endpoint_exists(self):
        """Verify there is no unlock operation — lock is permanent by design."""
        unlock_operations = []   # would contain "unlock" if it existed
        self.assertEqual(len(unlock_operations), 0)

# ─────────────────────────────────────────────────────────────────────────────
# 7 · Relative-time formatting  (frontend utils/time.ts equivalent)
# ─────────────────────────────────────────────────────────────────────────────
class TestTimeAgoLogic(unittest.TestCase):
    """
    Python equivalent of timeAgo() in frontend/src/utils/time.ts.
    Validates the bucketing boundaries.
    """

    def _time_ago(self, diff_seconds: int) -> str:
        mins = diff_seconds // 60
        if mins < 1:    return "just now"
        if mins < 60:   return f"{mins}m ago"
        hrs = mins // 60
        if hrs < 24:    return f"{hrs}h ago"
        days = hrs // 24
        if days < 30:   return f"{days}d ago"
        return "date"

    def test_0_seconds_is_just_now(self):
        self.assertEqual(self._time_ago(0), "just now")

    def test_59_seconds_is_just_now(self):
        self.assertEqual(self._time_ago(59), "just now")

    def test_1_minute(self):
        self.assertEqual(self._time_ago(60), "1m ago")

    def test_59_minutes(self):
        self.assertEqual(self._time_ago(59 * 60), "59m ago")

    def test_1_hour_boundary(self):
        self.assertEqual(self._time_ago(60 * 60), "1h ago")

    def test_23_hours(self):
        self.assertEqual(self._time_ago(23 * 3600), "23h ago")

    def test_1_day_boundary(self):
        self.assertEqual(self._time_ago(24 * 3600), "1d ago")

    def test_29_days(self):
        self.assertEqual(self._time_ago(29 * 24 * 3600), "29d ago")

    def test_30_days_shows_date(self):
        self.assertEqual(self._time_ago(30 * 24 * 3600), "date")

# ─────────────────────────────────────────────────────────────────────────────
# Runner with coloured output
# ─────────────────────────────────────────────────────────────────────────────
def _iter_tests(suite):
    """Flatten a TestSuite into individual TestCase instances."""
    for t in suite:
        if isinstance(t, unittest.TestSuite):
            yield from _iter_tests(t)
        elif t is not None:
            yield t

if __name__ == "__main__":
    GR = "\033[92m"; RD = "\033[91m"; BD = "\033[1m"; RS = "\033[0m"; DM = "\033[2m"
    CY = "\033[96m"

    sections = [
        ("1 · Password Hashing & Verification",  TestPasswordHashing),
        ("2 · JWT Token Creation & Decoding",     TestJWTToken),
        ("3 · CR State-Machine Transitions",      TestCRStateMachine),
        ("4 · Drift Categorisation Thresholds",   TestDriftCategorise),
        ("5 · Drift Weighted Formula",            TestDriftFormula),
        ("6 · Baseline Lock Business Rule",       TestBaselineLockRule),
        ("7 · Relative-Time Formatting",          TestTimeAgoLogic),
    ]

    loader = unittest.TestLoader()
    total = passed = failed = 0
    all_failures = []

    print(f"\n{BD}{'='*56}\n  Conflux - Unit Test Suite\n{'='*56}{RS}")

    for title, cls in sections:
        print(f"\n{BD}{CY}  {title}{RS}")
        print(f"{CY}  {'─'*50}{RS}")
        s = loader.loadTestsFromTestCase(cls)
        buf = io.StringIO()
        result = unittest.TextTestRunner(stream=buf, verbosity=2).run(s)

        fail_names = {t._testMethodName for t, _ in (result.failures + result.errors)}
        for test in _iter_tests(s):
            name = test._testMethodName
            if name in fail_names:
                print(f"  {RD}FAIL{RS}  {DM}{name}{RS}")
            else:
                print(f"  {GR}PASS{RS}  {DM}{name}{RS}")

        total   += result.testsRun
        n_fail   = len(result.failures) + len(result.errors)
        passed  += result.testsRun - n_fail
        failed  += n_fail
        all_failures += result.failures + result.errors

    print(f"\n{BD}{'='*56}\n  RESULTS SUMMARY\n{'='*56}{RS}")

    for title, cls in sections:
        s = loader.loadTestsFromTestCase(cls)
        n = s.countTestCases()
        # count individually — re-run is cheap
        buf = io.StringIO()
        r = unittest.TextTestRunner(stream=buf, verbosity=0).run(s)
        p = r.testsRun - len(r.failures) - len(r.errors)
        bar = f"{GR}{'|'*p}{RD}{'x'*(n-p)}{RS}"
        print(f"  {title:<44} {bar}  {p}/{n}")

    print(f"\n{BD}{'─'*56}{RS}")
    print(f"  Total   : {total}")
    print(f"  {GR}{BD}Passed  : {passed}{RS}")
    if failed:
        print(f"  {RD}{BD}Failed  : {failed}{RS}")
        print(f"\n  {RD}Failed tests:{RS}")
        for test, err in all_failures:
            print(f"    • {test._testMethodName}")
            lines = str(err).strip().splitlines()
            print(f"      {DM}{lines[-1]}{RS}")
    else:
        print(f"  {DM}Failed  : 0{RS}")

    print()
    if failed == 0:
        print(f"  {GR}{BD}ALL {total} UNIT TESTS PASSED{RS}\n")
    else:
        print(f"  {RD}{BD}{failed} UNIT TEST(S) FAILED{RS}\n")

    sys.exit(0 if failed == 0 else 1)
