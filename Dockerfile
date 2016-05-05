FROM hub.psi.unc.edu.ar/base/nodejs:5.11.0

RUN apt-get update && apt-get install -y git
RUN npm install -g bower
RUN mkdir -p /opt/project
WORKDIR /opt/project

COPY Dockerfile /opt/project/
COPY package.json /opt/project/
RUN npm install
COPY bower.json /opt/project/
RUN bower install --allow-root
COPY index.js /opt/project
COPY app /opt/project/app
CMD ["npm", "start"]
