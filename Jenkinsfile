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

                    // 1. On lance la commande en mode super silencieux
                    // On redirige vers un fichier pour être SÛR de ne pas mélanger les logs NPM et le JSON
                    sh "npx -y --quiet seqpulse@0.5.2 ci trigger --env prod --branch ${branch} --output json > trigger_output.json"
                    
                    // 2. On lit le fichier directement (beaucoup plus fiable que returnStdout)
                    def responseText = readFile('trigger_output.json').trim()
                    echo "Réponse brute reçue : ${responseText}"

                    try {
                        def json = new groovy.json.JsonSlurper().parseText(responseText)
                        env.SEQPULSE_DEPLOYMENT_ID = json.deploymentId ?: json.data?.deployment_id ?: ''
                        
                        if (env.SEQPULSE_DEPLOYMENT_ID) {
                            echo "ID trouvé : ${env.SEQPULSE_DEPLOYMENT_ID}"
                        }
                    } catch (Exception e) {
                        echo "Erreur lors du parsing JSON : ${e.message}"
                        // Plan B : Essayer d'extraire l'ID avec un simple grep si le JSON est pollué
                        env.SEQPULSE_DEPLOYMENT_ID = sh(
                            script: "grep -o '\"deploymentId\":\"[^\"]*\"' trigger_output.json | cut -d'\"' -f4",
                            returnStdout: true
                        ).trim()
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