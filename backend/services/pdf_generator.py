# services/pdf_generator.py
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from textwrap import wrap

def save_workout_plan_to_pdf(text: str, filename: str = "workout_plan.pdf", width_limit: int = 100):
    file_path = f"/mnt/data/{filename}"  # Same as sandbox path in ChatGPT
    c = canvas.Canvas(file_path, pagesize=letter)
    width, height = letter
    y = height - 50
    wrapped_lines = []

    for paragraph in text.split("\n"):
        wrapped_lines.extend(wrap(paragraph, width=width_limit))
        wrapped_lines.append("")  # add spacing between paragraphs

    for line in wrapped_lines:
        if y < 50:
            c.showPage()
            y = height - 50
        c.drawString(50, y, line)
        y -= 14

    c.save()
    return file_path
