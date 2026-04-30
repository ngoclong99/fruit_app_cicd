1/ Source
my-app/
├── frontend/
│   ├── Dockerfile
│   └── nginx.conf
├── backend/
│   └── Dockerfile
├── nginx/
│   └── default.conf
├── docker-compose.yml          ← chạy local
├── docker-compose.prod.yml     ← chạy trên EC2
├── .env.example
└── .gitignore

2/ PostgreSQL bằng Docker
docker run -d \
  --name postgres-todo \
  -e POSTGRES_USER=userPostgres \
  -e POSTGRES_PASSWORD=passPostgres \
  -e POSTGRES_DB=todos_db \
  -p 5432:5432 \
  postgres:16-alpine

Kiểm tra đã chạy chưa:
docker ps
