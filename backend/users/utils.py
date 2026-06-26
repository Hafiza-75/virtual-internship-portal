def calculate_score(questions, answers):
    score = 0

    for q in questions:
        if answers.get(q["question"]) == q["correct_answer"]:
            score += 1

    return score


def get_level(score):
    if score <= 3:
        return "Beginner"
    elif score <= 7:
        return "Intermediate"
    else:
        return "Advanced"