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

            // 1. Run the trigger and save to file
            sh """
                npx -y seqpulse@0.5.2 ci trigger \
                --env prod \
                --branch "${branch}" \
                --non-blocking true \
                --timeout-ms 15000 \
                --output json > seqpulse_response.json
            """

            // 2. Extract ID and assign directly to the env object
            // We use returnStdout: true to bring the value into the Groovy context
            def extractedId = sh(
                script: "grep -o '\"deploymentId\":\"[^\"]*\"' seqpulse_response.json | cut -d'\"' -f4",
                returnStdout: true
            ).trim()

            if (extractedId && extractedId != "null") {
                env.SEQPULSE_DEPLOYMENT_ID = extractedId
                echo "Successfully captured Deployment ID: ${env.SEQPULSE_DEPLOYMENT_ID}"
            } else {
                error "Failed to capture SeqPulse Deployment ID from response"
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