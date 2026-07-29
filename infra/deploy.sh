#!/bin/bash
set -e

FRONTEND_IMAGE=$1
BACKEND_IMAGE=$2

echo "🚀 Application des manifestes Kubernetes..."
# 1. On applique les configurations (Base de données, Redis, Ingress...)
kubectl apply -f k8s/

echo "🔄 Mise à jour des images (Rolling Update)..."
# 2. On injecte les nouvelles images compilées par GitLab
kubectl set image deployment/frontend frontend=$FRONTEND_IMAGE
kubectl set image deployment/backend backend=$BACKEND_IMAGE

echo "⏳ Attente de la validation du déploiement..."
# 3. On attend que K8s confirme que les nouveaux pods sont sains
kubectl rollout status deployment/frontend
kubectl rollout status deployment/backend

echo "✅ Déploiement réussi sur K3s !"