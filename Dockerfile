# ---- Build Image
FROM node:13-buster
WORKDIR /usr/src/github.com/fbrosda/weather-maps/

COPY package.json .
COPY package-lock.json .
RUN npm install

RUN mkdir dist/
RUN cp -t dist/ package.json package-lock.json
RUN npm install --production --prefix=dist/

COPY .accessToken.txt .
COPY src/ ./src
COPY resources/ ./resources
RUN npm run build

COPY LICENSE ./dist/

# ---- Final Image
FROM node:13-buster

RUN apt update && apt install -y libeccodes-tools vim

WORKDIR /opt/weather-maps
COPY --from=0 /usr/src/github.com/fbrosda/weather-maps/dist/ .

CMD ["node", "src/index.js"]
