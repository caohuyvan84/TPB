FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /goacd ./cmd/goacd/

FROM alpine:3.20
RUN apk --no-cache add ca-certificates
COPY --from=builder /goacd /usr/local/bin/goacd
EXPOSE 9090 9091 9092
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -q -O- http://localhost:9092/healthz || exit 1
ENTRYPOINT ["goacd"]
