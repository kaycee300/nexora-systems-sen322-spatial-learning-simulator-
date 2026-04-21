from sqlalchemy.orm import Session

try:
    from . import models, schemas
except ImportError:
    import models  # type: ignore
    import schemas  # type: ignore


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
        "slug": "motorcycle-repair",
        "title": "Motorcycle Repair",
        "category": "Mobility",
        "description": "Learn inspection, chain care, brake adjustment, and simple engine diagnosis for motorcycles and scooters.",
        "demand_level": "Medium",
        "difficulty": "Intermediate",
        "learning_path": "Inspection -> drive system -> brakes -> engine checks -> final test",
        "scenario": {
            "title": "Motorcycle Drive Tune-Up",
            "description": "Inspect chain tension, wheel alignment, and brake response before releasing the bike.",
            "tool": "Torque Wrench",
            "difficulty": "Intermediate",
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
        "slug": "project-coordination",
        "title": "Project Coordination",
        "category": "Business Skills",
        "description": "Learn task sequencing, stakeholder updates, delivery tracking, and practical execution discipline.",
        "demand_level": "Medium",
        "difficulty": "Intermediate",
        "learning_path": "Scope -> tasks -> ownership -> tracking -> review",
        "scenario": {
            "title": "Delivery Timeline Rescue",
            "description": "Re-plan a slipping project by prioritizing tasks, updating owners, and protecting key milestones.",
            "tool": "Project Board",
            "difficulty": "Intermediate",
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
        "slug": "drone-operations",
        "title": "Drone Operations",
        "category": "Emerging Tech",
        "description": "Learn pre-flight checks, route planning, safe operation, and basic capture workflows for drones.",
        "demand_level": "Medium",
        "difficulty": "Intermediate",
        "learning_path": "Pre-flight -> controls -> route -> safety -> capture review",
        "scenario": {
            "title": "Pre-Flight Safety Brief",
            "description": "Complete a drone safety check and choose the correct flight plan for a short survey mission.",
            "tool": "Flight Tablet",
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


def get_skill_tracks(db: Session):
    return db.query(models.SkillTrack).order_by(models.SkillTrack.title.asc()).all()


def get_skill_track(db: Session, skill_id: int):
    return db.query(models.SkillTrack).filter(models.SkillTrack.id == skill_id).first()


def get_scenarios_for_skill(db: Session, skill_id: int):
    return (
        db.query(models.Scenario)
        .filter(models.Scenario.skill_id == skill_id)
        .order_by(models.Scenario.title.asc())
        .all()
    )


def get_scenarios(db: Session):
    return db.query(models.Scenario).order_by(models.Scenario.title.asc()).all()


def get_scenario(db: Session, scenario_id: int):
    return db.query(models.Scenario).filter(models.Scenario.id == scenario_id).first()


def get_progress(db: Session):
    return db.query(models.UserProgress).all()


def create_progress(db: Session, progress: schemas.ProgressCreate):
    db_progress = models.UserProgress(
        student_name=progress.student_name,
        scenario_id=progress.scenario_id,
        status=progress.status,
    )
    db.add(db_progress)
    db.commit()
    db.refresh(db_progress)
    return db_progress


def build_skill_track_detail(db: Session, skill: models.SkillTrack):
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
        }
    )


def seed_scenarios(db: Session):
    existing_tracks = {track.slug: track for track in db.query(models.SkillTrack).all()}
    existing_scenarios = {record.title: record for record in db.query(models.Scenario).all()}

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

    legacy_title = "Creative Skills Simulation"
    legacy_record = existing_scenarios.get(legacy_title)
    if legacy_record is not None and legacy_record.skill_id is None:
        legacy_record.skill_id = existing_tracks["ai-workflow-planning"].id

    db.commit()
