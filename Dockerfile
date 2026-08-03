# Stage 1: Install all dependencies
 FROM node:22-alpine AS dependencies

 WORKDIR /app
 
 COPY package.json package-lock.json ./
 
 RUN npm ci
 
 
 # Stage 2: Build the NestJS application
 FROM node:22-alpine AS builder
 
 WORKDIR /app
 
 COPY --from=dependencies /app/node_modules ./node_modules
 COPY package.json package-lock.json ./
 COPY nest-cli.json tsconfig.json tsconfig.build.json ./
 COPY src ./src
 
 RUN npm run build
 
 
 # Stage 3: Migration runner
 # Includes drizzle-kit and TypeScript schema files
 FROM node:22-alpine AS migration
 
 WORKDIR /app
 
 ENV NODE_ENV=production
 
 COPY --from=dependencies /app/node_modules ./node_modules
 COPY package.json package-lock.json ./
 COPY drizzle.config.ts ./
 COPY drizzle ./drizzle
 COPY src/database ./src/database
 
 CMD ["npm", "run", "db:migrate"]
 
 
 # Stage 4: Production runtime
 FROM node:22-alpine AS production
 
 WORKDIR /app
 
 ENV NODE_ENV=production
 ENV PORT=3000
 
 COPY package.json package-lock.json ./
 
 RUN npm ci --omit=dev \
     && npm cache clean --force
 
 COPY --from=builder /app/dist ./dist
 
 USER node
 
 EXPOSE 3000
 
 CMD ["node", "dist/main.js"]