#!/usr/bin/env python3
"""Script to seed the database with initial data."""

import asyncio
import sys
from pathlib import Path

# Add the backend directory to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.seed import seed_system_assistants
from app.db.session import async_session_maker


async def main():
    """Run database seeding."""
    print("Seeding database...")

    async with async_session_maker() as session:
        count = await seed_system_assistants(session)
        print(f"Created {count} system assistants.")

    print("Done!")


if __name__ == "__main__":
    asyncio.run(main())
