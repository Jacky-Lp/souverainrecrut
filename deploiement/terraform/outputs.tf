output "network_name" {
  description = "Réseau Docker créé sur le serveur"
  value       = docker_network.app.name
}

output "postgres_volume_name" {
  description = "Volume Docker des données PostgreSQL"
  value       = docker_volume.postgres_data.name
}

output "inventory_file" {
  description = "Inventaire Ansible généré"
  value       = local_file.ansible_inventory.filename
}
