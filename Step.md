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

<!-- Kiểm tra đã chạy chưa: -->
docker ps
$ docker compose up -d db =>   run docker image
$ docker compose ps =>  ktra nếu có thì DB mới có thể chạy * ( cần ktra tên db trong các file docker khi build)

sau khi ktra connect DB và docker thành công => docker compose up --build => sau đó ktra http://localhost/ chạy được là ok
<!--  -->



Sau khi config file liên quan docker thì cần docker compose up để build kiểm tra img docker build
