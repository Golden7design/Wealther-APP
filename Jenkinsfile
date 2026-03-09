pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        timestamps()
        timeout(time: 20, unit: 'MINUTES')
    }

    environment {
        SEQPULSE_BASE_URL = 'https://9160-102-129-82-163.ngrok-free.app'
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

                    sh """
                        npx -y seqpulse@0.5.2 ci trigger \
                          --env prod \
                          --branch "${branch}" \
                          --non-blocking true \
                          --timeout-ms 15000 \
                          --output deploymentId > .seqpulse_deployment_id
                    """

                    env.SEQPULSE_DEPLOYMENT_ID = readFile('.seqpulse_deployment_id').trim()

                    if (env.SEQPULSE_DEPLOYMENT_ID) {
                        echo "SeqPulse trigger accepted for deployment ${env.SEQPULSE_DEPLOYMENT_ID}"
                    } else {
                        env.SEQPULSE_DEPLOYMENT_ID = ''
                        echo 'SeqPulse trigger skipped: no deployment id returned.'
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                withCredentials([string(credentialsId: 'railway_token', variable: 'RAILWAY_TOKEN')]) {
                    sh '''
                        export RAILWAY_TOKEN="$RAILWAY_TOKEN"
                        npx -y @railway/cli up --environment production
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
