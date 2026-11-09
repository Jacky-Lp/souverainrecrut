FROM jenkins/jenkins:lts-jdk21

# CLI Docker uniquement (le démon est celui de l'hôte, via le socket monté).
COPY --from=docker:27-cli /usr/local/bin/docker /usr/local/bin/docker

# Plugins installés à la construction de l'image.
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt
