pipeline {
    agent any

    environment {
        SEQPULSE_BASE_URL = credentials('seqpulse_base_url')
        SEQPULSE_API_KEY = credentials('seqpulse_api_key')
        SEQPULSE_METRICS_ENDPOINT = credentials('seqpulse_metrics_endpoint')
    }

    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
                sh 'npm i --no-save seqpulse@0.4.0'
            }
        }

        stage('SeqPulse Trigger') {
            steps {
                script {
                    // Trigger SeqPulse et récupérer deploymentId
                    sh 'npx seqpulse ci trigger --env prod --branch "$BRANCH_NAME" > .seqpulse_trigger.json'
                    sh '''
                        node -e "
                            const fs = require('fs');
                            const o = JSON.parse(fs.readFileSync('.seqpulse_trigger.json','utf8'));
                            fs.writeFileSync('.seqpulse_deployment_id', o.deploymentId || '');
                        "
                    '''
                }
            }
        }

        stage('Deploy') {
            steps {
                // Déploiement Railway avec token stocké dans Jenkins Credentials
                withCredentials([string(credentialsId: 'railway_token', variable: 'RAILWAY_TOKEN')]) {
                    sh '''
                        npm install -g railway
                        railway login --token "$RAILWAY_TOKEN"
                        railway up --environment production
                    '''
                }
            }
        }
    }

    post {
        always {
            sh '''
                SEQPULSE_DEPLOYMENT_ID=$(cat .seqpulse_deployment_id 2>/dev/null || true)
                npx seqpulse ci finish --deployment-id "$SEQPULSE_DEPLOYMENT_ID" --job-status "$BUILD_RESULT"
            '''
        }
    }
}