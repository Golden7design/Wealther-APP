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

            // 1. Run the command and capture the JSON output directly into a variable
            def response = sh(
                script: "npx -y seqpulse@0.5.2 ci trigger --env prod --branch ${branch} --non-blocking true --timeout-ms 15000 --output json",
                returnStdout: true
            ).trim()

            // 2. Parse the JSON string using Groovy's JsonSlurper
            def json = new groovy.json.JsonSlurper().parseText(response)

            // 3. Extract the ID and assign to the environment
            if (json && json.deploymentId) {
                env.SEQPULSE_DEPLOYMENT_ID = json.deploymentId
                echo "Successfully captured Deployment ID: ${env.SEQPULSE_DEPLOYMENT_ID}"
            } else {
                error "Failed to find deploymentId in SeqPulse response: ${response}"
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