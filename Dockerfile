FROM hub.psi.unc.edu.ar/base/nodejs:6.2.2

RUN apt-get update && apt-get install -y git python
RUN npm install -g bower
RUN mkdir -p /opt/project
WORKDIR /opt/project

COPY package.json /opt/project/
RUN NODE_ENV=production npm install
COPY bower.json /opt/project/
RUN bower install --allow-root
COPY index.js /opt/project/
COPY app /opt/project/app
COPY Dockerfile /opt/project/
COPY entrypoint.sh /opt/project/
ENTRYPOINT ["/opt/project/entrypoint.sh"]
EXPOSE 80
CMD ["npm", "start"]
