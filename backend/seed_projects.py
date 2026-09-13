"""Seed the projects/course catalog with realistic vocational training entries.

Run from the project root:
    .venv/bin/python -m backend.seed_projects
"""

from backend.database import SessionLocal
from backend.models import Project


SEED = [
    {"title": "Electrical Wiring Fundamentals", "category": "electrical", "level": "Intermediate",
     "description": "Wire outlets, switches, and read schematics safely in a 3D house.", "lessons": 12, "duration_hours": 8, "icon": "bolt", "gradient": "gradient-electric"},
    {"title": "Multimeter Mastery", "category": "electrical", "level": "Beginner",
     "description": "Measure voltage, current, and resistance with confidence.", "lessons": 6, "duration_hours": 3, "icon": "gauge", "gradient": "gradient-electric"},
    {"title": "Circuit Breaker Panel", "category": "electrical", "level": "Advanced",
     "description": "Diagnose and repair a live panel — safely and to code.", "lessons": 10, "duration_hours": 7, "icon": "panel", "gradient": "gradient-electric"},
    {"title": "Cabinet Joinery Basics", "category": "carpentry", "level": "Beginner",
     "description": "Master dovetail and mortise-and-tenon joints in a virtual woodshop.", "lessons": 12, "duration_hours": 9, "icon": "tool", "gradient": "gradient-carpentry"},
    {"title": "Power Tool Safety", "category": "carpentry", "level": "Beginner",
     "description": "Saw, drill, and sand with professional-grade technique.", "lessons": 5, "duration_hours": 2, "icon": "saw", "gradient": "gradient-carpentry"},
    {"title": "Furniture Finishing", "category": "carpentry", "level": "Intermediate",
     "description": "Sanding, staining, and sealing for a flawless finish.", "lessons": 8, "duration_hours": 5, "icon": "brush", "gradient": "gradient-carpentry"},
    {"title": "Baking Foundations", "category": "culinary", "level": "Beginner",
     "description": "Breads, pastries, and precise temperature control.", "lessons": 10, "duration_hours": 7, "icon": "chef", "gradient": "gradient-culinary"},
    {"title": "Knife Skills Lab", "category": "culinary", "level": "Beginner",
     "description": "Chop, julienne, and chiffonade like a professional.", "lessons": 4, "duration_hours": 2, "icon": "knife", "gradient": "gradient-culinary"},
    {"title": "Bakery Oven Ops", "category": "culinary", "level": "Intermediate",
     "description": "Professional oven handling, scaling, and timing.", "lessons": 9, "duration_hours": 5, "icon": "oven", "gradient": "gradient-culinary"},
    {"title": "Intro to Machine Learning", "category": "ai", "level": "Beginner",
     "description": "Train your first model and understand the AI pipeline.", "lessons": 9, "duration_hours": 7, "icon": "brain", "gradient": "gradient-ai"},
    {"title": "AI Agents & Planning", "category": "ai", "level": "Advanced",
     "description": "Build planning agents that reason about real-world tasks.", "lessons": 12, "duration_hours": 9, "icon": "robot", "gradient": "gradient-ai"},
    {"title": "Prompt Engineering", "category": "ai", "level": "Beginner",
     "description": "Craft effective prompts and evaluate model outputs.", "lessons": 6, "duration_hours": 3, "icon": "chat", "gradient": "gradient-ai"},
    {"title": "Plumbing Pipefitting", "category": "plumbing", "level": "Intermediate",
     "description": "Solder, thread, and fit copper and PEX pipe systems.", "lessons": 11, "duration_hours": 8, "icon": "pipe", "gradient": "gradient-plumbing"},
    {"title": "Fixture Installation", "category": "plumbing", "level": "Beginner",
     "description": "Install faucets, toilets, and drains correctly.", "lessons": 7, "duration_hours": 4, "icon": "faucet", "gradient": "gradient-plumbing"},
    {"title": "Robotics Assembly", "category": "robotics", "level": "Intermediate",
     "description": "Wire servos, sensors, and motor controllers in 3D.", "lessons": 10, "duration_hours": 7, "icon": "gear", "gradient": "gradient-robotics"},
    {"title": "Embedded Control Basics", "category": "robotics", "level": "Beginner",
     "description": "Program microcontrollers to respond to the world.", "lessons": 8, "duration_hours": 4, "icon": "chip", "gradient": "gradient-robotics"},
]


def seed_projects():
    db = SessionLocal()
    try:
        existing = db.query(Project).count()
        if existing:
            print(f"Catalog already seeded ({existing} projects). Skipping.")
            return
        for item in SEED:
            db.add(Project(**item, is_simulation=1))
        db.commit()
        print(f"Seeded {len(SEED)} projects into the catalog.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_projects()