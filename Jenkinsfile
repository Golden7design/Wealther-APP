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
                        def branch = env.BRANCH_NAME ?: env.GIT_BRANCH ?: 'main'
                        sh """
                            npx seqpulse ci trigger --env prod --branch "$branch" > .seqpulse_trigger.json
                        """
                        sh """
                            node -e "const fs=require('fs');const o=JSON.parse(fs.readFileSync('.seqpulse_trigger.json','utf8'));fs.writeFileSync('.seqpulse_deployment_id', o.deploymentId || '')"
                        """
                    }
                }
            }

            stage('Deploy') {
                steps {
                    withCredentials([string(credentialsId: 'railway_token', variable: 'RAILWAY_TOKEN')]) {
                        sh '''
                            npm install @railway/cli
                            export RAILWAY_TOKEN=$RAILWAY_TOKEN
                            npx railway up --environment production
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