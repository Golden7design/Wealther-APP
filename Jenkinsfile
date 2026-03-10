pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        timestamps()
        timeout(time: 20, unit: 'MINUTES')
    }

    environment {
        SEQPULSE_BASE_URL = 'https://9de5-102-129-82-18.ngrok-free.app'
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

                    env.SEQPULSE_DEPLOYMENT_ID = sh(
                        script: """
                        npx -y seqpulse@0.5.2 ci trigger \
                        --base-url "$SEQPULSE_BASE_URL" \
                        --api-key "$SEQPULSE_API_KEY" \
                        --metrics-endpoint "$SEQPULSE_METRICS_ENDPOINT" \
                        --env prod \
                        --branch "${branch}" \
                        --output deploymentId 2>/dev/null
                        """,
                        returnStdout: true
                    ).trim()

                    if (env.SEQPULSE_DEPLOYMENT_ID) {
                        echo "SeqPulse deployment: ${env.SEQPULSE_DEPLOYMENT_ID}"
                    } else {
                        echo "SeqPulse trigger returned no deployment id (maybe already running)."
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                withCredentials([string(credentialsId: 'railway_token', variable: 'RAILWAY_TOKEN')]) {
                    sh '''
                        export RAILWAY_TOKEN="$RAILWAY_TOKEN"
                        npx -y @railway/cli up --environment production || true
                    '''
                }
            }
        }
    }

    post {
        always {
            script {
                def jobStatus = (currentBuild.currentResult ?: 'SUCCESS').toLowerCase()

                if (env.SEQPULSE_DEPLOYMENT_ID?.trim()) {
                    sh """
                        npx -y seqpulse@0.5.2 ci finish \
                          --base-url "$SEQPULSE_BASE_URL" \
                          --api-key "$SEQPULSE_API_KEY" \
                          --metrics-endpoint "$SEQPULSE_METRICS_ENDPOINT" \
                          --deployment-id "${env.SEQPULSE_DEPLOYMENT_ID}" \
                          --job-status "${jobStatus}" \
                    """
                } else {
                    echo 'Skipping SeqPulse finish: no deployment id available.'
                }
            }
        }
    }
}