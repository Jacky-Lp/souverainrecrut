FROM jenkins/jenkins:lts-jdk21

# CLI Docker uniquement (le démon est celui de l'hôte, via le socket monté).
COPY --from=docker:27-cli /usr/local/bin/docker /usr/local/bin/docker

# Plugin buildx : construit des images pour une autre architecture (amd64 depuis un Mac ARM).
COPY --from=docker/buildx-bin:0.19.3 /buildx /usr/libexec/docker/cli-plugins/docker-buildx

# Plugins installés à la construction de l'image.
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt
