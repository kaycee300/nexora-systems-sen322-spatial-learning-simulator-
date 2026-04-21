import os

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover - optional dependency in this prototype
    OpenAI = None  # type: ignore


def _fallback_feedback(skill_title: str, lesson_title: str, learner_answer: str):
    response = learner_answer.strip()
    if not response:
        return (
            f"Start by restating the core goal of {lesson_title.lower()} in {skill_title.lower()}, "
            "then describe the safest first action, the main tool or concept involved, and the expected result."
        )

    answer_length = len(response.split())
    if answer_length < 18:
        return (
            "Your answer is too thin to assess. Expand it with three parts: "
            "the setup, the execution sequence, and the quality or safety check at the end."
        )

    return (
        f"You have a usable draft for {lesson_title.lower()}. Strengthen it by naming the correct sequence, "
        "calling out a likely mistake, and explaining how you would verify the work before completion."
    )


def generate_lesson_coach(skill_title: str, lesson_title: str, objective: str, learner_answer: str):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or OpenAI is None:
        return _fallback_feedback(skill_title, lesson_title, learner_answer), "fallback"

    client = OpenAI(api_key=api_key)
    model = os.getenv("OPENAI_MODEL", "gpt-5.4-mini")

    response = client.responses.create(
        model=model,
        input=[
            {
                "role": "system",
                "content": (
                    "You are a concise vocational learning coach. "
                    "Give direct feedback on the learner's answer. "
                    "Return 3 short parts: what is correct, what is missing, and the next action."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Skill: {skill_title}\n"
                    f"Lesson: {lesson_title}\n"
                    f"Objective: {objective}\n"
                    f"Learner answer: {learner_answer or '[empty]'}"
                ),
            },
        ],
    )

    return response.output_text.strip(), model
