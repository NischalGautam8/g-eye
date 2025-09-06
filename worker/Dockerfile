FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .

RUN apt-get update && apt-get install -y libexpat1

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "process.py"]
