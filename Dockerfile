FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Create saves directory
RUN mkdir -p saves

# Expose port
EXPOSE 5000

# Start server
CMD ["python", "server.py"]
