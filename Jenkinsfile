import groovy.json.JsonSlurper

// Définition en dehors du pipeline pour assurer la persistance globale
def globalDeploymentId = ""

pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        timestamps()
        timeout(time: 20, unit: 'MINUTES')
    }

    environment {
        SEQPULSE_BASE_URL = 'https://2d2b-102-129-82-40.ngrok-free.app'
        SEQPULSE_API_KEY = 'SP_33747dfae32345a3bd16adffecbefe6b'
        SEQPULSE_METRICS_ENDPOINT = 'https://wealther-app-production.up.railway.app/seqpulse_metrics'
    }

    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }

        stage('SeqPulse Trigger') {
            steps {
                script {
                    def branch = (env.CHANGE_BRANCH ?: env.BRANCH_NAME ?: env.GIT_BRANCH ?: 'main')
                        .replaceFirst(/^origin\//, '')

                    // Exécution et redirection vers un fichier pour isoler le JSON
                    sh "npx -y --quiet seqpulse@0.5.2 ci trigger --env prod --branch ${branch} --output json > trigger_output.json"
                    
                    def responseText = readFile('trigger_output.json').trim()
                    echo "Réponse SeqPulse reçue : ${responseText}"
                    
                    def json = new JsonSlurper().parseText(responseText)

                    // On assigne l'ID à la variable globale ET à l'env
                    globalDeploymentId = json.deploymentId ?: json.data?.deployment_id ?: ''
                    env.SEQPULSE_DEPLOYMENT_ID = globalDeploymentId
                    
                    if (globalDeploymentId) {
                        echo "ID de déploiement capturé : ${globalDeploymentId}"
                    } else {
                        error "Impossible d'extraire le Deployment ID de la réponse JSON."
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                withCredentials([string(credentialsId: 'railway_token', variable: 'RAILWAY_TOKEN')]) {
                    sh '''
                        export RAILWAY_TOKEN="$RAILWAY_TOKEN"
                        npx -y @railway/cli up --environment production || echo "Railway deploy failed but continuing to SeqPulse finish..."
                    '''
                }
            }
        }
    }

    post {
        always {
            script {
                // Récupération du statut du build (success, failure, etc.)
                def jobStatus = (currentBuild.currentResult ?: 'SUCCESS').toLowerCase()
                
                // Utilisation de la variable globale qui est la plus fiable
                def finalId = globalDeploymentId ?: env.SEQPULSE_DEPLOYMENT_ID

                if (finalId && finalId != "" && finalId != "null") {
                    echo "Notification SeqPulse : Fin de job pour l'ID ${finalId} avec le statut ${jobStatus}"
                    sh """
                        npx -y --quiet seqpulse@0.5.2 ci finish \
                          --deployment-id "${finalId}" \
                          --job-status "${jobStatus}" \
                          --non-blocking true
                    """
                } else {
                    echo "⚠️ Post-action : Aucun ID de déploiement trouvé. Notification SeqPulse annulée."
                }
            }
        }
    }
}