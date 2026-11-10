terraform {
  required_version = ">= 1.6.0"

  required_providers {
    # Pilote le Docker du serveur à distance, en SSH.
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
    # Écrit l'inventaire Ansible sur le poste local.
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}

# Terraform se connecte au démon Docker du serveur via SSH.
provider "docker" {
  host     = "ssh://${var.ssh_user}@${var.server_host}:${var.ssh_port}"
  ssh_opts = ["-o", "StrictHostKeyChecking=accept-new", "-i", pathexpand(var.ssh_private_key_path)]
}
