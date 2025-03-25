# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Set build arguments
ARG REACT_APP_API_URL
ARG REACT_APP_MAPBOX_ACCESS_TOKEN

# Set environment variables from args
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_MAPBOX_ACCESS_TOKEN=$REACT_APP_MAPBOX_ACCESS_TOKEN

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
