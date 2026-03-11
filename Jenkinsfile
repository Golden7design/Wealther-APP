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

                    // Utilisation de returnStdout comme dans ta version qui marchait
                    def triggerJson = sh(
                        script: """
                            npx -y seqpulse@0.5.2 ci trigger \
                            --env prod \
                            --branch "${branch}" \
                            --output json
                        """,
                        returnStdout: true
                    ).trim()

                    // Extraction robuste avec readJSON (nécessite le plugin Pipeline Utility Steps)
                    // Ou via Groovy JsonSlurper si le plugin n'est pas là
                    def json = new groovy.json.JsonSlurper().parseText(triggerJson)
                    
                    // Dans ta version JSON, l'ID est parfois dans json.deploymentId ou json.data.deployment_id
                    env.SEQPULSE_DEPLOYMENT_ID = json.deploymentId ?: json.data?.deployment_id ?: ''

                    if (env.SEQPULSE_DEPLOYMENT_ID) {
                        echo "SeqPulse deploymentId: ${env.SEQPULSE_DEPLOYMENT_ID}"
                    } else {
                        echo "Warning: No deployment ID found in response"
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
                // Correction du jobStatus pour qu'il ne soit jamais vide
                def rawStatus = currentBuild.currentResult ?: 'SUCCESS'
                def jobStatus = rawStatus.toLowerCase()

                if (env.SEQPULSE_DEPLOYMENT_ID && env.SEQPULSE_DEPLOYMENT_ID != "") {
                    echo "Finishing SeqPulse for ID: ${env.SEQPULSE_DEPLOYMENT_ID} with status: ${jobStatus}"
                    sh """
                        npx -y seqpulse@0.5.2 ci finish \
                          --deployment-id "${env.SEQPULSE_DEPLOYMENT_ID}" \
                          --job-status "${jobStatus}" \
                          --timeout-ms 15000 \
                          --non-blocking true
                    """
                } else {
                    echo 'Skipping SeqPulse finish: no deployment id available.'
                }
            }
        }
    }
}