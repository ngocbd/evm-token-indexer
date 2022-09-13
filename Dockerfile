FROM node:16-alpine

#install redis

#Change directory
WORKDIR /app

# cache node_modules
COPY package.json .

# run command to install packages
RUN npm install
# copy my source code
COPY . .

# overwrite to production mode to use remote ressource
RUN echo "PRODUCTION='1'" >> .env
ENV NODE_OPTIONS --max-old-space-size=8000
# run worker
ENTRYPOINT ["npm", "run", "worker"]
# default worker parametter
CMD ["list-workers"]