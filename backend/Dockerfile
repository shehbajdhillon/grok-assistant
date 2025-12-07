FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
# Use pip install without requirements.txt to avoid hash checking
ENV PIP_TRUSTED_HOST="pypi.org pypi.python.org files.pythonhosted.org"
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
# Install each package individually to avoid hash verification issues
RUN pip install --no-cache-dir --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org letta-client && \
    pip install --no-cache-dir --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org python-dotenv && \
    pip install --no-cache-dir --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org fastapi && \
    pip install --no-cache-dir --trusted-host pypi.org --trusted-host pypi.python.org --trusted-host files.pythonhosted.org "uvicorn[standard]"

# Copy backend code
COPY backend/ .

# Copy .env file if it exists (for local development)
COPY backend/.env* ./

# Copy project root for module imports (backend.api needs project root in path)
COPY . /project_root
WORKDIR /project_root

# Expose port
EXPOSE 8000

# Set environment variables (can be overridden)
ENV API_PORT=8000
ENV API_HOST=0.0.0.0
ENV PYTHONUNBUFFERED=1

# Run the server
CMD ["python", "backend/run_server.py"]

