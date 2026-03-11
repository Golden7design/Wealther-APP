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
                sh 'npm install seqpulse@0.5.2'
            }
        }

        stage('SeqPulse Trigger') {
            steps {
                script {
                    def branch = (env.CHANGE_BRANCH ?: env.BRANCH_NAME ?: env.GIT_BRANCH ?: 'main')
                        .replaceFirst(/^origin\//, '')

                    sh """
                        ./node_modules/.bin/seqpulse ci trigger \
                        --base-url "$SEQPULSE_BASE_URL" \
                        --api-key "$SEQPULSE_API_KEY" \
                        --metrics-endpoint "$SEQPULSE_METRICS_ENDPOINT" \
                        --env prod \
                        --branch "${branch}" \
                        --output json > seqpulse_response.json
                    """

                    sh 'cat seqpulse_response.json'

                    def response = readJSON file: 'seqpulse_response.json'
                    env.SEQPULSE_DEPLOYMENT_ID = response.deploymentId ?: ''

                    echo "Deployment ID: ${env.SEQPULSE_DEPLOYMENT_ID}"
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
                        ./node_modules/.bin/seqpulse ci finish \
                          --base-url "$SEQPULSE_BASE_URL" \
                          --api-key "$SEQPULSE_API_KEY" \
                          --metrics-endpoint "$SEQPULSE_METRICS_ENDPOINT" \
                          --deployment-id "${env.SEQPULSE_DEPLOYMENT_ID}" \
                          --job-status "${jobStatus}"
                    """
                } else {
                    echo 'Skipping SeqPulse finish: no deployment id available.'
                }
            }
        }
    }
}y