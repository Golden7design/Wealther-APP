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
                        set -eu
                        [ -n "$SEQPULSE_BASE_URL" ]
                        [ -n "$SEQPULSE_API_KEY" ]
                        [ -n "$SEQPULSE_METRICS_ENDPOINT" ]

                        npx -y seqpulse@0.5.2 ci trigger \
                          --base-url "$SEQPULSE_BASE_URL" \
                          --api-key "$SEQPULSE_API_KEY" \
                          --metrics-endpoint "$SEQPULSE_METRICS_ENDPOINT" \
                          --env prod \
                          --branch "${branch}" \
                          --non-blocking true \
                          --timeout-ms 15000 \
                          --output json > .seqpulse_trigger.json

                        node -e "const fs=require('fs'); const raw=fs.readFileSync('.seqpulse_trigger.json','utf8').trim(); const data=raw?JSON.parse(raw):{}; process.stdout.write(data.deploymentId || '');" > .seqpulse_deployment_id
                    """

                    env.SEQPULSE_DEPLOYMENT_ID = readFile('.seqpulse_deployment_id').trim()

                    if (env.SEQPULSE_DEPLOYMENT_ID) {
                        echo "SeqPulse trigger accepted for deployment ${env.SEQPULSE_DEPLOYMENT_ID}"
                    } else {
                        echo "SeqPulse trigger raw: ${readFile('.seqpulse_trigger.json').trim()}"
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
                          --base-url "$SEQPULSE_BASE_URL" \
                          --api-key "$SEQPULSE_API_KEY" \
                          --metrics-endpoint "$SEQPULSE_METRICS_ENDPOINT" \
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
