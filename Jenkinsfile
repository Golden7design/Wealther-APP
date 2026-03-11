import groovy.json.JsonSlurper

// Defined outside the pipeline to ensure global persistence
def globalDeploymentId = ""

pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        timestamps()
        timeout(time: 20, unit: 'MINUTES')
    }

    environment {
        SEQPULSE_BASE_URL = credential('seqpulse_base_url')
        SEQPULSE_API_KEY = credential('seqpulse_api_key')
        SEQPULSE_METRICS_ENDPOINT = credential('seqpulse_metrics_endpoint')
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

                    sh "npx -y --quiet seqpulse@0.5.2 ci trigger --env prod --branch ${branch} --output json > trigger_output.json"
                    
                    def responseText = readFile('trigger_output.json').trim()
                    echo "SeqPulse response received: ${responseText}"
                    
                    def json = new JsonSlurper().parseText(responseText)

                    globalDeploymentId = json.deploymentId ?: json.data?.deployment_id ?: ''
                    env.SEQPULSE_DEPLOYMENT_ID = globalDeploymentId
                    
                    if (globalDeploymentId) {
                        echo "Deployment ID captured: ${globalDeploymentId}"
                    } else {
                        error "Unable to extract Deployment ID from the JSON response."
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                withCredentials([string(credentialsId: 'railway_token', variable: 'RAILWAY_TOKEN')]) {
                    sh '''
                        export RAILWAY_TOKEN="$RAILWAY_TOKEN"
                        npx -y @railway/cli up --environment production || echo "Railway deploy failed but continuing to SeqPulse finish..."
                    '''
                }
            }
        }
    }

    post {
        always {
            script {
                def jobStatus = (currentBuild.currentResult ?: 'SUCCESS').toLowerCase()
                def finalId = globalDeploymentId ?: env.SEQPULSE_DEPLOYMENT_ID

                if (finalId && finalId != "" && finalId != "null") {
                    echo "SeqPulse notification: Job finished for ID ${finalId} with status ${jobStatus}"
                    sh """
                        npx -y --quiet seqpulse@0.5.2 ci finish \
                          --deployment-id "${finalId}" \
                          --job-status "${jobStatus}" \
                          --non-blocking true
                    """
                } else {
                    echo "Post-action: No deployment ID found. SeqPulse notification canceled."
                }
            }
        }
    }
}