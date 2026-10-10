FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=America/Anchorage
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash coreutils findutils grep sed gawk less nano vim-tiny \
    curl ca-certificates jq tree file procps iproute2 iputils-ping \
    sudo man-db tzdata \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /work
