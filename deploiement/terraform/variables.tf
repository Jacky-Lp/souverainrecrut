variable "server_host" {
  description = "Adresse du serveur (nom ou IP Tailscale)"
  type        = string
}

variable "ssh_user" {
  description = "Utilisateur SSH du serveur"
  type        = string
}

variable "ssh_port" {
  description = "Port SSH du serveur"
  type        = number
}

variable "ssh_private_key_path" {
  description = "Chemin de la clé privée SSH utilisée par Terraform et Ansible"
  type        = string
}

variable "app_name" {
  description = "Nom du projet, utilisé pour nommer le réseau et le volume"
  type        = string
}

variable "inventory_path" {
  description = "Fichier d'inventaire Ansible généré par Terraform"
  type        = string
  default     = "../ansible/inventory.ini"
}
