# Réseau Docker dédié à l'application (backend et PostgreSQL).
resource "docker_network" "app" {
  name   = "${var.app_name}-net"
  driver = "bridge"
}

# Volume persistant des données PostgreSQL.
resource "docker_volume" "postgres_data" {
  name = "${var.app_name}-postgres-data"
}

# Inventaire Ansible généré à partir des variables Terraform.
resource "local_file" "ansible_inventory" {
  filename        = var.inventory_path
  file_permission = "0644"
  content         = <<-EOT
    [serveur]
    ${var.server_host} ansible_user=${var.ssh_user} ansible_port=${var.ssh_port} ansible_ssh_private_key_file=${var.ssh_private_key_path}
  EOT
}
