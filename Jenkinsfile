pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        timestamps()
        timeout(time: 20, unit: 'MINUTES')
    }

    environment {
        SEQPULSE_BASE_URL = credentials('seqpulse_base_url')
        SEQPULSE_API_KEY = credentials('seqpulse_api_key')
        SEQPULSE_METRICS_ENDPOINT = credentials('seqpulse_metrics_endpoint')
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
                    def triggerRaw = sh(
                        script: """
                            npx -y seqpulse@0.5.2 ci trigger \
                              --env prod \
                              --branch "${branch}" \
                              --non-blocking true \
                              --timeout-ms 15000 \
                              --output json
                        """,
                        returnStdout: true
                    ).trim()

                    def triggerResult = new groovy.json.JsonSlurperClassic().parseText(triggerRaw ?: "{}")
                    if (triggerResult?.ok && triggerResult?.deploymentId) {
                        env.SEQPULSE_DEPLOYMENT_ID = String.valueOf(triggerResult.deploymentId)
                        echo "SeqPulse trigger accepted for deployment ${env.SEQPULSE_DEPLOYMENT_ID}"
                    } else {
                        env.SEQPULSE_DEPLOYMENT_ID = ''
                        echo "SeqPulse trigger skipped: ${triggerResult?.error ?: 'unknown error'}"
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
