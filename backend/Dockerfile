FROM node:20-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY serveur.js .
COPY sensor_metadata.csv .
CMD ["node", "serveur.js"]