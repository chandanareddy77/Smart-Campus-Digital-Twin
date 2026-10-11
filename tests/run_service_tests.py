"""Tiny runner so service tests work without pytest:  python tests/run_service_tests.py"""
import sys
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import test_services as t  # noqa: E402

failed = 0
for name in sorted(n for n in dir(t) if n.startswith("test_")):
    try:
        getattr(t, name)()
        print(f"PASS {name}")
    except Exception:
        failed += 1
        print(f"FAIL {name}")
        traceback.print_exc()
print(f"\n{'FAILED' if failed else 'All passed'}: {failed} failure(s)")
sys.exit(1 if failed else 0)
