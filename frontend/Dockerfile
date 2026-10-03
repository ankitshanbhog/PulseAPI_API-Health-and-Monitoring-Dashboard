# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Accept backend URL as build arg (set VITE_API_BASE_URL in Railway build variables)
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build


# Production Stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Default environment variables for template substitution (Railway injects PORT automatically)
ENV PORT=80
ENV BACKEND_URL=http://backend:5000
ENV NGINX_ENVSUBST_FILTER="PORT|BACKEND_URL"

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy nginx configuration template
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

