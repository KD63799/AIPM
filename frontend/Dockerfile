FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build

FROM nginx:1.29-alpine
# Rendered by the image entrypoint with envsubst: ${API_UPSTREAM} is the backend base URL.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/AI-Prompt-Manager/browser /usr/share/nginx/html
ENV API_UPSTREAM=http://backend:3000
EXPOSE 80
