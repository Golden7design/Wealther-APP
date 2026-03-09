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
                    def branch = env.CHANGE_BRANCH ?: env.BRANCH_NAME ?: env.GIT_BRANCH ?: 'main'
                    env.SEQPULSE_DEPLOYMENT_ID = sh(
                        script: """
                            npx -y seqpulse@0.5.1 ci trigger \
                              --env prod \
                              --branch "${branch}" \
                              --non-blocking true \
                              --output deploymentId
                        """,
                        returnStdout: true
                    ).trim()
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
                sh """
                    npx -y seqpulse@0.5.1 ci finish \
                      --deployment-id "${env.SEQPULSE_DEPLOYMENT_ID ?: ''}" \
                      --job-status "${jobStatus}" \
                      --non-blocking true
                """
            }
        }
    }
}
