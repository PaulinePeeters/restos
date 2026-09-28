#!/bin/bash

# Configuration
VPS_USER="debian"
VPS_IP="51.210.8.227"
VPS_DEST="/home/debian/restos"

# Couleurs pour le terminal
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Préparation du déploiement vers ${VPS_USER}@${VPS_IP}...${NC}"

if [ ! -f ".env" ]; then
    echo -e "${RED}Erreur: fichier .env introuvable à la racine du projet.${NC}"
    echo -e "Créez .env avec au minimum JWT_SECRET, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS."
    exit 1
fi

# Création du dossier cible sur le serveur (si ce n'est pas déjà fait)
echo -e "\n${YELLOW} Création du répertoire cible...${NC}"
ssh ${VPS_USER}@${VPS_IP} "mkdir -p ${VPS_DEST}"

if [ $? -ne 0 ]; then
    echo -e "${RED}Erreur: Impossible de se connecter en SSH au serveur pour créer le dossier.${NC}"
    exit 1
fi

# Copie des fichiers via un pipe tar
echo -e "\n${YELLOW}Transfert des fichiers du projet...${NC}"
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='build' \
    --exclude='.DS_Store' \
    -czf - . | ssh ${VPS_USER}@${VPS_IP} "cd ${VPS_DEST} && tar -xzf -"

if [ $? -ne 0 ]; then
    echo -e "${RED}Erreur lors du transfert des fichiers.${NC}"
    exit 1
fi


echo -e "\n${GREEN}Fichiers transférés avec succès !${NC}"

# Lancement des containers sur le serveur
echo -e "\n${YELLOW} Lancement de Docker Compose sur le VPS...${NC}"
ssh ${VPS_USER}@${VPS_IP} "cd ${VPS_DEST} && docker compose --env-file .env up -d --build"

if [ $? -ne 0 ]; then
    echo -e "${RED}Erreur lors de l'exécution de docker compose sur le serveur.${NC}"
    echo -e "Vérifiez que Docker et Docker Compose sont bien installés sur votre VPS."
    exit 1
fi

echo -e "\n${GREEN} Déploiement terminé avec succès !${NC}"
echo -e "Vous pouvez maintenant accéder à votre application : http://${VPS_IP}"
