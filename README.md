# Docker quick start
```docker
version: '3.8'
services:
  backend:
    image: acgtic211/things-generator-backend:1.0.0
    container_name: things-generator-backend
    environment:
      - FLASK_RUN_HOST=0.0.0.0
      - FLASK_RUN_PORT=5000
    ports:
      - "5000:5000"


  frontend:
    image: acgtic211/things-generator-frontend:1.0.0
    container_name: things-generator-frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://0.0.0.0:5000
```
