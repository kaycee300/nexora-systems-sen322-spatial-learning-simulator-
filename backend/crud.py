import hashlib
import hmac
import secrets
import re
from datetime import datetime, timezone

from sqlalchemy.orm import Session

try:
    from . import models, schemas
    from .ai import generate_lesson_coach
except ImportError:
    import models  # type: ignore
    import schemas  # type: ignore
    from ai import generate_lesson_coach  # type: ignore


SKILL_TRACKS = [
    {
        "slug": "electrical-installation",
        "title": "Electrical Installation",
        "category": "Trades",
        "description": "Learn safe wiring, outlet installation, breaker basics, and practical diagnostics for homes and small businesses.",
        "demand_level": "High",
        "difficulty": "Beginner",
        "learning_path": "Safety -> tools -> wiring maps -> installation -> troubleshooting",
        "scenario": {
            "title": "Electrical Wiring Basics",
            "description": "Inspect a wall panel, identify wire colors, and trace the correct path before power is restored.",
            "tool": "Multimeter",
            "difficulty": "Beginner",
        },
    },
    {
        "slug": "solar-installation",
        "title": "Solar Panel Installation",
        "category": "Green Energy",
        "description": "Understand rooftop layouts, panel mounting, inverter setup, and maintenance checks for solar systems.",
        "demand_level": "High",
        "difficulty": "Intermediate",
        "learning_path": "Site survey -> mounting -> wiring -> inverter setup -> maintenance",
        "scenario": {
            "title": "Solar Array Layout Check",
            "description": "Arrange a small solar installation, verify tilt and spacing, and connect the inverter safely.",
            "tool": "Mounting Guide",
            "difficulty": "Intermediate",
        },
    },
    {
        "slug": "plumbing-systems",
        "title": "Plumbing Systems",
        "category": "Trades",
        "description": "Build practical skill in pipe routing, leak diagnosis, fitting selection, and fixture replacement.",
        "demand_level": "High",
        "difficulty": "Beginner",
        "learning_path": "Pipe types -> fittings -> installation -> leak testing -> repairs",
        "scenario": {
            "title": "Kitchen Sink Leak Repair",
            "description": "Inspect the trap and connectors, identify the source of the leak, and choose the correct replacement part.",
            "tool": "Pipe Wrench",
            "difficulty": "Beginner",
        },
    },
    {
        "slug": "carpentry-and-joinery",
        "title": "Carpentry and Joinery",
        "category": "Trades",
        "description": "Practice measurements, layout, cutting accuracy, joints, and installation of wooden structures and fittings.",
        "demand_level": "High",
        "difficulty": "Beginner",
        "learning_path": "Measurement -> marking -> cutting -> joints -> assembly",
        "scenario": {
            "title": "Carpentry Joint Layout",
            "description": "Measure and mark a mortise-and-tenon joint using the correct sequence and tool position.",
            "tool": "Combination Square",
            "difficulty": "Intermediate",
        },
    },
    {
        "slug": "welding-and-fabrication",
        "title": "Welding and Fabrication",
        "category": "Industrial",
        "description": "Develop fundamentals in metal preparation, weld path control, safety procedure, and fabrication workflow.",
        "demand_level": "High",
        "difficulty": "Intermediate",
        "learning_path": "Safety -> joint prep -> machine settings -> passes -> finishing",
        "scenario": {
            "title": "Weld Seam Preparation",
            "description": "Choose the correct prep angle, clamp arrangement, and pass order before starting the weld.",
            "tool": "Welding Helmet",
            "difficulty": "Intermediate",
        },
    },
    {
        "slug": "mechanical-repair",
        "title": "Mechanical Repair",
        "category": "Trades",
        "description": "Diagnose moving parts, inspect wear, read gauges, and select the right repair step for workshop systems.",
        "demand_level": "High",
        "difficulty": "Intermediate",
        "learning_path": "Inspection -> diagnostics -> disassembly -> replacement -> testing",
        "scenario": {
            "title": "Mechanical Repair Diagnostics",
            "description": "Diagnose a hydraulic pump fault, interpret readings, and choose the correct repair step.",
            "tool": "Pressure Gauge",
            "difficulty": "Advanced",
        },
    },
    {
        "slug": "auto-maintenance",
        "title": "Auto Maintenance",
        "category": "Mobility",
        "description": "Cover oil service, brake basics, battery checks, fluid inspection, and routine preventive maintenance.",
        "demand_level": "High",
        "difficulty": "Beginner",
        "learning_path": "Inspection -> fluids -> filters -> brakes -> service checklist",
        "scenario": {
            "title": "Vehicle Service Bay Check",
            "description": "Complete a routine service checklist and identify the next maintenance action for the vehicle.",
            "tool": "Service Scanner",
            "difficulty": "Beginner",
        },
    },
    {
        "slug": "hvac-basics",
        "title": "HVAC Basics",
        "category": "Building Systems",
        "description": "Learn airflow, thermostat logic, filter service, and basic diagnostics for climate control systems.",
        "demand_level": "High",
        "difficulty": "Intermediate",
        "learning_path": "Airflow -> controls -> refrigeration basics -> service -> diagnostics",
        "scenario": {
            "title": "Cooling Fault Inspection",
            "description": "Inspect an HVAC unit, read system clues, and identify the most likely cause of weak cooling.",
            "tool": "Thermostat Probe",
            "difficulty": "Intermediate",
        },
    },
    {
        "slug": "painting-and-finishing",
        "title": "Painting and Surface Finishing",
        "category": "Trades",
        "description": "Practice surface prep, priming, paint selection, masking, and clean finishing techniques.",
        "demand_level": "Medium",
        "difficulty": "Beginner",
        "learning_path": "Prep -> repair -> prime -> paint -> finish",
        "scenario": {
            "title": "Interior Wall Prep Session",
            "description": "Prepare a room for painting by spotting defects, masking edges, and selecting the right finish plan.",
            "tool": "Paint Roller Kit",
            "difficulty": "Beginner",
        },
    },
    {
        "slug": "tiling-and-flooring",
        "title": "Tiling and Flooring",
        "category": "Trades",
        "description": "Build skill in layout planning, adhesive use, spacing, leveling, and clean installation finishes.",
        "demand_level": "Medium",
        "difficulty": "Intermediate",
        "learning_path": "Layout -> substrate prep -> adhesive -> placement -> grout",
        "scenario": {
            "title": "Tile Layout Alignment",
            "description": "Plan a floor tile pattern, avoid narrow edge cuts, and set the first reference line correctly.",
            "tool": "Tile Spacer Set",
            "difficulty": "Intermediate",
        },
    },
    {
        "slug": "furniture-making",
        "title": "Furniture Making",
        "category": "Maker Skills",
        "description": "Design and build simple furniture pieces using measurement, material planning, and assembly discipline.",
        "demand_level": "Medium",
        "difficulty": "Intermediate",
        "learning_path": "Design -> materials -> cuts -> joinery -> assembly",
        "scenario": {
            "title": "Workbench Assembly Plan",
            "description": "Choose a stable joinery sequence and prepare the components for a beginner workbench build.",
            "tool": "Assembly Diagram",
            "difficulty": "Intermediate",
        },
    },
    {
        "slug": "fashion-tailoring",
        "title": "Fashion Tailoring",
        "category": "Creative Trades",
        "description": "Learn pattern reading, measurement, cutting, fitting, and finishing for garments and alterations.",
        "demand_level": "High",
        "difficulty": "Beginner",
        "learning_path": "Measurements -> patterns -> cutting -> stitching -> fitting",
        "scenario": {
            "title": "Garment Measurement Fit",
            "description": "Match body measurements to a pattern and decide where to adjust for a clean fit.",
            "tool": "Measuring Tape",
            "difficulty": "Beginner",
        },
    },
    {
        "slug": "barbing-and-haircare",
        "title": "Barbing and Haircare",
        "category": "Personal Services",
        "description": "Cover hygiene, clipper handling, sectioning, fades, and client-safe haircare basics.",
        "demand_level": "High",
        "difficulty": "Beginner",
        "learning_path": "Hygiene -> tool setup -> sectioning -> cut flow -> finishing",
        "scenario": {
            "title": "Clipper Guard Selection",
            "description": "Choose the correct clipper guards and work sequence for a clean, even haircut.",
            "tool": "Clipper Set",
            "difficulty": "Beginner",
        },
    },
    {
        "slug": "beauty-and-esthetics",
        "title": "Beauty and Esthetics",
        "category": "Personal Services",
        "description": "Practice client prep, skin-safe routines, sanitation, and service flow for beauty work.",
        "demand_level": "Medium",
        "difficulty": "Beginner",
        "learning_path": "Consultation -> sanitation -> prep -> service -> aftercare",
        "scenario": {
            "title": "Client Prep and Sanitation",
            "description": "Set up a beauty station with correct sanitation steps and service order for a facial treatment.",
            "tool": "Sanitation Kit",
            "difficulty": "Beginner",
        },
    },
    {
        "slug": "culinary-foundations",
        "title": "Culinary Foundations",
        "category": "Food Skills",
        "description": "Train knife safety, mise en place, timing, seasoning, and kitchen workflow fundamentals.",
        "demand_level": "High",
        "difficulty": "Beginner",
        "learning_path": "Prep -> knife work -> heat control -> timing -> plating",
        "scenario": {
            "title": "Kitchen Prep Rush",
            "description": "Organize ingredients, prioritize prep tasks, and sequence cooking actions under time pressure.",
            "tool": "Chef Knife",
            "difficulty": "Beginner",
        },
    },
    {
        "slug": "baking-and-pastry",
        "title": "Baking and Pastry",
        "category": "Food Skills",
        "description": "Learn measurement accuracy, dough handling, oven timing, and quality checks for baked goods.",
        "demand_level": "High",
        "difficulty": "Beginner",
        "learning_path": "Measurement -> mixing -> proofing -> baking -> finish",
        "scenario": {
            "title": "Baking Fundamentals",
            "description": "Follow a virtual recipe, weigh ingredients, and evaluate dough texture before baking.",
            "tool": "Digital Scale",
            "difficulty": "Beginner",
        },
    },
    {
        "slug": "mixology-and-cafe-service",
        "title": "Mixology and Cafe Service",
        "category": "Hospitality",
        "description": "Build workflow in beverage prep, station organization, customer handling, and consistency under pressure.",
        "demand_level": "Medium",
        "difficulty": "Beginner",
        "learning_path": "Station setup -> recipes -> service flow -> speed -> cleanup",
        "scenario": {
            "title": "Cafe Order Sequence",
            "description": "Handle a short drink queue, prioritize tasks, and prepare orders without breaking service flow.",
            "tool": "Order Ticket Board",
            "difficulty": "Beginner",
        },
    },
    {
        "slug": "event-decoration",
        "title": "Event Decoration",
        "category": "Creative Trades",
        "description": "Learn layout planning, color coordination, budget awareness, and setup execution for events.",
        "demand_level": "Medium",
        "difficulty": "Beginner",
        "learning_path": "Theme planning -> materials -> layout -> setup -> finishing",
        "scenario": {
            "title": "Reception Layout Mockup",
            "description": "Arrange decor zones for an event hall while balancing movement, visuals, and client priorities.",
            "tool": "Mood Board",
            "difficulty": "Beginner",
        },
    },
    {
        "slug": "photography-and-content-production",
        "title": "Photography and Content Production",
        "category": "Digital Creative",
        "description": "Develop practical skills in framing, lighting, shooting plans, and social-ready content production.",
        "demand_level": "High",
        "difficulty": "Beginner",
        "learning_path": "Framing -> lighting -> capture -> editing -> publishing",
        "scenario": {
            "title": "Product Shoot Lighting Setup",
            "description": "Set up a product shot using the right camera angle, light direction, and subject placement.",
            "tool": "Mirrorless Camera",
            "difficulty": "Beginner",
        },
    },
    {
        "slug": "video-editing",
        "title": "Video Editing",
        "category": "Digital Creative",
        "description": "Learn sequencing, pacing, transitions, captions, and delivery formats for modern video work.",
        "demand_level": "High",
        "difficulty": "Beginner",
        "learning_path": "Footage review -> cuts -> pacing -> audio -> export",
        "scenario": {
            "title": "Short-Form Edit Assembly",
            "description": "Assemble a short vertical video with the right pacing, captions, and call-to-action timing.",
            "tool": "Timeline Editor",
            "difficulty": "Beginner",
        },
    },
    {
        "slug": "graphic-design",
        "title": "Graphic Design",
        "category": "Digital Creative",
        "description": "Practice layout, typography, visual hierarchy, and asset preparation for client-facing design work.",
        "demand_level": "High",
        "difficulty": "Beginner",
        "learning_path": "Principles -> composition -> type -> branding -> export",
        "scenario": {
            "title": "Poster Layout Critique",
            "description": "Rebuild a poster layout by improving spacing, typography, and callout hierarchy.",
            "tool": "Design Grid",
            "difficulty": "Beginner",
        },
    },
    {
        "slug": "ui-ux-design",
        "title": "UI/UX Design",
        "category": "Digital Product",
        "description": "Learn interface layout, user flows, wireframes, and usability decisions for digital products.",
        "demand_level": "High",
        "difficulty": "Intermediate",
        "learning_path": "Research -> flows -> wireframes -> interface -> testing",
        "scenario": {
            "title": "App Flow Wireframe Review",
            "description": "Choose the clearest user path for a task and adjust the screen sequence to reduce friction.",
            "tool": "Wireframe Board",
            "difficulty": "Intermediate",
        },
    },
    {
        "slug": "frontend-development",
        "title": "Frontend Development",
        "category": "Software",
        "description": "Build practical skill in HTML, CSS, JavaScript, responsive layouts, and browser-side logic.",
        "demand_level": "High",
        "difficulty": "Intermediate",
        "learning_path": "Markup -> layout -> interaction -> data fetching -> polish",
        "scenario": {
            "title": "Responsive Landing Page Sprint",
            "description": "Implement a responsive section, connect live data, and preserve visual hierarchy across screen sizes.",
            "tool": "Code Editor",
            "difficulty": "Intermediate",
        },
    },
    {
        "slug": "backend-development",
        "title": "Backend Development",
        "category": "Software",
        "description": "Cover APIs, data models, validation, server logic, and clean backend structure for real applications.",
        "demand_level": "High",
        "difficulty": "Intermediate",
        "learning_path": "Routing -> data models -> validation -> persistence -> testing",
        "scenario": {
            "title": "API Resource Design",
            "description": "Design backend endpoints, validate payloads, and return structured responses for a learning app.",
            "tool": "API Console",
            "difficulty": "Intermediate",
        },
    },
    {
        "slug": "data-analysis",
        "title": "Data Analysis",
        "category": "Digital Skills",
        "description": "Learn spreadsheets, cleaning, dashboards, and insight communication for practical business decisions.",
        "demand_level": "High",
        "difficulty": "Beginner",
        "learning_path": "Cleaning -> formulas -> analysis -> charts -> presentation",
        "scenario": {
            "title": "Sales Sheet Cleanup",
            "description": "Clean a noisy spreadsheet, identify the right metrics, and present a simple business insight.",
            "tool": "Spreadsheet Workspace",
            "difficulty": "Beginner",
        },
    },
    {
        "slug": "cybersecurity-awareness",
        "title": "Cybersecurity Awareness",
        "category": "Digital Skills",
        "description": "Practice password hygiene, phishing detection, device safety, and incident response basics.",
        "demand_level": "High",
        "difficulty": "Beginner",
        "learning_path": "Threats -> hygiene -> phishing -> device safety -> reporting",
        "scenario": {
            "title": "Phishing Inbox Review",
            "description": "Inspect a set of emails and decide which messages are safe, suspicious, or malicious.",
            "tool": "Security Checklist",
            "difficulty": "Beginner",
        },
    },
    {
        "slug": "digital-marketing",
        "title": "Digital Marketing",
        "category": "Business Skills",
        "description": "Train on campaign basics, content planning, audience targeting, and performance signals.",
        "demand_level": "High",
        "difficulty": "Beginner",
        "learning_path": "Audience -> message -> channels -> launch -> metrics",
        "scenario": {
            "title": "Campaign Launch Planner",
            "description": "Set up a small campaign by matching goals, channels, content formats, and target audience.",
            "tool": "Campaign Canvas",
            "difficulty": "Beginner",
        },
    },
    {
        "slug": "sales-and-client-service",
        "title": "Sales and Client Service",
        "category": "Business Skills",
        "description": "Build practical customer-facing skill in discovery, communication, objection handling, and follow-up.",
        "demand_level": "High",
        "difficulty": "Beginner",
        "learning_path": "Discovery -> pitch -> objections -> close -> follow-up",
        "scenario": {
            "title": "Customer Discovery Call",
            "description": "Handle a customer conversation, identify needs, and choose the best next action to move the sale forward.",
            "tool": "Call Script",
            "difficulty": "Beginner",
        },
    },
    {
        "slug": "ai-workflow-planning",
        "title": "AI Workflow Planning",
        "category": "Digital Skills",
        "description": "Understand how to scope AI use cases, prepare data, choose models, and evaluate results responsibly.",
        "demand_level": "High",
        "difficulty": "Intermediate",
        "learning_path": "Problem framing -> data -> model choice -> evaluation -> deployment thinking",
        "scenario": {
            "title": "AI Workflow Planning",
            "description": "Build a high-level AI solution by choosing datasets, model types, and evaluation metrics.",
            "tool": "Planning Board",
            "difficulty": "Intermediate",
        },
    },
    {
        "slug": "phone-and-device-repair",
        "title": "Phone and Device Repair",
        "category": "Tech Repair",
        "description": "Practice diagnostics, disassembly discipline, part replacement, and quality checks for small devices.",
        "demand_level": "High",
        "difficulty": "Intermediate",
        "learning_path": "Diagnosis -> teardown -> replacement -> reassembly -> testing",
        "scenario": {
            "title": "Screen Repair Triage",
            "description": "Inspect a damaged device, determine the repair path, and select the right replacement sequence.",
            "tool": "Precision Toolkit",
            "difficulty": "Intermediate",
        },
    },
]


ACTIVE_SKILL_SLUGS = tuple(track["slug"] for track in SKILL_TRACKS)


def _normalize_email(email: str):
    return email.strip().lower()


def _hash_password(password: str, salt: str | None = None):
    password_salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        password_salt.encode("utf-8"),
        100_000,
    ).hex()
    return f"{password_salt}${digest}"


def _verify_password(password: str, stored_hash: str):
    salt, expected = stored_hash.split("$", 1)
    candidate = _hash_password(password, salt).split("$", 1)[1]
    return hmac.compare_digest(candidate, expected)


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == _normalize_email(email)).first()


def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_lesson(db: Session, lesson_id: int):
    return db.query(models.Lesson).filter(models.Lesson.id == lesson_id).first()


def get_module(db: Session, module_id: int):
    return db.query(models.Module).filter(models.Module.id == module_id).first()


def get_lesson_session(db: Session, session_id: int):
    return db.query(models.LessonSession).filter(models.LessonSession.id == session_id).first()


def get_lesson_events(db: Session, session_id: int):
    return (
        db.query(models.LessonEvent)
        .filter(models.LessonEvent.session_id == session_id)
        .order_by(models.LessonEvent.created_at.asc(), models.LessonEvent.id.asc())
        .all()
    )


def create_user(db: Session, payload: schemas.UserCreate):
    user = models.User(
        role=_normalize_role(payload.role),
        name=payload.name.strip(),
        email=_normalize_email(payload.email),
        password_hash=_hash_password(payload.password),
        learning_goal=payload.learning_goal.strip() if payload.learning_goal and _normalize_role(payload.role) == "learner" else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, payload: schemas.UserLogin):
    user = get_user_by_email(db, payload.email)
    if user is None:
        return None
    if user.role != _normalize_role(payload.role):
        return None
    if not _verify_password(payload.password, user.password_hash):
        return None
    return user


def _split_learning_steps(path: str):
    return [step.strip() for step in path.split("->") if step.strip()]


def _normalize_role(role: str | None):
    normalized = (role or "learner").strip().lower()
    if normalized not in {"learner", "admin"}:
        return "learner"
    return normalized


def _extract_retry_count(db: Session, session: models.LessonSession):
    notes = session.notes or ""
    match = re.search(r"retries:(\d+)", notes)
    note_retries = int(match.group(1)) if match else 0
    event_retries = sum(1 for event in get_lesson_events(db, session.id) if event.event_type == "retry_started")

    return max(note_retries, event_retries)


def _build_simulation_status_badge(*, passed_simulation_sessions: int, failed_simulation_sessions: int, retry_count_total: int):
    if passed_simulation_sessions >= 3 and failed_simulation_sessions == 0:
        return "On a clean streak"
    if failed_simulation_sessions == 0 and retry_count_total <= 1:
        return "Steady momentum"
    if failed_simulation_sessions >= passed_simulation_sessions and failed_simulation_sessions > 0:
        return "Needs another rep"
    if retry_count_total >= 4:
        return "Persistence building"
    return "Hands-on progress"


def _build_course_seed(track_data: dict):
    steps = _split_learning_steps(track_data["learning_path"])
    if not steps:
        steps = ["Orientation", "Core Practice", "Applied Assessment"]

    modules = []
    for module_index, step in enumerate(steps[:4], start=1):
        lessons = [
            {
                "title": f"{step}: concepts",
                "objective": f"Understand the core ideas behind {step.lower()} in {track_data['title'].lower()}.",
                "format": "Interactive brief",
                "duration_minutes": 18,
                "position": 1,
            },
            {
                "title": f"{step}: guided practice",
                "objective": f"Practice {step.lower()} with a structured walkthrough and checkpoints.",
                "format": "Guided simulation",
                "duration_minutes": 28,
                "position": 2,
            },
        ]

        if module_index == len(steps[:4]):
            lessons.append(
                {
                    "title": f"{track_data['scenario']['title']}: assessment",
                    "objective": track_data["scenario"]["description"],
                    "format": "Scenario assessment",
                    "duration_minutes": 35,
                    "position": 3,
                }
            )

        modules.append(
            {
                "title": step.title(),
                "description": f"Build confidence in {step.lower()} before moving to the next stage of the {track_data['title'].lower()} path.",
                "position": module_index,
                "lessons": lessons,
            }
        )

    return {
        "title": f"{track_data['title']} Career Path",
        "summary": f"A guided sequence for learners building practical skill in {track_data['title'].lower()}.",
        "level": track_data["difficulty"],
        "duration_weeks": max(4, len(modules) * 2),
        "outcome": f"Complete the path with working confidence in {track_data['title'].lower()} foundations.",
        "modules": modules,
    }


def get_skill_tracks(db: Session):
    return (
        db.query(models.SkillTrack)
        .filter(models.SkillTrack.slug.in_(ACTIVE_SKILL_SLUGS))
        .order_by(models.SkillTrack.title.asc())
        .all()
    )


def get_skill_track(db: Session, skill_id: int):
    return (
        db.query(models.SkillTrack)
        .filter(
            models.SkillTrack.id == skill_id,
            models.SkillTrack.slug.in_(ACTIVE_SKILL_SLUGS),
        )
        .first()
    )


def get_courses(db: Session):
    return (
        db.query(models.Course)
        .join(models.SkillTrack, models.SkillTrack.id == models.Course.skill_id)
        .filter(models.SkillTrack.slug.in_(ACTIVE_SKILL_SLUGS))
        .order_by(models.Course.title.asc())
        .all()
    )


def get_course(db: Session, course_id: int):
    return (
        db.query(models.Course)
        .join(models.SkillTrack, models.SkillTrack.id == models.Course.skill_id)
        .filter(models.Course.id == course_id, models.SkillTrack.slug.in_(ACTIVE_SKILL_SLUGS))
        .first()
    )


def get_course_for_skill(db: Session, skill_id: int):
    return db.query(models.Course).filter(models.Course.skill_id == skill_id).first()


def get_modules_for_course(db: Session, course_id: int):
    return (
        db.query(models.Module)
        .filter(models.Module.course_id == course_id)
        .order_by(models.Module.position.asc())
        .all()
    )


def get_lessons_for_module(db: Session, module_id: int):
    return (
        db.query(models.Lesson)
        .filter(models.Lesson.module_id == module_id)
        .order_by(models.Lesson.position.asc())
        .all()
    )


def get_scenarios_for_skill(db: Session, skill_id: int):
    return (
        db.query(models.Scenario)
        .filter(models.Scenario.skill_id == skill_id)
        .order_by(models.Scenario.title.asc())
        .all()
    )


def get_scenarios(db: Session):
    return (
        db.query(models.Scenario)
        .join(models.SkillTrack, models.SkillTrack.id == models.Scenario.skill_id)
        .filter(models.SkillTrack.slug.in_(ACTIVE_SKILL_SLUGS))
        .order_by(models.Scenario.title.asc())
        .all()
    )


def get_scenario(db: Session, scenario_id: int):
    return db.query(models.Scenario).filter(models.Scenario.id == scenario_id).first()


def create_scenario(db: Session, scenario: schemas.ScenarioBase):
    db_scenario = models.Scenario(
        title=scenario.title,
        description=scenario.description,
        tool=scenario.tool,
        difficulty=scenario.difficulty,
    )
    db.add(db_scenario)
    db.commit()
    db.refresh(db_scenario)
    return db_scenario


def get_progress(db: Session):
    return db.query(models.UserProgress).order_by(models.UserProgress.updated_at.desc()).all()


def get_users(db: Session):
    return db.query(models.User).order_by(models.User.created_at.desc(), models.User.id.desc()).all()


def get_user_progress(db: Session, user_id: int):
    return (
        db.query(models.UserProgress)
        .filter(models.UserProgress.user_id == user_id)
        .order_by(models.UserProgress.updated_at.desc())
        .all()
    )


def create_progress(db: Session, progress: schemas.ProgressCreate):
    student_name = progress.student_name.strip() if progress.student_name else None

    if progress.user_id is not None:
        user = get_user(db, progress.user_id)
        if user is not None:
            student_name = user.name

    db_progress = models.UserProgress(
        user_id=progress.user_id,
        student_name=student_name or "SkillScape learner",
        scenario_id=progress.scenario_id,
        status=progress.status,
    )
    db.add(db_progress)
    db.commit()
    db.refresh(db_progress)
    return db_progress


def build_skill_track_detail(db: Session, skill: models.SkillTrack):
    course = get_course_for_skill(db, skill.id)
    return schemas.SkillTrackDetail.model_validate(
        {
            "id": skill.id,
            "slug": skill.slug,
            "title": skill.title,
            "category": skill.category,
            "description": skill.description,
            "demand_level": skill.demand_level,
            "difficulty": skill.difficulty,
            "learning_path": skill.learning_path,
            "scenarios": get_scenarios_for_skill(db, skill.id),
            "course": build_course_detail(db, course) if course is not None else None,
        }
    )


def build_course_detail(db: Session, course: models.Course):
    modules = []
    for module in get_modules_for_course(db, course.id):
        modules.append(
            {
                "id": module.id,
                "course_id": module.course_id,
                "title": module.title,
                "description": module.description,
                "position": module.position,
                "lessons": get_lessons_for_module(db, module.id),
            }
        )

    return schemas.CourseDetail.model_validate(
        {
            "id": course.id,
            "skill_id": course.skill_id,
            "title": course.title,
            "summary": course.summary,
            "level": course.level,
            "duration_weeks": course.duration_weeks,
            "outcome": course.outcome,
            "modules": modules,
        }
    )


def build_user_profile(user: models.User):
    return schemas.UserProfile.model_validate(user)


def build_admin_dashboard(db: Session, user: models.User):
    users = get_users(db)
    total_users = len(users)
    total_learners = sum(1 for item in users if item.role == "learner")
    total_admins = sum(1 for item in users if item.role == "admin")
    total_skill_tracks = len(get_skill_tracks(db))
    total_courses = len(get_courses(db))
    total_lessons = db.query(models.Lesson).count()
    total_runtime_sessions = db.query(models.LessonSession).count()
    pending_reviews = (
        db.query(models.LessonSession)
        .filter(models.LessonSession.status.in_(["Needs review", "Failed"]))
        .count()
    )

    return schemas.AdminDashboard(
        admin=build_user_profile(user),
        total_users=total_users,
        total_learners=total_learners,
        total_admins=total_admins,
        total_skill_tracks=total_skill_tracks,
        total_courses=total_courses,
        total_lessons=total_lessons,
        total_runtime_sessions=total_runtime_sessions,
        pending_reviews=pending_reviews,
        recent_signups=[build_user_profile(item) for item in users[:6]],
        recent_activity=[schemas.Progress.model_validate(item) for item in get_progress(db)[:6]],
    )


def get_recommended_skills(db: Session, limit: int = 6):
    return get_skill_tracks(db)[:limit]


def get_recommended_courses(db: Session, limit: int = 4):
    return get_courses(db)[:limit]


def get_lesson_completion(db: Session, user_id: int, lesson_id: int):
    return (
        db.query(models.LessonCompletion)
        .filter(
            models.LessonCompletion.user_id == user_id,
            models.LessonCompletion.lesson_id == lesson_id,
        )
        .first()
    )


def get_user_lesson_completions(db: Session, user_id: int):
    return (
        db.query(models.LessonCompletion)
        .filter(models.LessonCompletion.user_id == user_id)
        .order_by(models.LessonCompletion.updated_at.desc())
        .all()
    )


def get_active_lesson_session(db: Session, user_id: int, lesson_id: int):
    return (
        db.query(models.LessonSession)
        .filter(
            models.LessonSession.user_id == user_id,
            models.LessonSession.lesson_id == lesson_id,
            models.LessonSession.status == "In progress",
        )
        .order_by(models.LessonSession.started_at.desc())
        .first()
    )


def get_user_active_sessions(db: Session, user_id: int):
    return (
        db.query(models.LessonSession)
        .filter(
            models.LessonSession.user_id == user_id,
            models.LessonSession.status == "In progress",
        )
        .all()
    )


def get_user_lesson_sessions(db: Session, user_id: int):
    return (
        db.query(models.LessonSession)
        .filter(models.LessonSession.user_id == user_id)
        .order_by(models.LessonSession.started_at.desc(), models.LessonSession.id.desc())
        .all()
    )


def _find_skill_for_course(db: Session, course: models.Course):
    return db.query(models.SkillTrack).filter(models.SkillTrack.id == course.skill_id).first()


def _find_scenario_for_skill(db: Session, skill_id: int):
    return (
        db.query(models.Scenario)
        .filter(models.Scenario.skill_id == skill_id)
        .order_by(models.Scenario.id.asc())
        .first()
    )


def build_lesson_runtime(db: Session, lesson: models.Lesson, user_id: int | None = None):
    module = get_module(db, lesson.module_id)
    course = db.query(models.Course).filter(models.Course.id == module.course_id).first()
    skill = _find_skill_for_course(db, course)
    scenario = _find_scenario_for_skill(db, skill.id)
    completion = get_lesson_completion(db, user_id, lesson.id) if user_id is not None else None
    active_session = get_active_lesson_session(db, user_id, lesson.id) if user_id is not None else None

    checklist = [
        f"State the goal of {lesson.title.lower()} in plain language.",
        f"List the correct sequence for {module.title.lower()}.",
        f"Explain one quality or safety check relevant to {skill.title.lower()}.",
    ]
    rubric = [
        "Uses the right sequence instead of generic advice.",
        "Names the tool, concept, or control relevant to the lesson.",
        "Ends with a safety, quality, or verification step.",
    ]

    return schemas.LessonRuntime(
        skill=schemas.SkillTrack.model_validate(skill),
        course=schemas.Course.model_validate(course),
        module=schemas.Module.model_validate(module),
        lesson=schemas.Lesson.model_validate(lesson),
        scenario=schemas.Scenario.model_validate(scenario) if scenario else None,
        checklist=checklist,
        rubric=rubric,
        prompt=(
            f"You are performing {lesson.title.lower()} in the {skill.title.lower()} path. "
            f"Describe the setup, the key execution steps, and the final verification."
        ),
        completion=schemas.LessonCompletion.model_validate(completion) if completion else None,
        active_session=schemas.LessonSession.model_validate(active_session) if active_session else None,
    )


def _keyword_score(reference_text: str, learner_answer: str):
    keywords = {token for token in re.findall(r"[a-zA-Z]{5,}", reference_text.lower()) if token not in {"learners", "skillscape", "guided", "module"}}
    if not keywords:
        return 50
    learner_tokens = set(re.findall(r"[a-zA-Z]{5,}", learner_answer.lower()))
    hits = len(keywords.intersection(learner_tokens))
    score = int(min(100, 35 + (hits * 12)))
    return score


def create_lesson_attempt(db: Session, lesson: models.Lesson, payload: schemas.LessonAttemptCreate):
    runtime = build_lesson_runtime(db, lesson, payload.user_id)
    reference = " ".join([lesson.objective, runtime.prompt, *(runtime.checklist)])
    score = _keyword_score(reference, payload.answer)
    feedback, _provider = generate_lesson_coach(runtime.skill.title, lesson.title, lesson.objective, payload.answer)

    attempt = models.LessonAttempt(
        user_id=payload.user_id,
        lesson_id=lesson.id,
        answer=payload.answer.strip(),
        score=score,
        feedback=feedback,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt


def upsert_lesson_completion(db: Session, lesson: models.Lesson, payload: schemas.LessonCompletionCreate):
    completion = get_lesson_completion(db, payload.user_id, lesson.id)
    if completion is None:
        completion = models.LessonCompletion(
            user_id=payload.user_id,
            lesson_id=lesson.id,
            status=payload.status,
            score=payload.score,
            feedback=payload.feedback,
        )
        db.add(completion)
    else:
        completion.status = payload.status
        completion.score = payload.score
        completion.feedback = payload.feedback

    db.commit()
    db.refresh(completion)
    return completion


def build_ai_coach_feedback(db: Session, lesson: models.Lesson, answer: str):
    runtime = build_lesson_runtime(db, lesson)
    feedback, provider = generate_lesson_coach(runtime.skill.title, lesson.title, lesson.objective, answer)
    return schemas.AICoachResponse(feedback=feedback, provider=provider)


def build_learner_dashboard(db: Session, user: models.User):
    activity = get_user_progress(db, user.id)
    lesson_completions = get_user_lesson_completions(db, user.id)
    active_sessions = get_user_active_sessions(db, user.id)
    lesson_sessions = get_user_lesson_sessions(db, user.id)
    completed_sessions = sum(1 for item in activity if item.status == "Completed")
    in_progress_sessions = sum(1 for item in activity if item.status == "In progress")
    completed_lessons = sum(1 for item in lesson_completions if item.status == "Completed")
    active_lessons = sum(1 for item in lesson_completions if item.status != "Completed")
    passed_simulation_sessions = sum(1 for item in lesson_sessions if (item.status or "").lower() == "completed")
    failed_simulation_sessions = sum(
        1 for item in lesson_sessions if (item.status or "").lower() in {"needs review", "failed"}
    )
    retry_count_total = sum(_extract_retry_count(db, item) for item in lesson_sessions)

    return schemas.LearnerDashboard(
        user=build_user_profile(user),
        total_progress_entries=len(activity),
        completed_sessions=completed_sessions,
        in_progress_sessions=in_progress_sessions,
        completed_lessons=completed_lessons,
        active_lessons=active_lessons,
        active_simulation_sessions=len(active_sessions),
        passed_simulation_sessions=passed_simulation_sessions,
        failed_simulation_sessions=failed_simulation_sessions,
        retry_count_total=retry_count_total,
        simulation_status_badge=_build_simulation_status_badge(
            passed_simulation_sessions=passed_simulation_sessions,
            failed_simulation_sessions=failed_simulation_sessions,
            retry_count_total=retry_count_total,
        ),
        recent_activity=[schemas.Progress.model_validate(item) for item in activity[:6]],
        recommended_skills=[schemas.SkillTrack.model_validate(item) for item in get_recommended_skills(db)],
        recommended_courses=[schemas.Course.model_validate(item) for item in get_recommended_courses(db)],
    )


def start_lesson_session(db: Session, lesson: models.Lesson, payload: schemas.LessonSessionCreate):
    existing = get_active_lesson_session(db, payload.user_id, lesson.id)
    if existing is not None:
        return existing

    session = models.LessonSession(
        user_id=payload.user_id,
        lesson_id=lesson.id,
        status="In progress",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def log_lesson_event(db: Session, session: models.LessonSession, payload: schemas.LessonEventCreate):
    event = models.LessonEvent(
        session_id=session.id,
        event_type=payload.event_type,
        event_value=payload.event_value,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def complete_lesson_session(db: Session, session: models.LessonSession, payload: schemas.LessonSessionUpdate):
    session.status = payload.status
    session.score = payload.score
    session.notes = payload.notes
    if payload.status in {"Completed", "Needs review", "Failed"}:
        session.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)
    return session


def build_lesson_session_detail(db: Session, session: models.LessonSession):
    return schemas.LessonSessionDetail(
        **schemas.LessonSession.model_validate(session).model_dump(),
        events=[schemas.LessonEvent.model_validate(item) for item in get_lesson_events(db, session.id)],
    )


def seed_scenarios(db: Session):
    existing_tracks = {track.slug: track for track in db.query(models.SkillTrack).all()}
    existing_scenarios = {record.title: record for record in db.query(models.Scenario).all()}

    existing_courses = {course.skill_id: course for course in db.query(models.Course).all()}
    existing_modules = {
        (module.course_id, module.position): module for module in db.query(models.Module).all()
    }
    existing_lessons = {
        (lesson.module_id, lesson.position): lesson for lesson in db.query(models.Lesson).all()
    }

    for track_data in SKILL_TRACKS:
        scenario_data = track_data["scenario"]
        skill = existing_tracks.get(track_data["slug"])

        if skill is None:
            skill = models.SkillTrack(
                slug=track_data["slug"],
                title=track_data["title"],
                category=track_data["category"],
                description=track_data["description"],
                demand_level=track_data["demand_level"],
                difficulty=track_data["difficulty"],
                learning_path=track_data["learning_path"],
            )
            db.add(skill)
            db.flush()
            existing_tracks[skill.slug] = skill
        else:
            skill.category = track_data["category"]
            skill.description = track_data["description"]
            skill.demand_level = track_data["demand_level"]
            skill.difficulty = track_data["difficulty"]
            skill.learning_path = track_data["learning_path"]

        scenario = existing_scenarios.get(scenario_data["title"])
        if scenario is None:
            scenario = models.Scenario(
                skill_id=skill.id,
                title=scenario_data["title"],
                description=scenario_data["description"],
                tool=scenario_data["tool"],
                difficulty=scenario_data["difficulty"],
            )
            db.add(scenario)
            existing_scenarios[scenario.title] = scenario
        else:
            scenario.skill_id = skill.id
            scenario.description = scenario_data["description"]
            scenario.tool = scenario_data["tool"]
            scenario.difficulty = scenario_data["difficulty"]

        course_seed = _build_course_seed(track_data)
        course = existing_courses.get(skill.id)
        if course is None:
            course = models.Course(
                skill_id=skill.id,
                title=course_seed["title"],
                summary=course_seed["summary"],
                level=course_seed["level"],
                duration_weeks=course_seed["duration_weeks"],
                outcome=course_seed["outcome"],
            )
            db.add(course)
            db.flush()
            existing_courses[skill.id] = course
        else:
            course.title = course_seed["title"]
            course.summary = course_seed["summary"]
            course.level = course_seed["level"]
            course.duration_weeks = course_seed["duration_weeks"]
            course.outcome = course_seed["outcome"]

        for module_seed in course_seed["modules"]:
            module_key = (course.id, module_seed["position"])
            module = existing_modules.get(module_key)
            if module is None:
                module = models.Module(
                    course_id=course.id,
                    title=module_seed["title"],
                    description=module_seed["description"],
                    position=module_seed["position"],
                )
                db.add(module)
                db.flush()
                existing_modules[module_key] = module
            else:
                module.title = module_seed["title"]
                module.description = module_seed["description"]

            for lesson_seed in module_seed["lessons"]:
                lesson_key = (module.id, lesson_seed["position"])
                lesson = existing_lessons.get(lesson_key)
                if lesson is None:
                    lesson = models.Lesson(
                        module_id=module.id,
                        title=lesson_seed["title"],
                        objective=lesson_seed["objective"],
                        format=lesson_seed["format"],
                        duration_minutes=lesson_seed["duration_minutes"],
                        position=lesson_seed["position"],
                    )
                    db.add(lesson)
                    existing_lessons[lesson_key] = lesson
                else:
                    lesson.title = lesson_seed["title"]
                    lesson.objective = lesson_seed["objective"]
                    lesson.format = lesson_seed["format"]
                    lesson.duration_minutes = lesson_seed["duration_minutes"]

    legacy_title = "Creative Skills Simulation"
    legacy_record = existing_scenarios.get(legacy_title)
    if legacy_record is not None and legacy_record.skill_id is None:
        legacy_record.skill_id = existing_tracks["ai-workflow-planning"].id

    db.commit()
