FROM rust:1-slim-buster
RUN apt-get update &&  \
    apt-get install -y git && \
    apt-get install -y curl
RUN curl -fsSL https://deb.nodesource.com/setup_19.x | bash - && \
    apt-get install -y nodejs
RUN npm install npm@latest -g

