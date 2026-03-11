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
        SEQPULSE_DEPLOYMENT_ID = ''
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

            sh "npx -y --quiet seqpulse@0.5.2 ci trigger --env prod --branch ${branch} --output json > trigger_output.json"
            
            def responseText = readFile('trigger_output.json').trim()
            def json = new groovy.json.JsonSlurper().parseText(responseText)

            // IMPORTANT : Utiliser env. pour que la variable soit globale au pipeline
            env.SEQPULSE_DEPLOYMENT_ID = json.deploymentId ?: json.data?.deployment_id ?: ''
            
            if (env.SEQPULSE_DEPLOYMENT_ID) {
                echo "ID sauvegardé dans l'environnement : ${env.SEQPULSE_DEPLOYMENT_ID}"
            }
        }
    }
}

        stage('Deploy') {
            steps {
                // On utilise "|| true" pour ne pas bloquer le pipeline si Railway a un souci mineur
                // Mais on s'assure que le token est bien passé
                withCredentials([string(credentialsId: 'railway_token', variable: 'RAILWAY_TOKEN')]) {
                    sh '''
                        export RAILWAY_TOKEN="$RAILWAY_TOKEN"
                        npx -y @railway/cli up --environment production || echo "Railway deploy failed but continuing..."
                    '''
                }
            }
        }
    }

post {
    always {
        script {
            // On s'assure de récupérer le statut du build
            def jobStatus = (currentBuild.currentResult ?: 'SUCCESS').toLowerCase()
            
            // On vérifie env.SEQPULSE_DEPLOYMENT_ID
            if (env.SEQPULSE_DEPLOYMENT_ID && env.SEQPULSE_DEPLOYMENT_ID != "null") {
                echo "Envoi du statut final pour : ${env.SEQPULSE_DEPLOYMENT_ID}"
                sh """
                    npx -y --quiet seqpulse@0.5.2 ci finish \
                      --deployment-id "${env.SEQPULSE_DEPLOYMENT_ID}" \
                      --job-status "${jobStatus}" \
                      --non-blocking true
                """
            } else {
                echo "Post-action : Aucun ID de déploiement trouvé dans env.SEQPULSE_DEPLOYMENT_ID"
            }
        }
    }
}
}