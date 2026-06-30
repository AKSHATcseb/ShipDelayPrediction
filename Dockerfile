# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies needed for compiling python packages if any
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application files
COPY backend/ ./backend
COPY ml/ ./ml
COPY data/ ./data
COPY models/ ./models
COPY run_server.py .
COPY run_pipeline.py .

# Create volume for database persistence
RUN mkdir -p /app/database

# Expose port
EXPOSE 8000

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=8000
ENV DATABASE_URL=sqlite:////app/database/pmis.db

# Run uvicorn server on startup
CMD ["python", "run_server.py"]
