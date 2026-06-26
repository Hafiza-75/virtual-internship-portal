FROM python:3.11-slim

WORKDIR /app

# Copy requirements from backend folder
COPY backend/requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY backend/ .

# Expose port
EXPOSE 8000

# Start command
CMD ["gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:8000"]