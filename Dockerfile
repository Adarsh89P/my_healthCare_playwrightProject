# Pinned to the installed Playwright version so the image ships the exact
# browser builds the suite was verified against.
FROM mcr.microsoft.com/playwright:v1.61.0-noble

WORKDIR /app

# Dependencies first - this layer is cached until package-lock.json changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Overridable: `docker run <image> npm run test:smoke`
CMD ["npm", "test"]
