"""Check ZIP member paths against a conservative Windows extraction budget.

Usage: python scripts/check_windows_paths.py path/to/release.zip
The parent extraction directory is assumed to occupy at most 100 characters.
"""
import sys
import zipfile
from pathlib import PurePosixPath

MAX_PATH = 260
PARENT_BUDGET = 100

def check(path):
    with zipfile.ZipFile(path) as archive:
        paths = [info.filename for info in archive.infolist() if not info.is_dir()]
        assert paths, "Archive is empty"
        assert all(not PurePosixPath(p).is_absolute() and ".." not in PurePosixPath(p).parts for p in paths), "Unsafe archive path"
        longest = max(paths, key=len)
        estimated = PARENT_BUDGET + 1 + len(longest.replace("/", "\\"))
        print(f"Files: {len(paths)}; longest archive path: {len(longest)}; estimated Windows path: {estimated}")
        print(longest)
        if estimated > MAX_PATH:
            raise SystemExit("FAIL: Windows path budget exceeded. Extract nearer the drive root or shorten paths.")
        print("PASS: paths fit the documented extraction budget")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/check_windows_paths.py release.zip")
    check(sys.argv[1])
