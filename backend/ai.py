import json
import os
from urllib import error, request


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


def _extract_ollama_message(payload: dict):
    message = payload.get("message", {})
    if isinstance(message, dict):
        content = message.get("content")
        if isinstance(content, str):
            return content.strip()
    return ""


def generate_lesson_coach(skill_title: str, lesson_title: str, objective: str, learner_answer: str):
    ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434/api/chat")
    ollama_model = os.getenv("OLLAMA_MODEL", "qwen3:1.7b")

    payload = {
        "model": ollama_model,
        "stream": False,
        "messages": [
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
    }

    try:
        req = request.Request(
            ollama_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with request.urlopen(req, timeout=20) as response:
            data = json.loads(response.read().decode("utf-8"))
            content = _extract_ollama_message(data)
            if content:
                return content, f"ollama:{ollama_model}"
    except (error.URLError, TimeoutError, json.JSONDecodeError, OSError):
        pass

    return _fallback_feedback(skill_title, lesson_title, learner_answer), "fallback"
