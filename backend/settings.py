import os
from pathlib import Path


def load_env_file() -> None:
    """Load simple KEY=VALUE pairs from local .env files without overriding env."""
    root_dir = Path(__file__).resolve().parent.parent
    for env_path in (root_dir / ".env", root_dir / "backend" / ".env"):
        if not env_path.exists():
            continue
        for raw_line in env_path.read_text().splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


load_env_file()

