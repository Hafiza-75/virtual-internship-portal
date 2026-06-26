FROM python:3.12-slim

WORKDIR /app

# Copy requirements
COPY backend/requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY backend/ .

# Expose port - Railway uses 8080
EXPOSE 8080

# Start command with port 8080
CMD ["gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:8080"]